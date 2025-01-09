/* 
class AudioStreamPlayer extends HTMLElement {
  constructor() {
    super();

    // Crear el contexto de audio
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.audioQueue = [];
    this.isPlaying = false;
    this.sampleRate = 24000; // Tasa de muestreo por defecto

    // Crear el procesador de script con un buffer más grande
    this.scriptNode = this.audioContext.createScriptProcessor(8192, 1, 1);
    this.scriptNode.onaudioprocess = this.processAudio.bind(this);

    // Conectar el nodo al destino
    this.scriptNode.connect(this.audioContext.destination);
  }

  setAudioData(data, mimeType) {
    this.addToQueue(data, mimeType);
  }

  addToQueue(data, mimeType) {
    const rateMatch = mimeType.match(/rate=(\d+)/);
    if (rateMatch) {
      this.sampleRate = parseInt(rateMatch[1]);
    }

    try {
      const binaryString = atob(data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);

      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioData = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        audioData[i] = (bytes[i] - 128) / 128.0;
      }

      this.audioQueue.push(audioData);

      if (!this.isPlaying) {
        this.startPlaying();
      }
    } catch (error) {
      console.error("Error al procesar los datos de audio:", error);
    }
  }

  processAudio(audioProcessingEvent) {
    const outputBuffer = audioProcessingEvent.outputBuffer;
    const channelData = outputBuffer.getChannelData(0);

    if (this.audioQueue.length > 0) {
      const currentAudio = this.audioQueue[0];
      const samplesToProcess = Math.min(channelData.length, currentAudio.length);

      // Copiar datos al buffer de salida con interpolación simple para reducir el ruido
      for (let i = 0; i < samplesToProcess; i++) {
        channelData[i] = currentAudio[i];
      }

      // Rellenar el resto con la última muestra para evitar saltos bruscos
      const lastSample = currentAudio[samplesToProcess - 1] || 0;
      for (let i = samplesToProcess; i < channelData.length; i++) {
        channelData[i] = lastSample;
      }

      if (samplesToProcess === currentAudio.length) {
        this.audioQueue.shift();
      } else {
        this.audioQueue[0] = currentAudio.slice(samplesToProcess);
      }
    }
  }

  startPlaying() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.audioContext.resume();
    }
  }

  stopPlaying() {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.audioContext.suspend();
      this.audioQueue = [];
    }
  }

  connectedCallback() {
    this.startPlaying();
    setTimeout(() => {
      this.startPlaying();
    }, 1000);
  }

  disconnectedCallback() {
    this.stopPlaying();
    this.scriptNode.disconnect();
  }
}

// Registrar el componente
customElements.define('audio-stream-player', AudioStreamPlayer);
 */