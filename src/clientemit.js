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
    isTurnComplete
} = functions1;

class MultimodalLiveClient extends EventEmitter {
    constructor({ url, apiKey }) {
        super();
        this.url = url || 
            `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;
        this.url += `?key=${apiKey}`;
        this.ws = null;
        this.config = null;
        this.isConnecting = false;
        this.messageQueue = [];
        this.connectionRetries = 0;
        this.maxRetries = 3;
        this.connected = false;

        // Bind methods
        this.send = this.send.bind(this);
        this.connect = this.connect.bind(this);
        this._sendDirect = this._sendDirect.bind(this);
        this.handleConnectionError = this.handleConnectionError.bind(this);
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

        this.isConnecting = true;
        if (config) this.config = config;
        console.log("config", this.config);
        try {
            const ws = new WebSocket(this.url);

            ws.addEventListener("message", async (evt) => {
                if (evt.data instanceof Blob) {
                    await this.receive(evt.data);
                } else {
                    console.log("non blob message", evt);
                }
            });

            return new Promise((resolve, reject) => {
                const onError = (ev) => {
                    this.handleConnectionError(ev, ws, reject);
                };

                ws.addEventListener("error", onError);
                ws.addEventListener("open", (ev) => {
                    if (!this.config) {
                        this.isConnecting = false;
                        reject(new Error("Invalid config sent to `connect(config)`"));
                        return;
                    }

                    this.log(`client.${ev.type}`, `connected to socket`);
                    this.emit("open");
                    this.connected = true;
                    this.ws = ws;
                    this.isConnecting = false;
                    this.emit("connected");

                    // Send setup message
                    const setupMessage = {
                        setup: this.config,
                    };
                    this._sendDirect(setupMessage);
                    this.log("client.send", "setup");

                    // Process any queued messages
                    while (this.messageQueue.length > 0) {
                        const queuedMessage = this.messageQueue.shift();
                        this._sendDirect(queuedMessage);
                    }

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
    setConfig(config) {
        this.config = config;
    }
    handleClose(ev) {
        console.log(ev);
        this.connected = false;
        let reason = ev.reason || "";
        if (reason.toLowerCase().includes("error")) {
            const prelude = "ERROR]";
            const preludeIndex = reason.indexOf(prelude);
            if (preludeIndex > 0) {
                reason = reason.slice(preludeIndex + prelude.length + 1, Infinity);
            }
        }
        this.log(
            `server.${ev.type}`,
            `disconnected ${reason ? `with reason: ${reason}` : ``}`
        );
        this.emit("close", ev);

        // Attempt reconnection if appropriate
        if (this.connectionRetries < this.maxRetries) {
            this.connectionRetries++;
            setTimeout(() => {
                this.connect(this.config).catch(console.error);
            }, 1000 * this.connectionRetries); // Exponential backoff
        }
    }

    disconnect(ws) {
        if ((!ws || this.ws === ws) && this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected = false;
            this.log("client.close", `Disconnected`);
            return true;
        }
        return false;
    }

    async receive(blob) {
        const response = await blobToJSON(blob);
        console.log("response", response);
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
            this.log("server.send", "setupComplete");
            this.emit("setupcomplete");
            return;
        }

        if (isServerContentMessage(response)) {
            const { serverContent } = response;
            if (isInterrupted(serverContent)) {
                this.log("receive.serverContent", "interrupted");
                this.emit("interrupted");
                return;
            }
            if (isTurnComplete(serverContent)) {
                this.log("server.send", "turnComplete");
                this.emit("turncomplete");
            }

            if (isModelTurn(serverContent)) {
                if (!serverContent.modelTurn || !serverContent.modelTurn.parts) {
                    console.warn("modelTurn o parts no están definidos");
                    return serverContent;
                  }
                let parts = serverContent.modelTurn.parts;
                const audioParts = parts.filter(
                    (p) => p.inlineData && p.inlineData.mimeType.startsWith("audio/pcm")
                );
                const base64s = audioParts.map((p) => p.inlineData?.data);
                const otherParts = parts.filter(p => !audioParts.includes(p));

                base64s.forEach((b64) => {
                    if (b64) {
                        const data = base64ToArrayBuffer(b64);
                        this.emit("audio", data);
                        this.log(`server.audio`, `buffer (${data.byteLength})`);
                    }
                });

                if (otherParts.length) {
                    const content = { modelTurn: { parts: otherParts } };
                    this.emit("content", content);
                    this.log(`server.content`, response);
                }
            }
        } else {
            console.log("received unmatched message", response);
        }
    }

    sendRealtimeInput(chunks) {
        if (!this.connected) {
            // Queue the message if not connected
            const data = {
                realtimeInput: {
                    mediaChunks: chunks,
                },
            };
            this.messageQueue.push(data);
            return;
        }

        let hasAudio = false;
        let hasVideo = false;
        for (const chunk of chunks) {
            if (chunk.mimeType.includes("audio")) hasAudio = true;
            if (chunk.mimeType.includes("image")) hasVideo = true;
            if (hasAudio && hasVideo) break;
        }

        const message = hasAudio && hasVideo ? "audio + video" : 
                       hasAudio ? "audio" : 
                       hasVideo ? "video" : "unknown";

        const data = {
            realtimeInput: {
                mediaChunks: chunks,
            },
        };
        this._sendDirect(data);
        this.log(`client.realtimeInput`, message);
    }

    sendToolResponse(toolResponse) {
        console.log("sendToolResponse", toolResponse);
        const message = { toolResponse };
        this._sendDirect(message);
        this.log(`client.toolResponse`, message);
    }

    send(parts, turnComplete = true) {
        parts = Array.isArray(parts) ? parts : [parts];
        console.log("send", parts, turnComplete);
        const content = {
            role: "user",
            parts,
        };

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
                // Queue the message if currently connecting
                this.messageQueue.push(request);
                return;
            }
            // Attempt to reconnect if not connecting
            if (this.connectionRetries < this.maxRetries) {
                this.messageQueue.push(request);
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
}

export { MultimodalLiveClient };