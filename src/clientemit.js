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

/**
 * Ensures that the input is an array.
 * @param {any} input - The input to ensure as an array.
 * @returns {Array} - The input as an array.
 */
function ensureArray(input) {
    return Array.isArray(input) ? input : [input];
}

class MultimodalLiveClient extends EventEmitter {
    constructor({ url, apiKey }) {
        super();
        this.url = url || `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;
        this.url += `?key=${apiKey}`;
        this.ws = null;
        this.config = null;
        this.isConnecting = false;
        this.messageQueue = [];
        this.connectionRetries = 0;
        this.maxRetries = 3;
        this.connected = false;
        this.reconnectionTimeout = null; // Tracks reconnection timeout
        this.contextQueue = []; // Stores context messages

        // Bind methods
        this.send = this.send.bind(this);
        this.connect = this.connect.bind(this);
        this._sendDirect = this._sendDirect.bind(this);
        this.handleConnectionError = this.handleConnectionError.bind(this);
        this.addToContext = this.addToContext.bind(this);
        this.sendWithContext = this.sendWithContext.bind(this);
    }

    /**
     * Logs a message with a type and emits it as an event.
     * @param {string} type - The type of log (e.g., "client.send").
     * @param {string} message - The message to log.
     */
    log(type, message) {
        const log = {
            date: new Date(),
            type,
            message,
        };
        this.emit("log", log);
    }

    /**
     * Connects to the WebSocket server.
     * @param {Object} config - Configuration object for the connection.
     * @returns {Promise<boolean>} - Resolves to true if the connection is successful.
     */
    async connect(config) {
        if (this.isConnecting) {
            return new Promise((resolve) => {
                this.once("connected", () => resolve(true));
            });
        }

        this.disconnect();
        this.isConnecting = true;
        if (config) this.config = config;

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
                    if (!this.config) {
                        this.isConnecting = false;
                        reject(new Error("Invalid config sent to `connect(config)`"));
                        return;
                    }

                    this.log(`client.${ev.type}`, "Connected to socket");
                    this.emit("open");
                    this.setConnected(true);
                    this.ws = ws;
                    this.isConnecting = false;
                    this.emit("connected");

                    // Send setup message
                    const setupMessage = { setup: this.config };
                    this._sendDirect(setupMessage);
                    this.log("client.send", "Setup message sent");

                    // Process queued messages
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

    /**
     * Handles WebSocket connection errors.
     * @param {Event} ev - The error event.
     * @param {WebSocket} ws - The WebSocket instance.
     * @param {Function} reject - The reject function of the Promise.
     */
    handleConnectionError(ev, ws, reject) {
        this.disconnect(ws);
        const message = `Could not connect to "${this.url}"`;
        this.log(`server.${ev.type}`, message);
        this.isConnecting = false;
        this.setConnected(false);
        reject(new Error(message));
    }

    /**
     * Handles WebSocket close events.
     * @param {Event} ev - The close event.
     */
    handleClose(ev) {
        this.setConnected(false);
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

        // Attempt reconnection if appropriate
        if (this.connectionRetries < this.maxRetries) {
            this.connectionRetries++;
            setTimeout(() => {
                this.connect(this.config).catch(console.error);
            }, 1000 * this.connectionRetries); // Exponential backoff
        }
    }

    /**
     * Disconnects the WebSocket.
     * @param {WebSocket} ws - The WebSocket instance to disconnect.
     * @returns {boolean} - True if disconnected, false otherwise.
     */
    disconnect(ws) {
        if ((!ws || this.ws === ws) && this.ws) {
            this.ws.close();
            this.ws = null;
            this.setConnected(false);
            this.log("client.close", "Disconnected");
            if (this.reconnectionTimeout) {
                clearTimeout(this.reconnectionTimeout);
                this.reconnectionTimeout = null;
            }
            return true;
        }
        return false;
    }

    /**
     * Processes the message queue.
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const queuedMessage = this.messageQueue.shift();
            this._sendDirect(queuedMessage);
        }
    }

    /**
     * Receives and processes a WebSocket message.
     * @param {Blob} blob - The received blob data.
     */
    async receive(blob) {
        const response = await blobToJSON(blob);
        //console.log("Received response:", response);

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
                    //console.warn("modelTurn or parts are undefined",serverContent);
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

    /**
     * Sends real-time input to the server.
     * @param {Array} chunks - The media chunks to send.
     */
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

    /**
     * Sends a tool response to the server.
     * @param {Object} toolResponse - The tool response to send.
     */
    sendToolResponse(toolResponse) {
        const message = { toolResponse };
        this._sendDirect(message);
        this.log(`client.toolResponse`, message);
    }

    /**
     * Adds parts to the context queue.
     * @param {Array|Object} parts - The parts to add to the context.
     */
    addToContext(parts) {
        parts = ensureArray(parts);
        const content = { role: "user", parts };
        this.contextQueue.push(content);
    }

    /**
     * Sends a message with context.
     * @param {Array|Object} parts - The parts to send.
     * @param {boolean} turnComplete - Whether the turn is complete.
     */
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

    /**
     * Sends a message to the server.
     * @param {Array|Object} parts - The parts to send.
     * @param {boolean} turnComplete - Whether the turn is complete.
     */
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

    /**
     * Sends a message directly to the WebSocket.
     * @param {Object} request - The request to send.
     */
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

    /**
     * Enqueues a message for later sending.
     * @param {Object} message - The message to enqueue.
     */
    enqueueMessage(message) {
        this.messageQueue.push(message);
    }

    /**
     * Sets the connection status.
     * @param {boolean} status - The connection status.
     */
    setConnected(status) {
        this.connected = status;
        this.emit(status ? "connected" : "disconnected");
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

    /**
     * Initializes the audio streamer.
     */
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

    /**
     * Attaches client listeners.
     */
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

    /**
     * Detaches client listeners.
     */
    detachClientListeners() {
        this.client.off("close").off("interrupted").off("audio");
    }

    /**
     * Connects to the WebSocket server.
     */
    async connect() {
        if (!this.config) {
            throw new Error("Configuration has not been set");
        }

        this.client.disconnect();
        await this.client.connect(this.config);
        this.connected = true;
        console.log("Connected successfully!", this.config);
    }

    /**
     * Disconnects from the WebSocket server.
     */
    async disconnect() {
        this.client.disconnect();
        this.connected = false;
        console.log("Disconnected successfully.");
    }

    /**
     * Sets the configuration.
     * @param {Object} config - The configuration object.
     */
    setConfig(config) {
        this.config = config;
    }

    /**
     * Gets the current configuration.
     * @returns {Object} - The current configuration.
     */
    getConfig() {
        return this.config;
    }

    /**
     * Gets the current volume.
     * @returns {number} - The current volume.
     */
    getVolume() {
        return this.volume;
    }

    /**
     * Checks if the client is connected.
     * @returns {boolean} - True if connected, false otherwise.
     */
    isConnected() {
        return this.connected;
    }
}

export { MultimodalLiveClient, MultimodalLiveAPI };