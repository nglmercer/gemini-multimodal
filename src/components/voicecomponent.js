class AudioStreamPlayer extends HTMLElement {
  constructor() {
    super();
    
    // Crear el contexto de audio
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.audioQueue = [];
    this.isPlaying = false;
    this.sampleRate = 24000; // Tasa de muestreo por defecto
    
    // Crear el procesador de script
    this.scriptNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.scriptNode.onaudioprocess = this.processAudio.bind(this);
    
    // Conectar el nodo al destino
    this.scriptNode.connect(this.audioContext.destination);
  }

  // Método para añadir datos de audio a la cola
  setAudioData(data, mimeType) {
    this.addToQueue(data, mimeType);
  }

  // Método para procesar y añadir audio a la cola
  addToQueue(data, mimeType) {
    // Extraer la tasa de muestreo del mimeType si está presente
    const rateMatch = mimeType.match(/rate=(\d+)/);
    if (rateMatch) {
      this.sampleRate = parseInt(rateMatch[1]);
    }

    // Convertir la cadena base64 a ArrayBuffer
    const binaryString = atob(data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convertir a Float32Array para el procesamiento de audio
    const audioData = new Float32Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      audioData[i] = (bytes[i] - 128) / 128.0;
    }

    this.audioQueue.push(audioData);
    
    // Iniciar la reproducción si no está reproduciendo
    if (!this.isPlaying) {
      this.startPlaying();
    }
  }

  // Método para procesar el audio
  processAudio(audioProcessingEvent) {
    const outputBuffer = audioProcessingEvent.outputBuffer;
    const channelData = outputBuffer.getChannelData(0);

    if (this.audioQueue.length > 0) {
      const currentAudio = this.audioQueue[0];
      const samplesToProcess = Math.min(channelData.length, currentAudio.length);

      // Copiar datos al buffer de salida
      for (let i = 0; i < samplesToProcess; i++) {
        channelData[i] = currentAudio[i];
      }

      // Remover los datos procesados de la cola
      if (samplesToProcess === currentAudio.length) {
        this.audioQueue.shift();
      } else {
        this.audioQueue[0] = currentAudio.slice(samplesToProcess);
      }
    } else {
      // Si no hay datos, reproducir silencio
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = 0;
      }
    }
  }

  // Método para iniciar la reproducción
  startPlaying() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.audioContext.resume();
    }
  }

  // Método para detener la reproducción
  stopPlaying() {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.audioContext.suspend();
      this.audioQueue = [];
    }
  }

  // Lifecycle callbacks
  connectedCallback() {
    // Cuando el componente se conecta al DOM
    this.startPlaying();
  }

  disconnectedCallback() {
    // Cuando el componente se desconecta del DOM
    this.stopPlaying();
    this.scriptNode.disconnect();
  }
}

// Registrar el componente
customElements.define('audio-stream-player', AudioStreamPlayer);