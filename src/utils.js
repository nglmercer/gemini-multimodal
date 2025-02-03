
  const globalmap = new Map();
  
  const audioContext = (() => {
    const map = new Map();
    const didInteract = new Promise((resolve) => {
      window.addEventListener("pointerdown", resolve, { once: true });
      window.addEventListener("keydown", resolve, { once: true });
    });
  
    return async (options) => {
      try {
        const audio = new Audio();
        audio.src =
          "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        await audio.play();
  
        if (options && options.id && map.has(options.id)) {
          const ctx = map.get(options.id);
          if (ctx) {
            return ctx;
          }
        }
  
        const ctx = new AudioContext(options);
        if (options && options.id) {
          map.set(options.id, ctx);
        }
        return ctx;
      } catch (e) {
        await didInteract;
  
        if (options && options.id && map.has(options.id)) {
          const ctx = map.get(options.id);
          if (ctx) {
            return ctx;
          }
        }
  
        const ctx = new AudioContext(options);
        if (options && options.id) {
          map.set(options.id, ctx);
        }
        return ctx;
      }
    };
  })();
  
  
  const blobToJSON = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          const json = JSON.parse(reader.result);
          resolve(json);
        } else {
          reject("oops");
        }
      };
      reader.readAsText(blob);
    });
  
  function base64ToArrayBuffer(base64) {
    var binaryString = atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
  const functions1 = {
    
    isClientContentMessage,
    isInterrupted,
    isModelTurn,
    isServerContentMessage,
    isSetupCompleteMessage,
    isToolCall,
    isToolCallCancellationMessage,
    isToolCallMessage,
    isTurnComplete,
/*     LiveIncomingMessage,
    ModelTurn,
    RealtimeInputMessage,
    ServerContent,w
    SetupMessage,
    StreamingLog,
    ToolCall,
    ToolCallCancellation,
    ToolResponseMessage, */
  }

  function isModelTurn(data) {
    const serverContent = data;

    console.log("isModelTurn", data);
    if (!serverContent.modelTurn || !serverContent.modelTurn.parts) {
        return data;
    }

    let parts = serverContent.modelTurn?.parts;
    const audioParts = parts.filter(
        (p) => p.inlineData && p.inlineData.mimeType.startsWith("audio/pcm")
    );
    const base64s = audioParts.map((p) => p.inlineData?.data);

    // Alternativa a lodash.difference usando filter e includes
    const otherParts = parts.filter((part) => !audioParts.includes(part));

    base64s.forEach((b64) => {
        if (b64) {
            const data = base64ToArrayBuffer(b64);
            console.log(`server.audio`, `buffer (${data.byteLength})`);
        }
    });

    playAudio(data.modelTurn.parts[0]);

    if (!otherParts.length) {
        console.log("no hay otros parts", otherParts);
        return;
    }

    parts = otherParts;
    const content = { modelTurn: { parts } };
    console.log("isModelTurn content", content);
    return data.modelTurn;
}
  function playAudio(data) {
    if (!data.inlineData) {
      console.log("playAudio", data);
      parseResponse(data);
      return;
    }
/*     const player = document.getElementById('voiceplayer');
  player.setAudioData(data.inlineData.data, data.inlineData.mimeType); */
  setAudioData(data.inlineData.data, data.inlineData.mimeType);

  }
  function parseResponse(data) {
    try {
      if (!data || !data.text) {
        throw new Error("La respuesta está vacía o es indefinida.");
      }
  
      const response = data.text.trim(); // Eliminamos espacios extra
      if (!response.startsWith("```json") || !response.endsWith("```")) {
        throw new Error("El formato del JSON no es válido.");
      }
  
      // Limpiar el JSON eliminando ```json y ```
      const cleanedJson = response.replace(/```json\n|\n```/g, '');
  
      // Intentar parsear el JSON
      const json = JSON.parse(cleanedJson);
      const existingEmitter = Emitter.getInstance('translation');
      if (existingEmitter) {
        existingEmitter.emit('translation', json);
      }
      console.log("Respuesta exitosa:", json);
      return json; // Devolver el objeto parseado si es válido
    } catch (error) {
      console.error("Error al parsear la respuesta:", error.message);
      return null; // Devolver null en caso de error
    }
  }
  
  function hasProperty(obj, prop, kind = "object") {
    return obj != null && typeof obj === "object" && typeof obj[prop] === kind;
  }
  
  // Verificaciones para mensajes salientes
  function isSetupMessage(a) {
    return hasProperty(a, "setup");
  }
  
  function isClientContentMessage(a) {
    return hasProperty(a, "clientContent");
  }
  
  function isRealtimeInputMessage(a) {
    return hasProperty(a, "realtimeInput");
  }
  
  function isToolResponseMessage(a) {
    return hasProperty(a, "toolResponse");
  }
  
  // Verificaciones para mensajes entrantes
  function isSetupCompleteMessage(a) {
    return hasProperty(a, "setupComplete");
  }
  
  function isServerContentMessage(a) {
    return hasProperty(a, "serverContent");
  }
  
  function isToolCallMessage(a) {
    return hasProperty(a, "toolCall");
  }
  
  function isToolCallCancellationMessage(a) {
    return (
      hasProperty(a, "toolCallCancellation") &&
      isToolCallCancellation(a.toolCallCancellation)
    );
  }
  

  function isTurnComplete(a) {
    return typeof a === "object" && typeof a.turnComplete === "boolean";
  }
  
  function isInterrupted(a) {
    return typeof a === "object" && a.interrupted === true;
  }
  
  function isToolCall(value) {
    if (!value || typeof value !== "object") return false;
  
    const candidate = value;
    return (
      Array.isArray(candidate.functionCalls) &&
      candidate.functionCalls.every(isLiveFunctionCall)
    );
  }
  
  function isToolResponse(value) {
    if (!value || typeof value !== "object") return false;
  
    const candidate = value;
    return (
      Array.isArray(candidate.functionResponses) &&
      candidate.functionResponses.every(isLiveFunctionResponse)
    );
  }
  
  function isLiveFunctionCall(value) {
    if (!value || typeof value !== "object") return false;
  
    const candidate = value;
    return (
      typeof candidate.name === "string" &&
      typeof candidate.id === "string" &&
      typeof candidate.args === "object" &&
      candidate.args !== null
    );
  }
  
  function isLiveFunctionResponse(value) {
    if (!value || typeof value !== "object") return false;
  
    const candidate = value;
    return (
      typeof candidate.response === "object" &&
      typeof candidate.id === "string"
    );
  }
  
  function isToolCallCancellation(a) {
    return typeof a === "object" && Array.isArray(a.ids);
  }
  class AudioPlayer {
    constructor() {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.audioQueue = [];
      this.isPlaying = false;
      this.currentSource = null;
      this.analyser = null;
      this.dataArray = null;
      this.bufferLength = 256;
      this.rafId = null;
  }

    async setAudioData(data, mimeType) {
      if (mimeType.includes("audio/pcm")) {
          const pcmBuffer = this.base64ToArrayBuffer(data);
          const wavData = encodePCMToWAV(pcmBuffer, 24000);
          this.addToQueue(wavData, "audio/wav");
      } else {
          this.addToQueue(data, mimeType);
      }
      
      if (!this.isPlaying) this.playNextChunk();
  }


    addToQueue(data, mimeType) {
        this.audioQueue.push({ data, mimeType });
    }



    async decodeAudioData(data, mimeType) {
      try {
          const audioBuffer = await this.audioContext.decodeAudioData(data);
          return audioBuffer;
      } catch (error) {
          console.error("Error decoding audio data:", error);
          throw error;
      }
  }

    base64ToArrayBuffer(base64) {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
  }
  async playNextChunk() {
    if (this.audioQueue.length === 0) {
        this.isPlaying = false;
        return;
    }

    this.isPlaying = true;
    const { data, mimeType } = this.audioQueue.shift();

    // Configurar AnalyserNode
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.bufferLength;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // Decodificar el audio
    const audioBuffer = await this.decodeAudioData(data, mimeType);
    
    // Crear source y conectar
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    // Iniciar visualización
    this.setupVisualizer();

    source.start(0);
    this.currentSource = source;

    source.onended = () => {
        cancelAnimationFrame(this.rafId);
        this.playNextChunk();
    };
}

setupVisualizer() {
    const visualizer = document.querySelector('audio-visualizer');
    if (!visualizer) return;

    const draw = () => {
        this.analyser.getByteTimeDomainData(this.dataArray);
        visualizer.updateData(this.dataArray);
        this.rafId = requestAnimationFrame(draw);
    };

    this.rafId = requestAnimationFrame(draw);
}

stop() {
    if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource.disconnect();
    }
    cancelAnimationFrame(this.rafId);
    this.audioQueue = [];
    this.isPlaying = false;
}

  updateVisualizerInRealTime(duration) {
    const visualizer = document.querySelector('audio-visualizer'); // 6. Obtener visualizador
    if (!visualizer) return;
    
    // Limpiar intervalo previo
    if (this.visualizerIntervalId) {
      clearInterval(this.visualizerIntervalId);
      this.visualizerIntervalId = null;
    }

    // Configurar nuevo intervalo
    const updateInterval = 50;
    const totalUpdates = duration * 1000 / updateInterval;
    let currentUpdate = 0;

    
    this.visualizerIntervalId = setInterval(() => {
      if (currentUpdate >= totalUpdates) {
        clearInterval(this.visualizerIntervalId);
        this.visualizerIntervalId = null;
        return;
      }
        
        const progress = currentUpdate / totalUpdates;
        const samples = this.calculateCurrentSamples(progress);
        visualizer.updateData(samples);
        
        currentUpdate++;
    }, updateInterval);}

calculateCurrentSamples(progress) {
  try {
    if (!this.pcmData || this.pcmData.length === 0) {
      return new Float32Array(0);
    }
    const start = Math.floor(progress * this.pcmData.length);
    const end = start + Math.floor(this.pcmData.length / this.bufferLength);
    return this.pcmData.slice(start, end);
  } catch (error) {
    console.error('Buffer detached:', error);
    return new Float32Array(0);
  }
}
}

const audioPlayer = new AudioPlayer();
async function setAudioData(data, mimeType) {
  const visualizer = document.querySelector('audio-visualizer');

  
  try {
      await audioPlayer.setAudioData(data, mimeType);
      if (!visualizer) {
        console.error('Visualizador no encontrado');
        return;
    }
  } catch (error) {
      console.error('Error al cargar audio:', error);
  }
}
function encodePCMToWAV(pcmData, sampleRate) {
  // Asegúrate de que pcmData sea un ArrayBuffer o un Uint8Array
  if (!(pcmData instanceof ArrayBuffer)) {
      throw new Error("pcmData debe ser un ArrayBuffer");
  }

  const pcmArray = new Uint8Array(pcmData);
  const buffer = new ArrayBuffer(44 + pcmArray.length); // 44 bytes para la cabecera WAV
  const view = new DataView(buffer);

  // Escribir la cabecera WAV
  const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
      }
  };

  writeString(0, 'RIFF'); // ChunkID
  view.setUint32(4, 36 + pcmArray.length, true); // ChunkSize (tamaño total del archivo menos 8 bytes)
  writeString(8, 'WAVE'); // Format
  writeString(12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size (16 para PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 para PCM)
  view.setUint16(22, 1, true); // NumChannels (1 para mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16 para PCM)
  writeString(36, 'data'); // Subchunk2ID
  view.setUint32(40, pcmArray.length, true); // Subchunk2Size (tamaño de los datos PCM)

  // Escribir los datos PCM
  const pcmView = new Uint8Array(buffer, 44); // Escribir a partir del byte 44
  pcmView.set(pcmArray);

  return buffer;
}
class LocalStorageManager {
  constructor(key) {
    this.key = key;
    this.initializeStorage();
  }
  static getStorage(store) {
    const storetype = typeof store;
    try {
      return JSON.parse(localStorage.getItem(store));
     } catch (error) {
      console.log(error, storetype);
        return [];
      }
  }
  async initializeStorage() {
    try {
      const currentData = await this.getAll();
      if (!currentData.length) {
        await this.saveItems([]);
      }
    } catch (error) {
      this.handleError('Error initializing storage', error);
    }
  }

  deepCopy(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      this.handleError('Error creating deep copy', error);
      return null;
    }
  }

  // Método para generar un nuevo ID único o reusar un ID existente
  generateUniqueId(items, proposedId = null) {
    // Convertir ID a número si es un string
    proposedId = proposedId !== null ? Number(proposedId) : null;

    const existingIds = new Set(items.map(item => item.id));
    
    // Encontrar espacios vacíos
    const findEmptySpace = () => {
      for (let i = 0; i <= items.length; i++) {
        if (!existingIds.has(i)) {
          return i;
        }
      }
      return items.length;
    };

    // Si se propone un ID específico
    if (proposedId !== null) {
      // Si el ID propuesto no existe, usarlo
      if (!existingIds.has(proposedId)) {
        return proposedId;
      }
      
      // Buscar el primer espacio vacío
      return findEmptySpace();
    }
    
    // Si no hay ID propuesto, encontrar el primer espacio vacío
    return findEmptySpace();
  }

  // Método para asegurar que un objeto tenga un ID único
  ensureObjectHasId(item, items) {
    const itemCopy = this.deepCopy(item);
    
    // Convertir ID a número si es un string
    if (itemCopy.id !== undefined) {
      itemCopy.id = Number(itemCopy.id);
    }
    
    // Generar o ajustar el ID
    itemCopy.id = this.generateUniqueId(items, itemCopy.id);
    
    return itemCopy;
  }

  async add(item) {
    try {
      const items = await this.getAll();
      
      // Aseguramos que el item tenga un ID único
      const itemWithId = this.ensureObjectHasId(item, items);
      
      // Verificamos si ya existe un objeto similar
      const exists = items.some(existingItem =>
        this.areObjectsEqual(existingItem, itemWithId)
      );
      
      if (!exists) {
        items.push(itemWithId);
        await this.saveItems(items);
        return itemWithId.id;
      }
      
      return false;
    } catch (error) {
      this.handleError('Error adding item', error);
    }
  }

  // Los demás métodos permanecen igual que en la versión anterior
  async remove(identifier) {
    try {
      const items = await this.getAll();
      // Convertir identificador a número si es posible
      const numIdentifier = isNaN(Number(identifier)) ? identifier : Number(identifier);
      
      const updatedItems = items.filter(item =>
        item.id !== numIdentifier && item.name !== numIdentifier
      );
      
      if (updatedItems.length !== items.length) {
        await this.saveItems(updatedItems);
        return true;
      }
      return false;
    } catch (error) {
      this.handleError('Error removing item', error);
    }
  }

  async get(identifier) {
    try {
      const items = await this.getAll();
      // Convertir identificador a número si es posible
      const numIdentifier = isNaN(Number(identifier)) ? identifier : Number(identifier);
      
      const item = items.find(item =>
        item.id === numIdentifier || item.name === numIdentifier
      );
      
      return item ? this.deepCopy(item) : null;
    } catch (error) {
      this.handleError('Error getting item', error);
    }
  }

  async getAll() {
    try {
      const items = localStorage.getItem(this.key);
      return items ? this.deepCopy(JSON.parse(items)) : [];
    } catch (error) {
      this.handleError('Error getting all items', error);
    }
  }

  async saveItems(items) {
    try {
      const itemsCopy = this.deepCopy(items);
      localStorage.setItem(this.key, JSON.stringify(itemsCopy));
      return true;
    } catch (error) {
      this.handleError('Error saving items', error);
      return false;
    }
  }

  async clear() {
    try {
      await this.saveItems([]);
    } catch (error) {
      this.handleError('Error clearing storage', error);
    }
  }

  async exists(item) {
    try {
      const items = await this.getAll();
      const itemWithId = this.ensureObjectHasId(item, items);
      
      return items.some(existingItem =>
        this.areObjectsEqual(existingItem, itemWithId)
      );
    } catch (error) {
      this.handleError('Error checking existence', error);
    }
  }

  areObjectsEqual(obj1, obj2) {
    try {
      return JSON.stringify(obj1) === JSON.stringify(obj2);
    } catch (error) {
      this.handleError('Error comparing objects', error);
      return false;
    }
  }

  handleError(message, error) {
    console.error(message, error);
    throw error;
  }
}
class Emitter {
  static instances = new Map();
  static idCounter = 0;

  constructor(id) {
    if (!id) {
      id = `emitter_${Emitter.idCounter++}`;
    }
    if (Emitter.instances.has(id)) {
      return Emitter.instances.get(id);
    }
    this.id = id;
    this.events = {};
    this.history = [];
    Emitter.instances.set(id, this);
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  once(event, listener) {
    const onceListener = (...args) => {
      listener(...args);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
    return this;
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach((listener) => listener(...args));
    }
    return this;
  }

  off(event, listener) {
    if (this.events[event]) {
      if (listener) {
        this.events[event] = this.events[event].filter(l => l !== listener);
      } else {
        delete this.events[event];
      }
    }
    return this;
  }

  saveToHistory(data) {
    this.history.push(data);
    return this;
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
    return this;
  }

  static getInstance(id) {
    if (!Emitter.instances.has(id)) {
      throw new Error(`No Emitter instance found with id: ${id}`);
    }
    return Emitter.instances.get(id);
  }
  removeAllListeners() {
    this.events = {};
  }
}
export { functions1,LocalStorageManager, audioContext, blobToJSON, base64ToArrayBuffer, globalmap, Emitter };