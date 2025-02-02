// import components
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

queue.addToQueue({ input: 'Hola', traducciones: { es: 'Hola', en: 'Hello' } });