import { LitElement, html, css, unsafeCSS } from 'lit';

class CallControlBar extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: 'Material Symbols Outlined', sans-serif;
    }

    .control-tray {
      display: flex;
      flex-direction: column;
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

    .audioPulse {
      display: flex;
      gap: 2px;
    }

    .audioPulse div {
      width: 4px;
      height: 4px;
      background: #fff;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scaleY(0.5);
      }
      50% {
        transform: scaleY(1);
      }
    }

    .connection-container {
      display: flex;
      align-items: center;
      margin-top: 10px;
    }

    .text-indicator {
      margin-left: 10px;
    }
  `;

  static properties = {
    state: { type: String, reflect: true },
  };

  constructor() {
    super();
    this.state = 'inactive';
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
          <button class="action-button mic-button">
            <span class="material-symbols-outlined filled">mic_off</span>
          </button>
          <div class="action-button no-action outlined">
            <div class="audioPulse">
              <div style="animation-delay: 0ms; height: 4px;"></div>
              <div style="animation-delay: 133ms; height: 4px;"></div>
              <div style="animation-delay: 266ms; height: 4px;"></div>
            </div>
          </div>
          <button class="action-button">
            <span class="material-symbols-outlined">cancel_presentation</span>
          </button>
          <button class="action-button">
            <span class="material-symbols-outlined">videocam</span>
          </button>
        </nav>
        <div class="connection-container">
          <div class="connection-button-container">
            <button class="action-button connect-toggle">
              <span class="material-symbols-outlined filled">${this.state === 'active' ? 'pause' : 'play_arrow'}</span>
            </button>
          </div>
          <span class="text-indicator">${this.state === 'active' ? 'Streaming' : 'Disconnected'}</span>
        </div>
      </section>
    `;
  }

  emitevent() {
    const allbuttons = this.shadowRoot.querySelectorAll('button');
    console.log(allbuttons);
    allbuttons.forEach(button => {
      button.addEventListener('click', () => {
        // Add button identifier to the event detail
        const buttonType = button.classList.contains('mic-button') ? 'mic' :
                          button.classList.contains('connect-toggle') ? 'connect' : 'other';
        
        this.dispatchEvent(new CustomEvent('button-click', {
          detail: { 
            button,
            buttonType,
            state: this.state
          },
          bubbles: true,
          composed: true,
        }));
      });
    });
  }
}

customElements.define('call-control-bar', CallControlBar);