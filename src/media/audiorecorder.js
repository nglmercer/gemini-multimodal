import { audioContext } from '../utils.js';
import { EventEmitter } from "eventemitter3";
import { MultimodalLiveClient} from "../clientemit.js"
import { AudioStreamer} from './audiostreamer.js';
const AudioRecordingWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {
  // send and clear buffer every 2048 samples, 
  // which at 16khz is about 8 times a second
  buffer = new Int16Array(2048);
  bufferWriteIndex = 0;

  constructor() {
    super();
    this.hasAudio = false;
  }

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
}`;

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
  constructor(targetSampleRate = 16000) {
      super();
      this.stream = null;
      this.audioContext = null;
      this.source = null;
      this.recording = false;
      this.recordingWorklet = null;
      this.vuWorklet = null;
      this.starting = false;
      this.targetSampleRate = targetSampleRate;
      this.resamplingEnabled = true;
  }

  async start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Could not request user media");
      }

      this.starting = new Promise(async (resolve, reject) => {
          try {
              // Get the audio stream
              this.stream = await navigator.mediaDevices.getUserMedia({ 
                  audio: true
              });

              // Create audio context with default sample rate
              this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
              console.log(`Browser's sample rate: ${this.audioContext.sampleRate}`);

              // Create the source
              this.source = this.audioContext.createMediaStreamSource(this.stream);

              // Add resampling if needed
              if (this.resamplingEnabled && this.audioContext.sampleRate !== this.targetSampleRate) {
                  const offlineCtx = new OfflineAudioContext(
                      1, // mono
                      this.audioContext.sampleRate, 
                      this.audioContext.sampleRate
                  );

                  // Create a script processor for resampling
                  const bufferSize = 4096;
                  const scriptNode = this.audioContext.createScriptProcessor(
                      bufferSize,
                      1, // input channels
                      1  // output channels
                  );

                  scriptNode.onaudioprocess = (audioProcessingEvent) => {
                      const inputBuffer = audioProcessingEvent.inputBuffer;
                      const inputData = inputBuffer.getChannelData(0);
                      
                      // Resample the audio
                      const resampledBuffer = this.resampleAudio(
                          inputData,
                          this.audioContext.sampleRate,
                          this.targetSampleRate
                      );

                      // Convert to Int16Array
                      const int16Data = new Int16Array(resampledBuffer.length);
                      for (let i = 0; i < resampledBuffer.length; i++) {
                          int16Data[i] = Math.max(-32768, Math.min(32767, Math.round(resampledBuffer[i] * 32767)));
                      }

                      // Emit the resampled data
                      if (this.recording) {
                          const arrayBufferString = this.arrayBufferToBase64(int16Data.buffer);
                          this.emit("data", arrayBufferString);
                      }
                  };

                  // Connect the nodes
                  this.source.connect(scriptNode);
                  scriptNode.connect(this.audioContext.destination);
              } else {
                  // If no resampling needed, proceed with original worklet setup
                  const workletName = "audio-recorder-worklet";
                  const src = createWorketFromSrc(workletName, AudioRecordingWorklet);
                  await this.audioContext.audioWorklet.addModule(src);
                  
                  this.recordingWorklet = new AudioWorkletNode(
                      this.audioContext,
                      workletName,
                  );

                  this.recordingWorklet.port.onmessage = async (ev) => {
                      const arrayBuffer = ev.data.data.int16arrayBuffer;
                      if (arrayBuffer) {
                          const arrayBufferString = this.arrayBufferToBase64(arrayBuffer);
                          this.emit("data", arrayBufferString);
                      }
                  };

                  this.source.connect(this.recordingWorklet);
              }

              // Setup VU meter
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
          } catch (error) {
              reject(error);
          }
          this.starting = null;
      });
      
      return this.starting;
  }

  resampleAudio(audioData, fromSampleRate, toSampleRate) {
      const ratio = fromSampleRate / toSampleRate;
      const newLength = Math.round(audioData.length / ratio);
      const result = new Float32Array(newLength);
      
      for (let i = 0; i < newLength; i++) {
          const position = i * ratio;
          const index = Math.floor(position);
          const fraction = position - index;
          
          if (index + 1 < audioData.length) {
              result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
          } else {
              result[i] = audioData[index];
          }
      }
      
      return result;
  }

  arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      let binary = '';
      for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
  }

  stop() {
      const handleStop = () => {
          if (this.source) {
              this.source.disconnect();
          }
          if (this.stream) {
              this.stream.getTracks().forEach((track) => track.stop());
          }
          if (this.audioContext) {
              this.audioContext.close();
          }
          this.stream = undefined;
          this.recordingWorklet = undefined;
          this.vuWorklet = undefined;
          this.audioContext = undefined;
          this.recording = false;
      };

      if (this.starting) {
          this.starting.then(handleStop).catch(console.error);
          return;
      }
      handleStop();
  }
}


export { AudioRecorder }