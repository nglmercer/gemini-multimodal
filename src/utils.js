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
    
    ClientContentMessage,
    isInterrupted,
    isModelTurn,
    isServerContentMessage,
    isSetupCompleteMessage,
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
  class clientevents {
    constructor() {
    }
    on(event, callback) {}
    off(event, callback) {}
    emit(event, data) {}
  }
  function ClientContentMessage(data) {
    console.log("ClientContentMessage", data);
    return data;
  }
  function isInterrupted(data) {
    return data.interrupted;
  }
  function isModelTurn(data) {
    return data.modelTurn;
  }
  function isServerContentMessage(data) {
    return data.serverContent;
  }
  function isSetupCompleteMessage(data) {
    return data.setupComplete;
  }
  function isToolCallCancellationMessage(data) {
    return data.toolCallCancellation;
  }
  function isToolCallMessage(data) {
    return data.toolCall;
  }
  function isTurnComplete(data) {
    return data.turnComplete;
  }
  export { functions1,LocalStorageManager, audioContext, blobToJSON, base64ToArrayBuffer, globalmap };