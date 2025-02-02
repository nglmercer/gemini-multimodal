import { EventEmitter } from "eventemitter3";
import { blobToJSON, base64ToArrayBuffer, functions1 } from "./utils";

const {
    ClientContentMessage,
    isInterrupted,
    isModelTurn,
    isServerContentMessage,
    isSetupCompleteMessage,
    isToolCallCancellationMessage,
    isToolCallMessage,
    isTurnComplete,
} = functions1;

function ensureArray(input) {
    return Array.isArray(input) ? input : [input];
}

class MultimodalLiveClient extends EventEmitter {
    constructor({ url, apiKey }) {
        super();
        this.url = url || `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;
        this.url += `?key=${apiKey}`;
        this.ws = null;
        this.isConnecting = false;
        this.messageQueue = [];
        this.connectionRetries = 0;
        this.maxRetries = 3;
        this.connected = false;
        this.reconnectionTimeout = null;
        this.contextQueue = [];

        this.send = this.send.bind(this);
        this.connect = this.connect.bind(this);
        this._sendDirect = this._sendDirect.bind(this);
        this.handleConnectionError = this.handleConnectionError.bind(this);
        this.addToContext = this.addToContext.bind(this);
        this.sendWithContext = this.sendWithContext.bind(this);
    }

    log(type, message) {
        const log = {
            date: new Date(),
            type,
            message,
        };
        this.emit("log", log);
    }

    async connect(config) {
        if (this.isConnecting) {
            return new Promise((resolve) => {
                this.once("connected", () => resolve(true));
            });
        }

        this.disconnect();
        this.isConnecting = true;

        try {
            const ws = new WebSocket(this.url);

            ws.addEventListener("message", async (evt) => {
                if (evt.data instanceof Blob) {
                    await this.receive(evt.data);
                } else {
                    console.log("Non-blob message received:", evt);
                }
            });

            return new Promise((resolve, reject) => {
                const onError = (ev) => {
                    this.handleConnectionError(ev, ws, reject);
                };

                ws.addEventListener("error", onError);
                ws.addEventListener("open", (ev) => {
                    if (!config) {
                        this.isConnecting = false;
                        reject(new Error("Invalid config sent to `connect(config)`"));
                        return;
                    }

                    this.log(`client.${ev.type}`, "Connected to socket");
                    this.emit("open");
                    this.connected = true;
                    this.ws = ws;
                    this.isConnecting = false;
                    this.emit("connected");

                    const setupMessage = { setup: config };
                    this._sendDirect(setupMessage);
                    this.log("client.send", "Setup message sent");

                    this.processMessageQueue();

                    ws.removeEventListener("error", onError);
                    ws.addEventListener("close", this.handleClose.bind(this));
                    resolve(true);
                });
            });
        } catch (error) {
            this.isConnecting = false;
            throw error;
        }
    }

    handleConnectionError(ev, ws, reject) {
        this.disconnect(ws);
        const message = `Could not connect to "${this.url}"`;
        this.log(`server.${ev.type}`, message);
        this.isConnecting = false;
        this.connected = false;
        reject(new Error(message));
    }

    handleClose(ev) {
        this.connected = false;
        let reason = ev.reason || "";
        if (reason.toLowerCase().includes("error")) {
            const prelude = "ERROR]";
            const preludeIndex = reason.indexOf(prelude);
            if (preludeIndex > 0) {
                reason = reason.slice(preludeIndex + prelude.length + 1, Infinity);
            }
        }
        this.log(`server.${ev.type}`, `Disconnected ${reason ? `with reason: ${reason}` : ""}`);
        this.emit("close", ev);

        if (this.connectionRetries < this.maxRetries) {
            this.connectionRetries++;
            setTimeout(() => {
                this.connect(this.config).catch(console.error);
            }, 1000 * this.connectionRetries);
        }
    }

    disconnect(ws) {
        if ((!ws || this.ws === ws) && this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected = false;
            this.log("client.close", "Disconnected");
            if (this.reconnectionTimeout) {
                clearTimeout(this.reconnectionTimeout);
                this.reconnectionTimeout = null;
            }
            return true;
        }
        return false;
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const queuedMessage = this.messageQueue.shift();
            this._sendDirect(queuedMessage);
        }
    }

    async receive(blob) {
        const response = await blobToJSON(blob);

        if (isToolCallMessage(response)) {
            this.log("server.toolCall", response);
            this.emit("toolcall", response.toolCall);
            return;
        }
        if (isToolCallCancellationMessage(response)) {
            this.log("receive.toolCallCancellation", response);
            this.emit("toolcallcancellation", response.toolCallCancellation);
            return;
        }
        if (isSetupCompleteMessage(response)) {
            this.log("server.send", "Setup complete");
            this.emit("setupcomplete");
            return;
        }

        if (isServerContentMessage(response)) {
            const { serverContent } = response;
            if (isInterrupted(serverContent)) {
                this.log("receive.serverContent", "Interrupted");
                this.emit("interrupted");
                return;
            }
            if (isTurnComplete(serverContent)) {
                this.log("server.send", "Turn complete");
                this.emit("turncomplete");
            }

            if (isModelTurn(serverContent)) {
                if (!serverContent.modelTurn || !serverContent.modelTurn.parts) {
                    return serverContent;
                }

                const parts = serverContent.modelTurn.parts;
                const audioParts = parts.filter(
                    (p) => p.inlineData && p.inlineData.mimeType.startsWith("audio/pcm")
                );
                const base64s = audioParts.map((p) => p.inlineData?.data);
                const otherParts = parts.filter((p) => !audioParts.includes(p));

                base64s.forEach((b64) => {
                    if (b64) {
                        const data = base64ToArrayBuffer(b64);
                        this.emit("audio", data);
                        this.log(`server.audio`, `Buffer (${data.byteLength})`);
                    }
                });

                if (otherParts.length) {
                    const content = { modelTurn: { parts: otherParts } };
                    this.emit("content", content);
                    this.log(`server.content`, response);
                }
            }
        } else {
            console.log("Received unmatched message:", response);
        }
    }

    sendRealtimeInput(chunks) {
        if (!this.connected || this.isConnecting) {
            const data = { realtimeInput: { mediaChunks: chunks } };
            this.enqueueMessage(data);

            if (!this.reconnectionTimeout) {
                this.reconnectionTimeout = setTimeout(() => {
                    this.connect(this.config)
                        .catch(console.error)
                        .finally(() => {
                            this.reconnectionTimeout = null;
                        });
                }, 1000);
            }
            return;
        }

        const message = chunks.some((c) => c.mimeType.includes("audio")) && chunks.some((c) => c.mimeType.includes("image"))
            ? "audio + video"
            : chunks.some((c) => c.mimeType.includes("audio"))
            ? "audio"
            : chunks.some((c) => c.mimeType.includes("image"))
            ? "video"
            : "unknown";

        const data = { realtimeInput: { mediaChunks: chunks } };
        this._sendDirect(data);
        this.log(`client.realtimeInput`, message);
    }

    sendToolResponse(toolResponse) {
        const message = { toolResponse };
        this._sendDirect(message);
        this.log(`client.toolResponse`, message);
    }

    addToContext(parts) {
        parts = ensureArray(parts);
        const content = { role: "user", parts };
        this.contextQueue.push(content);
    }

    sendWithContext(parts, turnComplete = true) {
        parts = ensureArray(parts);
        const content = { role: "user", parts };
        const turnsWithContext = [...this.contextQueue, content];

        const clientContentRequest = {
            clientContent: {
                turns: turnsWithContext,
                turnComplete,
            },
        };

        this._sendDirect(clientContentRequest);
        this.log(`client.send`, clientContentRequest);
    }

    send(parts, turnComplete = true) {
        parts = ensureArray(parts);
        const content = { role: "user", parts };

        const clientContentRequest = {
            clientContent: {
                turns: [content],
                turnComplete,
            },
        };

        this._sendDirect(clientContentRequest);
        this.log(`client.send`, clientContentRequest);
    }

    _sendDirect(request) {
        if (!this.connected) {
            if (this.isConnecting) {
                this.enqueueMessage(request);
                return;
            }
            if (this.connectionRetries < this.maxRetries) {
                this.enqueueMessage(request);
                this.connect(this.config).catch(console.error);
                return;
            }
            throw new Error("WebSocket is not connected and max retries exceeded");
        }

        if (!this.ws) {
            throw new Error("WebSocket instance is null");
        }

        const str = JSON.stringify(request);
        this.ws.send(str);
    }

    enqueueMessage(message) {
        this.messageQueue.push(message);
    }
}

class MultimodalLiveAPI {
    constructor({ url, apiKey }) {
        this.url = url;
        this.apiKey = apiKey;
        this.client = new MultimodalLiveClient({ url, apiKey });
        this.audioStreamer = null;
        this.connected = false;
        this.config = { model: "models/gemini-2.0-flash-exp" };
        this.volume = 0;
    }

    async initializeAudioStreamer() {
        if (!this.audioStreamer) {
            try {
                const audioCtx = await audioContext({ id: "audio-out" });
                this.audioStreamer = new AudioStreamer(audioCtx);

                await this.audioStreamer.addWorklet("vumeter-out", VolMeterWorket, (ev) => {
                    this.volume = ev.data.volume;
                    console.log("Current Volume:", this.volume);
                });
            } catch (error) {
                console.error("Failed to initialize audio streamer:", error);
                throw error;
            }
        }
    }

    attachClientListeners() {
        const onClose = () => {
            this.connected = false;
            console.log("Connection closed.");
        };

        const stopAudioStreamer = () => {
            if (this.audioStreamer) this.audioStreamer.stop();
        };

        const onAudio = (data) => {
            if (this.audioStreamer) {
                this.audioStreamer.addPCM16(new Uint8Array(data));
            }
        };

        this.client
            .on("close", onClose)
            .on("interrupted", stopAudioStreamer)
            .on("audio", onAudio);
    }

    detachClientListeners() {
        this.client.off("close").off("interrupted").off("audio");
    }

    async connect(config) {
        if (!config) {
            throw new Error("Configuration has not been set");
        }

        this.client.disconnect();
        await this.client.connect(config);
        this.connected = true;
        console.log("Connected successfully!", config);
    }

    async disconnect() {
        this.client.disconnect();
        this.connected = false;
        console.log("Disconnected successfully.");
    }
}

export { MultimodalLiveClient, MultimodalLiveAPI };