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
        setTimeout(() => {
                        for (let i = 0; i < this.bufferLength; i++) {
                this.dataArray[i] = Math.max(this.dataArray[i] * 1, 0);
            }
        }, 1111);
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