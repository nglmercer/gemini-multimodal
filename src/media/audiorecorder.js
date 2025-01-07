import { audioContext } from '../utils.js';
import { EventEmitter } from "eventemitter3";
import { MultimodalLiveClient} from "../clientemit.js"
import { AudioStreamer} from './audiostreamer.js';
const AudioRecordingWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {

  // send and clear buffer every 2048 samples, 
  // which at 16khz is about 8 times a second
  buffer = new Int16Array(2048);

  // current write index
  bufferWriteIndex = 0;

  constructor() {
    super();
    this.hasAudio = false;
  }

  /**
   * @param inputs Float32Array[][] [input#][channel#][sample#] so to access first inputs 1st channel inputs[0][0]
   * @param outputs Float32Array[][]
   */
  process(inputs) {
    if (inputs[0].length) {
      const channel0 = inputs[0][0];
      this.processChunk(channel0);
    }
    return true;
  }

  sendAndClearBuffer(){
    this.port.postMessage({
      event: "chunk",
      data: {
        int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
      },
    });
    this.bufferWriteIndex = 0;
  }

  processChunk(float32Array) {
    const l = float32Array.length;
    
    for (let i = 0; i < l; i++) {
      // convert float32 -1 to 1 to int16 -32768 to 32767
      const int16Value = float32Array[i] * 32768;
      this.buffer[this.bufferWriteIndex++] = int16Value;
      if(this.bufferWriteIndex >= this.buffer.length) {
        this.sendAndClearBuffer();
      }
    }

    if(this.bufferWriteIndex >= this.buffer.length) {
      this.sendAndClearBuffer();
    }
  }
}
`;
const VolMeterWorket = `
  class VolMeter extends AudioWorkletProcessor {
    volume
    updateIntervalInMS
    nextUpdateFrame

    constructor() {
      super()
      this.volume = 0
      this.updateIntervalInMS = 25
      this.nextUpdateFrame = this.updateIntervalInMS
      this.port.onmessage = event => {
        if (event.data.updateIntervalInMS) {
          this.updateIntervalInMS = event.data.updateIntervalInMS
        }
      }
    }

    get intervalInFrames() {
      return (this.updateIntervalInMS / 1000) * sampleRate
    }

    process(inputs) {
      const input = inputs[0]

      if (input.length > 0) {
        const samples = input[0]
        let sum = 0
        let rms = 0

        for (let i = 0; i < samples.length; ++i) {
          sum += samples[i] * samples[i]
        }

        rms = Math.sqrt(sum / samples.length)
        this.volume = Math.max(rms, this.volume * 0.7)

        this.nextUpdateFrame -= samples.length
        if (this.nextUpdateFrame < 0) {
          this.nextUpdateFrame += this.intervalInFrames
          this.port.postMessage({volume: this.volume})
        }
      }

      return true
    }
  }`;
const registeredWorklets = new Map();
const createWorketFromSrc = (workletName, workletSrc) => {
    const script = new Blob(
        [`registerProcessor('${workletName}', ${workletSrc})`],
        {type: 'application/javascript'});
    return URL.createObjectURL(script)
}
function arrayBufferToBase64(buffer) {
    var binary = "";
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
class AudioRecorder extends EventEmitter {
    constructor(sampleRate = 16000) {
        super();
        this.stream = null;
        this.audiocontext = audioContext;
        this.source = null;
        this.recording = false;
        this.recordingWorklet = null;
        this.vuWorklet = null;
        this.starting = false;
        this.sampleRate = sampleRate;
    }

    async start() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Could not request user media");
        }
    
        this.starting = new Promise(async (resolve, reject) => {
          this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.audioContext = await audioContext({ sampleRate: this.sampleRate });
          this.source = this.audioContext.createMediaStreamSource(this.stream);
    
          const workletName = "audio-recorder-worklet";
          const src = createWorketFromSrc(workletName, AudioRecordingWorklet);
    
          await this.audioContext.audioWorklet.addModule(src);
          this.recordingWorklet = new AudioWorkletNode(
            this.audioContext,
            workletName,
          );
    
          this.recordingWorklet.port.onmessage = async (ev) => {
            // worklet processes recording floats and messages converted buffer
            const arrayBuffer = ev.data.data.int16arrayBuffer;
    
            if (arrayBuffer) {
              const arrayBufferString = arrayBufferToBase64(arrayBuffer);
              this.emit("data", arrayBufferString);
            }
          };
          this.source.connect(this.recordingWorklet);

                // vu meter worklet
      const vuWorkletName = "vu-meter";
      await this.audioContext.audioWorklet.addModule(
        createWorketFromSrc(vuWorkletName, VolMeterWorket),
      );
      this.vuWorklet = new AudioWorkletNode(this.audioContext, vuWorkletName);
      this.vuWorklet.port.onmessage = (ev) => {
        this.emit("volume", ev.data.volume);
      };
      this.source.connect(this.vuWorklet);
      this.recording = true;
      resolve();
      this.starting = null;
    });
  }
  stop() {
    // its plausible that stop would be called before start completes
    // such as if the websocket immediately hangs up
    const handleStop = () => {
      this.source?.disconnect();
      this.stream?.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
    };
    if (this.starting) {
      this.starting.then(handleStop);
      return;
    }
    handleStop();
  }
}

class LiveAPI {
  constructor({ url, apiKey }) {
    this.client = new MultimodalLiveClient({ url, apiKey });
    this.audioStreamerRef = null;
    this.connected = false;
    this.config = {
      model: "models/gemini-2.0-flash-exp"
    };
    this.volume = 0;
    this.attachClientListeners();
  }

  attachClientListeners() {
    this.client
      .on("close", () => {
        this.connected = false;
        console.log("Connection closed");
      })
      .on("interrupted", () => {
        if (this.audioStreamerRef) {
          this.audioStreamerRef.stop();
        }
      })
      .on("audio", (data) => {
        if (this.audioStreamerRef) {
          this.audioStreamerRef.addPCM16(new Uint8Array(data));
        }
      });
  }

  async connect() {
    if (!this.config) {
      throw new Error("Configuration has not been set");
    }
    this.client.disconnect();
    await this.client.connect(this.config);
    this.connected = true;
    console.log("Connected successfully!", this.config);
  }

  disconnect() {
    this.client.disconnect();
    this.connected = false;
    console.log("Disconnected successfully.");
  }

  setConfig(newConfig) {
    this.config = newConfig;
    console.log("New config set:", this.config);
  }

  getConfig() {
    return this.config;
  }

  isConnected() {
    return this.connected;
  }
}
function useLiveAPI({ url, apiKey }) {
  return new LiveAPI({ url, apiKey });
}
export { AudioRecorder, useLiveAPI }