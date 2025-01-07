import './style.css';
import { tw } from 'twind';
import { LocalStorageManager } from './utils.js';
import './components/todoc.js';
import './components/TodoForm.js';
import'./components/state.js';
import { EventEmitter } from "eventemitter3";
import { difference } from "lodash";
import { blobToJSON, base64ToArrayBuffer,functions1 } from "./utils";
import {AudioRecorder, useLiveAPI} from './media/audiorecorder.js';
import { MultimodalLiveClient } from "./clientemit.js";
import { SchemaType } from "@google/generative-ai";
import { live } from 'lit/directives/live.js';

const audioRecorder = new AudioRecorder();
audioRecorder.start();
audioRecorder.on("data", (data) => {
  onData(data);
});
const onData = (base64) => {
  client.
  client.sendRealtimeInput([
    {
      mimeType: "audio/pcm;rate=16000",
      data: base64,
    },
  ]);
};
const {
  ClientContentMessage,
  isInterrupted,
  isModelTurn,
  isServerContentMessage,
  isSetupCompleteMessage,
  isToolCallCancellationMessage,
  isToolCallMessage,
  isTurnComplete} = functions1;
const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (typeof API_KEY !== "string") {  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");} else {
  console.log("API_KEY:", API_KEY);
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

  async initializeAudioStreamer() {
    if (!this.audioStreamer) {
      const audioCtx = await audioContext({ id: "audio-out" });
      this.audioStreamer = new AudioStreamer(audioCtx);

      await this.audioStreamer.addWorklet("vumeter-out", VolMeterWorket, (ev) => {
        this.volume = ev.data.volume;
        console.log("Current Volume:", this.volume);
      });
    }
  }

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

  detachClientListeners() {
    this.client.off("close").off("interrupted").off("audio");
  }

  async connect() {
    if (!this.config) {
      throw new Error("Configuration has not been set");
    }

    this.client.disconnect();
    await this.client.connect(this.config);
    this.connected = true;
    console.log("Connected successfully!",this.config);
  }

  async disconnect() {
    this.client.disconnect();
    this.connected = false;
    console.log("Disconnected successfully.");
  }

  setConfig(config) {
    this.config = config;
  }

  getConfig() {
    return this.config;
  }

  getVolume() {
    return this.volume;
  }

  isConnected() {
    return this.connected;
  }
}


const liveAPI = new MultimodalLiveAPI({ url: uri, apiKey: API_KEY });
setTimeout(() => {
  liveAPI.connect();
}, 1000);

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
document.querySelector('#app').innerHTML = `
  <div class="container mx-auto py-8">
    <call-control-bar state="active"></call-control-bar>
    </div>
`;
/// test section
const callControlBar = document.querySelector('call-control-bar');
callControlBar.addEventListener('button-click', (e) => {
  console.log('Button Clicked:', e.detail);
});
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
client.setConfig(config);
client.client.on("toolcall", onToolCall);
export { liveAPIContext };