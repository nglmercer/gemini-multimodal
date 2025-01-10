import { set } from "lodash";

class AudioVisualizer extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      
      const template = `<style>
    .visualizer-container {
      width: 200px;
      height: 200px;
      position: relative;
    }
    
    canvas {
      position: absolute;
      top: 0;
      left: 0;
    }
  </style>
  
    <div class="visualizer-container">
      <canvas></canvas>
    </div>
  
  `
      this.shadowRoot.innerHTML = template;
      
      this.canvas = this.shadowRoot.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      
      // Eliminamos el contexto de audio y usamos un array simple
      this.bufferLength = 128; // Reducido a la mitad para mejor rendimiento
      this.dataArray = new Uint8Array(this.bufferLength);
      
      this.isAnimating = false;
      this.animationId = null;
      
      this.resize();
      this.setupEventListeners();
    }
    
    connectedCallback() {
      this.startVisualization();
    }
    
    disconnectedCallback() {
      this.stopVisualization();
      if (this.cleanup) {
        this.cleanup();
      }
    }
    
    resize() {
      const container = this.shadowRoot.querySelector('.visualizer-container');
      if (!container) return;
      
      const size = Math.min(container.clientWidth, container.clientHeight);
      this.canvas.width = size;
      this.canvas.height = size;
    }
    
    setupEventListeners() {
      const resizeHandler = () => this.resize();
      window.addEventListener('resize', resizeHandler);
      
      this.cleanup = () => {
        window.removeEventListener('resize', resizeHandler);
      };
    }
    
    updateData(data) {
        if (data && data.length > 0) {
            // Asegurarnos de que tenemos el número correcto de muestras
            const samples = Math.min(data.length, this.bufferLength);
            
            // Crear un nuevo Uint8Array del tamaño correcto
            const processedData = new Uint8Array(this.bufferLength);
            
            // Procesar cada muestra
            for (let i = 0; i < samples; i++) {
                // Convertir los valores de Float32 (-1 a 1) a Uint8 (0 a 255)
                // Primero normalizamos a 0-1, luego escalamos a 0-255
                const normalizedValue = (data[i] + 1) / 2;
                processedData[i] = Math.floor(normalizedValue * 255);
            }
            
            // Si hay menos muestras que this.bufferLength, rellenar el resto
            for (let i = samples; i < this.bufferLength; i++) {
                processedData[i] = 0;
            }
            
            this.dataArray = processedData;
        } else {
            // Mantener la generación de datos aleatorios como fallback
        }
    }
    
    startVisualization() {
      this.isAnimating = true;
      this.draw();
    }
    
    stopVisualization() {
      this.isAnimating = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
    }
    
    draw() {
      if (!this.ctx || !this.isAnimating) return;
      
      this.animationId = requestAnimationFrame(() => this.draw());
      
      this.updateData();
      
      const width = this.canvas.width;
      const height = this.canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 3;
      
      this.ctx.clearRect(0, 0, width, height);
      
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      
      const bars = this.bufferLength;
      const step = (Math.PI * 2) / bars;
      
      for (let i = 0; i < bars; i++) {
        const value = this.dataArray[i];
        const normalizedValue = value / 255;
        const length = radius * 0.5 * normalizedValue;
        
        const angle = step * i;
        
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + length);
        const y2 = centerY + Math.sin(angle) * (radius + length);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = `hsl(${(i / bars) * 360}, 70%, 50%)`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    }
  }
  
  customElements.define('audio-visualizer', AudioVisualizer);
  class AudioVisualizer2 extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const template = `<style>
    .visualizer-container {
        width: 200px;
        height: 200px;
        position: relative;
    }

    canvas {
        position: absolute;
        top: 0;
        left: 0;
    }
</style>

<div class="visualizer-container">
    <canvas></canvas>
</div>`;

        this.shadowRoot.innerHTML = template;

        this.canvas = this.shadowRoot.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.bufferLength = 128;
        this.dataArray = new Uint8Array(this.bufferLength);

        this.isAnimating = false;
        this.animationId = null;

        this.resize();
        this.setupEventListeners();
    }

    connectedCallback() {
        this.startVisualization();
    }

    disconnectedCallback() {
        this.stopVisualization();
        if (this.cleanup) {
            this.cleanup();
        }
    }

    resize() {
        const container = this.shadowRoot.querySelector('.visualizer-container');
        if (!container) return;

        const size = Math.min(container.clientWidth, container.clientHeight);
        this.canvas.width = size;
        this.canvas.height = size;
    }
    
    updateData(data) {
      if (data && data.length > 0) {
          const samples = Math.min(data.length, this.bufferLength);
          const processedData = new Uint8Array(this.bufferLength);

          for (let i = 0; i < samples; i++) {
              const normalizedValue = (data[i] + 1) / 2;
              processedData[i] = Math.floor(normalizedValue * 255);
          }

          for (let i = samples; i < this.bufferLength; i++) {
              processedData[i] = 0;
          }

          this.dataArray = processedData;
      }
  }
    setupEventListeners() {
        const resizeHandler = () => this.resize();
        window.addEventListener('resize', resizeHandler);

        this.cleanup = () => {
            window.removeEventListener('resize', resizeHandler);
        };
    }


    startVisualization() {
        this.isAnimating = true;
        this.draw();
    }

    stopVisualization() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    draw() {
        if (!this.ctx || !this.isAnimating) return;

        this.animationId = requestAnimationFrame(() => this.draw());

        this.updateData();

        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;

        this.ctx.clearRect(0, 0, width, height);

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        const bars = this.bufferLength;
        const step = (Math.PI * 2) / bars;

        for (let i = 0; i < bars; i++) {
            const value = this.dataArray[i];
            const normalizedValue = value / 255;
            const length = radius * 0.5 * normalizedValue;

            const angle = step * i;

            const x1 = centerX + Math.cos(angle) * (radius - length);
            const y1 = centerY + Math.sin(angle) * (radius - length);
            const x2 = centerX + Math.cos(angle) * radius;
            const y2 = centerY + Math.sin(angle) * radius;

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = `hsl(${(i / bars) * 360}, 70%, 50%)`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }
}

customElements.define('audio-visual', AudioVisualizer2);
class AudioVisualizer3 extends HTMLElement {
  constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      const template = `<style>
  .visualizer-container {
      width: 100%;
      height: 200px;
      position: relative;
      background: #1a1a1a;
      border-radius: 8px;
      padding: 20px;
      box-sizing: border-box;
  }
  canvas {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
  }
</style>
<div class="visualizer-container">
  <canvas></canvas>
</div>`;
      this.shadowRoot.innerHTML = template;
      this.canvas = this.shadowRoot.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.bufferLength = 128;
      this.dataArray = new Uint8Array(this.bufferLength);
      this.isAnimating = false;
      this.animationId = null;
      this.resize();
      this.setupEventListeners();
  }

  connectedCallback() {
      this.startVisualization();
  }

  disconnectedCallback() {
      this.stopVisualization();
      if (this.cleanup) {
          this.cleanup();
      }
  }

  resize() {
      const container = this.shadowRoot.querySelector('.visualizer-container');
      if (!container) return;
      
      // Set canvas size with a 16:9 aspect ratio
      const width = container.clientWidth - 40; // Account for padding
      const height = container.clientHeight - 40;
      this.canvas.width = width;
      this.canvas.height = height;
  }

  updateData(data) {
      if (data && data.length > 0) {
          const samples = Math.min(data.length, this.bufferLength);
          const processedData = new Uint8Array(this.bufferLength);
          for (let i = 0; i < samples; i++) {
              const normalizedValue = (data[i] + 1) / 2;
              processedData[i] = Math.floor(normalizedValue * 255);
          }
          for (let i = samples; i < this.bufferLength; i++) {
              processedData[i] = 0;
          }
          this.dataArray = processedData;
      }
  }

  draw() {
      if (!this.isAnimating) return;

      const width = this.canvas.width;
      const height = this.canvas.height;
      
      // Clear the canvas
      this.ctx.clearRect(0, 0, width, height);
      
      // Calculate bar properties
      const barWidth = (width / this.bufferLength) * 0.8; // 80% of available space per bar
      const barSpacing = (width / this.bufferLength) * 0.2; // 20% spacing
      const maxBarHeight = height * 0.8; // 80% of canvas height

      // Draw bars
      this.ctx.fillStyle = '#4CAF50'; // Modern green color
      
      for (let i = 0; i < this.bufferLength; i++) {
          const barHeight = (this.dataArray[i] / 255) * maxBarHeight;
          const x = i * (barWidth + barSpacing) + (width - this.bufferLength * (barWidth + barSpacing)) / 2;
          const y = (height - barHeight) / 2;
          
          // Create gradient for each bar
          const gradient = this.ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, '#4CAF50');
          gradient.addColorStop(1, '#2196F3');
          
          this.ctx.fillStyle = gradient;
          
          // Draw rounded rectangle
          this.ctx.beginPath();
          this.ctx.roundRect(x, y, barWidth, barHeight, [barWidth / 2]);
          this.ctx.fill();
      }

      this.animationId = requestAnimationFrame(() => this.draw());
  }

  setupEventListeners() {
      const resizeHandler = () => this.resize();
      window.addEventListener('resize', resizeHandler);
      this.cleanup = () => {
          window.removeEventListener('resize', resizeHandler);
      };
  }

  startVisualization() {
      this.isAnimating = true;
      this.draw();
  }

  stopVisualization() {
      this.isAnimating = false;
      if (this.animationId) {
          cancelAnimationFrame(this.animationId);
      }
  }
}

customElements.define('audio-visualizer-2', AudioVisualizer3);