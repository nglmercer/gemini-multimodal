const translationTemplate = document.createElement('template');
translationTemplate.innerHTML = `
  <style>
    :host {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--background, rgba(0,0,0,0.8));
      color: var(--color, white);
      padding: 15px;
      border-radius: 8px;
      max-width: 300px;
      display: none;
      z-index: 1000;
    }
    
    .original {
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .translation {
      margin-top: 5px;
      opacity: 0.9;
    }
  </style>
  <div class="original"></div>
  <div class="translations"></div>
`;

export class TranslationQueue extends HTMLElement {
  constructor() {
      super();
      this._queue = [];
      this._current = null;
      this._timeoutId = null;

      const shadowRoot = this.attachShadow({ mode: 'open' });
      shadowRoot.appendChild(translationTemplate.content.cloneNode(true));
  }

  get delay() {
      const length = this._queue.length;
      const currentSize = this._calculateSize(this._current);

      // Ajustar el delay en función del tamaño del objeto o texto
      let baseDelay;
      if (length > 2) {
          baseDelay = 1000; // Menos delay si hay más elementos
      } else if (length <= 1) {
          baseDelay = 1500; // Más delay si hay 0-1 elementos
      } else {
          baseDelay = 2500; // Delay normal para 1-2 elementos
      }

      // Aumentar el delay en función del tamaño del objeto o texto
      const sizeFactor = currentSize / 100; // Ajusta este factor según sea necesario
      console.log("sizeFactor",baseDelay + sizeFactor * 1000);
      return baseDelay + sizeFactor * 1000; // Aumenta el delay en 1 segundo por cada 1000 caracteres
  }

  _calculateSize(item) {
      if (!item) return 0;

      // Si es un objeto, convertirlo a JSON y calcular la longitud
      if (typeof item === 'object') {
          return JSON.stringify(item).length;
      }

      // Si es texto, calcular la longitud directamente
      return item.length;
  }

  addToQueue(translation) {
      this._queue.push(translation);
      if (!this._current) this._processQueue();
  }

  _processQueue() {
      if (this._timeoutId) clearTimeout(this._timeoutId);

      if (this._queue.length === 0) {
          this._current = null;
          this.shadowRoot.host.style.display = 'none';
          return;
      }

      this._current = this._queue.shift();
      this._displayCurrent();

      this._timeoutId = setTimeout(() => this._processQueue(), this.delay);
  }

  _displayCurrent() {
      this.shadowRoot.host.style.display = 'block';
      const original = this.shadowRoot.querySelector('.original');
      const translations = this.shadowRoot.querySelector('.translations');

      original.textContent = this._current.input;
      translations.innerHTML = Object.entries(this._current.traducciones)
          .map(([lang, text]) => `<div class="translation"><strong>${lang}:</strong> ${text}</div>`)
          .join('');
  }

  // Método para cambiar el color del texto
  setColor(color) {
      this.setAttribute('color', color);
      this.shadowRoot.host.style.setProperty('--color', color);
  }

  // Método para cambiar el fondo
  setBackground(background) {
      this.setAttribute('background', background);
      this.shadowRoot.host.style.setProperty('--background', background);
  }
}

if (!customElements.get('translation-queue')) {
  customElements.define('translation-queue', TranslationQueue);
}