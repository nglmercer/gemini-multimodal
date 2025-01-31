/**
 * Aplicación principal para comunicación multimodal con Gemini API
 * Maneja entrada/salida de audio, video, pantalla y herramientas de IA
 */
import './style.css';
import './components/state.js';
import './components/voicecomponent.js';
import './components/audioviewer.js';
import { EventEmitter } from "eventemitter3";
import { blobToJSON, base64ToArrayBuffer, functions1 } from "./utils";
import { AudioRecorder } from './media/audiorecorder.js';
import { WebcamCapture, ScreenCapture, MediaFrameExtractor } from './media/videocapture.js';
import { MultimodalLiveAPI } from "./clientemit.js";
import { SchemaType } from "@google/generative-ai";

// Configuración de conexión
const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Validación de API Key
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

// Configuración de herramientas para el modelo
const declaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description: "JSON STRING representation of the graph to render."
      },
    },
    required: ["json_graph"],
  },
};

// Configuración principal del modelo
const config = {
  model: "models/gemini-2.0-flash-exp",
  generationConfig: {
    responseModalities: "TEXT",
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
    },
  },
  systemInstruction: {
    parts: [{ text: `Eres una IA de traducción. Tu tarea es recibir un texto en español y devolver un JSON con las traducciones al inglés y japonés.  
Formato de salida:  
{  
  "input": "<texto original en español usando muchos terminos en ingles tambien>"
  "traducciones": {  
    "ingles": "<traducción al inglés>",  
    "japones": "<traducción al japonés>"  
  }  
}  ` 
}],

  },
  tools: [
    { googleSearch: { /* Configuración de búsqueda */ } },
    { functionDeclarations: [declaration] }
  ],
};

// Contexto de la API Live
const LiveAPIContext = {
  instance: null,
  config: config,
  
  initialize({ url, apiKey }) {
    if (!this.instance) {
      this.instance = new MultimodalLiveAPI({ url, apiKey });
      this.instance.setConfig(this.config);
      this.setupEventListeners();
    }
    return this.instance;
  },

  setupEventListeners() {
    this.instance.client
      .on("toolcall", this.handleToolCall)
      .on("setupcomplete", () => console.log("Setup complete"))
      .on("interrupted", () => console.log("Interrupted"))
      .on("turncomplete", () => console.log("Turn complete"));
  },

  handleToolCall(toolCall) {
    const fc = toolCall.functionCalls.find(fc => fc.name === declaration.name);
    if (fc) setJSONString(fc.args.json_graph);
    
    if (toolCall.functionCalls.length) {
      setTimeout(() => this.sendToolResponse({
        functionResponses: toolCall.functionCalls.map(fc => ({
          response: { output: { success: true } },
          id: fc.id
        }))
      }), 200);
    }
  }
};

// Configuración de medios
const mediaConfig = {
  audioRecorder: new AudioRecorder(),
  screenCapture: new ScreenCapture(),
  webcam: new WebcamCapture(),
  extractors: {
    webcam: new MediaFrameExtractor({ fps: 1, scale: 0.5, quality: 0.8 }),
    screen: new MediaFrameExtractor({ fps: 1, scale: 0.5, quality: 0.8 })
  },
  active: { webcam: false, screen: false }
};

// Inicialización de componentes
const liveAPI = LiveAPIContext.initialize({ url: uri, apiKey: API_KEY });
const callControlBar = document.querySelector('call-control-bar');

// Event Listeners
callControlBar.addEventListener('button-click', handleControlButton);
mediaConfig.audioRecorder.on("data", data => sendData("audio/pcm;rate=16000", data));

// Inicialización diferida
setTimeout(() => {
  liveAPI.connect();
  console.log("Conexión API inicializada:", liveAPI);
}, 1111);

// Manejadores de medios
async function handleControlButton(e) {
  const { buttonType, buttonState } = e.detail;
  console.log('Control:', buttonType, buttonState);
  
  switch(buttonType) {
    case "mic":
      buttonState ? mediaConfig.audioRecorder.start() : mediaConfig.audioRecorder.stop();
      break;
    case "screen":
      buttonState ? startScreenCapture() : stopScreenCapture();
      break;
    case "video":
      buttonState ? startWebcam() : stopWebcam();
      break;
  }
}

// Funciones de manejo de medios
async function startScreenCapture() {
  mediaConfig.screenCapture.start();
  const video = document.getElementById("screen");
  mediaConfig.screenCapture.setVideoElement(video);
  await processMediaFrames("screen");
}

async function startWebcam() {
  mediaConfig.webcam.start();
  const video = document.getElementById("webcam");
  mediaConfig.webcam.setVideoElement(video);
  await processMediaFrames("webcam");
}

async function processMediaFrames(source) {
  const extractor = mediaConfig.extractors[source];
  const media = source === "webcam" ? mediaConfig.webcam : mediaConfig.screenCapture;

  if (!mediaConfig.active[source]) {
    try {
      await media.start();
      mediaConfig.active[source] = true;
      extractor.setMediaCapture(media);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      extractor.start(frame => {
        liveAPI.client.sendRealtimeInput([{
          mimeType: frame.mimeType,
          data: frame.data
        }]);
      });
    } catch (error) {
      console.error(`Error en ${source}:`, error);
      mediaConfig.active[source] = false;
      media.stop();
      extractor.stop();
    }
  }
}

// Funciones de utilidad
function sendData(type, data) {
  liveAPI.client.sendRealtimeInput([{ mimeType: type, data }]);
}

function onSubmit(textInput = "texto de prueba", e) {
  if (e) e.preventDefault();
  liveAPI.client.send([{ text: textInput }]);
}

function setJSONString(jsonString) {
  // Implementar lógica de renderizado de gráficos
  console.log("Recibido JSON para renderizar:", jsonString);
}