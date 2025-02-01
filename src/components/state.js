import { LitElement, html, css, unsafeCSS } from 'lit';

class CallControlBar extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: 'Material Symbols Outlined', sans-serif;
    }

    .control-tray {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      background-color: #2c2c2c;
      padding: 10px;
      border-radius: 10px;
      color: white;
    }

    .actions-nav {
      display: flex;
      justify-content: center;
      gap: 10px;
      opacity: 1;
      transition: opacity 0.3s;
    }

    .actions-nav.disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    .action-button {
      background: #3c3c3c;
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    .action-button:hover {
      background: #5c5c5c;
    }

    .action-button .material-symbols-outlined {
      font-size: 24px;
    }

    .connection-container {
      display: flex;
      align-items: center;
      margin: 1rem;
      
    }

    .text-indicator {
      margin-left: 10px;
    }
    .action-button.active {
      background: #5c5c5c;
    }
  `;

  static properties = {
    state: { type: String, reflect: true },
    buttonStates: { type: Object },
  };

  constructor() {
    super();
    this.state = 'inactive';
    this.buttonStates = {
      mic: false,
      video: false,
      cancelvideo: false,
      connect: false
    };
    this.activeicons = {
      "mic": "mic_off",
      "video": "hangout_video_off",
      "pause": "play_arrow",
      "connect": "play_arrow",
      "screen": "cancel_presentation"
    }
    this.inactiveicons = {
      "mic": "mic",
      "video": "videocam",
      "pause": "pause",
      "connect": "pause",
      "screen": "screen_share"
    }
  }

  // Add firstUpdated lifecycle method to set up events
  firstUpdated() {
    this.emitevent();
  }

  updated(changedProperties) {
    if (changedProperties.has('state')) {
      this.handleStateChange();
    }
  }

  handleStateChange() {
    const nav = this.shadowRoot.querySelector('.actions-nav');
    if (this.state === 'active') {
      nav.classList.remove('disabled');
    } else {
      nav.classList.add('disabled');
    }
  }

  render() {
    return html`
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
      <section class="control-tray">
        <canvas style="display: none;" width="480" height="270"></canvas>
        <nav class="actions-nav ${this.state === 'inactive' ? 'disabled' : ''}">
          ${this.getbutton("mic")}
          ${this.getbutton("video")}
          ${this.getbutton("screen")}
        </nav>
        <div class="connection-container">
          <div class="connection-button-container">
            ${this.getbutton("connect")}
          </div>
          <span class="text-indicator">${this.state === 'active' ? 'Stream' : 'Disconnected'}</span>
        </div>
      </section>
    `;
  }
  getbutton(type, icon) {
    return html`
      <button 
        class="action-button ${type}-button ${this.buttonStates[type] ? 'active' : ''}" 
        data-type="${type}"
      >
        <span class="material-symbols-outlined">
          ${this.getButtonIcon(type)}
        </span>
      </button>
    `;
  }
  emitevent() {
    const allbuttons = this.shadowRoot.querySelectorAll('button');
    allbuttons.forEach(button => {
      button.addEventListener('click', (e) => {
        const buttonType = button.getAttribute('data-type');
        
        // Toggle button state
        this.toggleButtonState(buttonType);
        
        this.dispatchEvent(new CustomEvent('button-click', {
          detail: { 
            button,
            buttonType,
            state: this.state,
            buttonState: this.buttonStates[buttonType]
          },
          bubbles: true,
          composed: true,
        }));
      });
    });
  }
  toggleButtonState(buttonType) {
    this.buttonStates = {
      ...this.buttonStates,
      [buttonType]: !this.buttonStates[buttonType]
    };
    this.requestUpdate();
  }

  getButtonIcon(type) {
    if (this.buttonStates[type]) {
      return this.activeicons[type] || type;
    }
    return this.inactiveicons[type] || type;
  }

}

customElements.define('call-control-bar', CallControlBar);