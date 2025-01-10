import './style.css';
import'./components/state.js';
import './components/voicecomponent.js'
import './components/audioviewer.js'
import { EventEmitter } from "eventemitter3";
import { difference, set } from "lodash";
import { blobToJSON, base64ToArrayBuffer,functions1 } from "./utils";
import {AudioRecorder, useLiveAPI} from './media/audiorecorder.js';
import { WebcamCapture, ScreenCapture,MediaFrameExtractor } from './media/videocapture.js';
import { MultimodalLiveClient, MultimodalLiveAPI} from "./clientemit.js";
import { SchemaType } from "@google/generative-ai";
import { live } from 'lit/directives/live.js';

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (typeof API_KEY !== "string") {  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");} else {
  console.log("API_KEY:", API_KEY);
}

const liveAPI = new MultimodalLiveAPI({ url: uri, apiKey: API_KEY });

liveAPI.client.on("toolcall", (toolCall) => {
  console.log("toolcall", toolCall);
});
liveAPI.client.on("toolcallcancellation", (toolCallCancellation) => {
  console.log("toolcallcancellation", toolCallCancellation);
});
liveAPI.client.on("setupcomplete", () => {
  console.log("setupcomplete");
});
liveAPI.client.on("interrupted", () => {
  console.log("interrupted");
});
liveAPI.client.on("turncomplete", () => {
  console.log("turncomplete");
});
const liveAPIContext = {
  liveAPI: null,
  setLiveAPI(liveAPI) {
    this.liveAPI = liveAPI;
  },
  getLiveAPI() {
    if (!this.liveAPI) {
      throw new Error("useLiveAPI must be used within a LiveAPIProvider");
    }
    return this.liveAPI;
  }
};
document.querySelector('#app').innerHTML = `
  <div class="container mx-auto py-8">
  <audio-stream-player id="voiceplayer"></audio-stream-player>
    <call-control-bar state="active"></call-control-bar>
    </div>
`;
const audioRecorder = new AudioRecorder();
audioRecorder.on("data", (data) => {
  onData(data);
});
const onData = (base64) => {
  client.client.sendRealtimeInput([
    {
      mimeType: "audio/pcm;rate=16000",
      data: base64,
    },
  ]);
};
const onSubmit = (textInput = "texto de prueba",e) => {
  if (e) e.preventDefault();
  client.client.send([{ text: textInput }]);
};


function LiveAPIProvider({ url, apiKey, children }) {
  const liveAPI = useLiveAPI({ url, apiKey });
  liveAPIContext.setLiveAPI(liveAPI);

  if (typeof children === "function") {
    children();
  } else if (Array.isArray(children)) {
    children.forEach((child) => {
      if (typeof child === "function") child();
    });
  }
}
LiveAPIProvider({ url: uri, apiKey: API_KEY });


const callControlBar = document.querySelector('call-control-bar');
callControlBar.addEventListener('button-click', (e) => {
  console.log('Button Clicked:', e.detail);
  handlemedia(e.detail.buttonType, e.detail.buttonState);
});
const screenCapture = new ScreenCapture();
const webcam = new WebcamCapture();
const frameExtractor = new MediaFrameExtractor({
  fps: 1, // 1 frame per second
  scale: 0.5, // 50% of original size
  quality: 0.8 // 80% JPEG quality
});
function handlemedia(buttonType, buttonState) {
  console.log("handlemedia", buttonType, buttonState);
  switch (buttonType) {
    case "mic":
      if (buttonState) {
        audioRecorder.start();
        onSubmit("eres un agente de chat, debes responder en español siempre");
        console.log("audioRecorder.start()");
      } else {
        audioRecorder.stop();
        console.log("audioRecorder.stop()");
      }
    case "screen":
      if (buttonState) {
        screenCapture.start();
        const video = document.getElementById("screen");
        screenCapture.setVideoElement(video);


      } else {
        screenCapture.stop();
      }
      break;
    case "video":
      if (buttonState) {
        webcam.start();
        const video = document.getElementById("webcam");
        webcam.setVideoElement(video);
        frameExtractor.setMediaCapture(webcam);
setTimeout(() => {
  frameExtractor.start((frame) => {
    console.log('Received frame:', frame);
    // frame object contains:
    // - data: base64 encoded JPEG
    // - width: frame width
    // - height: frame height
    // - timestamp: when the frame was captured
    // - sourceType: "webcam" or "screen"
    
    // Example: display the frame in an img element
    const img = document.createElement('img');
    img.src = `data:image/jpeg;base64,${frame.data}`;
    document.body.appendChild(img);
  });
  }, 1000);
      } else {
        webcam.stop();
      }
      break;
    default:
      break;
  }
}
const declaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};
const config = {
  model: "models/gemini-2.0-flash-exp",
  systemInstruction: {
    parts: [
      {
        text: 'You are my helpful assistant. Any time I ask you for a graph call the "render_altair" function I have provided you. Dont ask for additional information just make your best judgement.',
      },
    ],
  },
  tools: [{ googleSearch: {} }, { functionDeclarations: [declaration] }],
}
const onToolCall = (toolCall) => {
  console.log(`got toolcall`, toolCall);
  const fc = toolCall.functionCalls.find(
      (fc) => fc.name === declaration.name
  );
  if (fc) {
      const str = (fc.args).json_graph;
      setJSONString(str);
  }
  
};
const client = liveAPIContext.getLiveAPI();
console.log(client);
client.client.setConfig(config);
client.client.on("toolcall", onToolCall);
setTimeout(() => {
  liveAPI.connect();

/*   onSubmit("hola como estas, hablame en español, y dime la fecha actual en string y no en number");
 */}, 2222);
 const unsubscribescreen = screenCapture.addEventListener((state) => {
  console.log('Stream state changed:', state);
  // Update your UI here
});
const unsubscribewebcam = webcam.addEventListener((state) => {
  console.log('Webcam state changed:', state);
  // Update your UI here
}); 

export { liveAPIContext };