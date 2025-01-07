import { SchemaType } from "@google/generative-ai";
import { liveAPIContext } from "./main.js";
import vegaEmbed from "vega-embed";

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
const { client } = liveAPIContext();
client.setconfig(config);
client.on("toolcall", onToolCall);
