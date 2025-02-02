// import components
import { values } from 'lodash';
import './components/translateQ.js';
import { Emitter } from './utils.js';
document.querySelector('#app').innerHTML = `
  <div class="container mx-auto">
  <audio-stream-player id="voiceplayer"></audio-stream-player>
    <call-control-bar state="active"></call-control-bar>
    </div>
`;
const queue = document.createElement('translation-queue');
document.body.appendChild(queue);
const Emittertranslation = new Emitter('translation');
Emittertranslation.on('translation', translation => {
  console.log('Translation received:', translation);
  queue.addToQueue(translation);
});
// texto de prueba para mostrar en la lista
queue.addToQueue({ input: 'Hola', traducciones: { es: 'Hola', en: 'Hello' } });

// 
// Constantes y configuración inicial
const MAIN_INSTRUCTION = "Eres una IA de traducción. Tu tarea es recibir un texto en español y devolver un JSON con las traducciones al inglés y japonés. O también, si no se entiende o se hacen gestos, acciones o onomatopeyas, puedes narrarlo en el formato deseado.";
const INPUT_TEXT = "<texto original en español usando muchos términos en inglés también>";
const TRANSLATIONS = [
  { label: "traducción al español", value: "es" },
  { label: "traducción al inglés", value: "en" },
  { label: "traducción al japonés", value: "jp" },
  { label: "traducción al portugués", value: "pt" },
  { label: "traducción al francés", value: "fr" },
  { label: "traducción al italiano", value: "it" },
];

// Función para generar el string de instrucciones
function generateInstructionsString(mainInstruction, inputText, translations) {
  return `
${mainInstruction}
Formato de salida:  
{  
  "input": "${inputText}",
  "traducciones": {
    ${translations.map(t => `"${t.value}": "${t.label}"`).join(',\n')}
  }  
}`;
}

// Función para obtener los datos actualizados del localStorage
function getUpdatedInstructions() {
  const mainInstruction = localStorage.getItem("mainInstruction") || MAIN_INSTRUCTION;
  const inputText = localStorage.getItem("inputText") || INPUT_TEXT;
  const translations = JSON.parse(localStorage.getItem("translations")) || TRANSLATIONS;
  return generateInstructionsString(mainInstruction, inputText, translations);
}

// Creación del modal y configuración inicial
function createModal() {
  const modal = document.createElement('custom-modal');
  modal.id = "modal_content";
  modal.innerHTML = `
    <custom-input
      type="text"
      id="apikey"
      name="apikey"
      value="${localStorage.getItem("API_KEY") || ''}"
      placeholder="API Key"
    ></custom-input>
    <custom-input
      type="textarea"
      id="mainInstruction"
      name="mainInstruction"
      value="${localStorage.getItem("configAPI")?.mainInstruction || MAIN_INSTRUCTION}"
      placeholder="Main Instruction"
    ></custom-input>
    <custom-input
      type="textarea"
      id="inputText"
      name="inputText"
      value="${localStorage.getItem("inputText") || INPUT_TEXT}"
      placeholder="Input Text Prompt"
    ></custom-input>
    <enhanced-select multiple
      style="border: 0px;"
      id="select_servers"
      name="select_servers"
    ></enhanced-select>
  `;
  document.body.appendChild(modal);

  setTimeout(() => {
    //modal.open();
    const selectServers = document.querySelector('#select_servers');
    selectServers.setOptions(TRANSLATIONS);
    const lastData = localStorage.getItem("configAPI");
    if (lastData) {
      console.log("lastData", JSON.parse(lastData));
      const jsonData = JSON.parse(lastData);
      setPromptData(jsonData);
    }
  }, 1000);
  document.querySelectorAll('custom-input').forEach(input => {
    input.addEventListener('input-change', () => {
      updateAPIconfig();


    });
    document.querySelector('#select_servers').addEventListener('change', () => {
      updateAPIconfig();
    });
  });
  
}
function updateAPIconfig(){
  const data = getPromptData();
  localStorage.setItem("configAPI", JSON.stringify(data));
  const updatedInstructions = getUpdatedInstructions();
  console.log(updatedInstructions);
}
// Función para obtener los datos del formulario
function getPromptData() {
  return {
    apikey: document.querySelector('#apikey').getInputValues(),
    mainInstruction: document.querySelector('#mainInstruction').getInputValues(),
    inputText: document.querySelector('#inputText').getInputValues(),
    selectServers: document.querySelector('#select_servers').getSelectedOptions(),
    selectValue: document.querySelector('#select_servers').getValue(),
    MAIN_INSTRUCTION: getUpdatedInstructions()
  };
}

// Función para establecer los datos del formulario
function setPromptData(data) {
  console.log("setPromptData", data.mainInstruction);
  document.querySelector('#apikey').setInputValues(data.apikey);
  document.querySelector('#mainInstruction').setInputValues(data.mainInstruction || localStorage.getItem("configAPI")?.mainInstruction || MAIN_INSTRUCTION);
  document.querySelector('#inputText').setInputValues(data.inputText);
  if (data.selectValue) {
    console.log("data.selectServers", data.selectValue);
    document.querySelector('#select_servers').setSelectedValues(data.selectValue);
  }
}

// Event listeners para actualizar el localStorage

// Inicialización
createModal();