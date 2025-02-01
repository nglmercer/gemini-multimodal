const translationTemplate = document.createElement('template');
translationTemplate.innerHTML = `
  <style>
    :host {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      max-width: 300px;
      display: none;
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
      if (length > 2) return 2000; // Menos delay si hay más elementos
      if (length <= 1) return 4000; // Más delay si hay 0-1 elementos
      return 3000; // Delay normal para 1-2 elementos
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
  }
  if (!customElements.get('translation-queue')) {
    customElements.define('translation-queue', TranslationQueue);
  }