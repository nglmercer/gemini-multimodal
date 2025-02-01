class AudioVisualizer extends HTMLElement {
    static get observedAttributes() {
        return ['mode', 'primary-color', 'background', 'secondary-color'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open', delegatesFocus: true });
        this.visualizers = new Map();
        this.currentVisualizer = null;
        this.particles = [];
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.modes = ['wave', 'bars', 'circles', 'particles', 'plasma', 'mirror-wave', 'hexagons',"centered-bars","floating-bars"];
        this.currentMode = 'wave';
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    --primary-color: gray;
                    --secondary-color: #ff00ff;
                    --background: #1a1a1a;
                    --bar-width: 4px;
                    --glow-intensity: 0.8;
                    display: block;
                }
                
                canvas {
                    width: 100%;
                    height: 200px;
                    background: inherit;
                    transition: background 0.3s ease;
                }
            </style>
            <canvas></canvas>
        `;
        
        this.canvas = this.shadowRoot.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.registerVisualizers();
        this.resize();
    }

    registerVisualizers() {
        this.registerVisualizer('wave', WaveVisualizer);
        this.registerVisualizer('bars', BarsVisualizer);
        this.registerVisualizer('centered-bars', CenteredBarsVisualizer);
        this.registerVisualizer('floating-bars', FloatingBarsVisualizer);
        this.registerVisualizer('circles', CirculeVisualizer);
        this.registerVisualizer('pulse', PulseVisualizer); // ← Nuevo visualizador
        // Registrar otros visualizadores aquí...
    }
    startVisualization() {
        this.isAnimating = true;
        this.draw();
    }

    stopVisualization() {
        this.isAnimating = false;
    }
    registerVisualizer(name, visualizerClass) {
        this.visualizers.set(name, new visualizerClass(this));
    }

    connectedCallback() {
        this.resizeObserver.observe(this.canvas);
        this.setMode(this.getAttribute('mode') || 'wave');
        this.startVisualization();
    }

    disconnectedCallback() {
        this.stopVisualization();
        this.resizeObserver.disconnect();
    }
    updateData(dataArray) {
        if (!dataArray) return;
        this.dataArray = dataArray;
        this.draw();
    }
    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'mode' && this.modes.includes(newVal)) {
            this.currentMode = newVal;
            this.setMode(newVal); // ← Llamar a setMode en lugar de asignar directamente
        }
        if (name === 'primary-color') {
            this.style.setProperty('--primary-color', newVal);
        }
        if (name === 'background') {
            this.style.setProperty('--background', newVal);
        }
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth * 2;
        this.canvas.height = this.canvas.clientHeight * 2;
    }


    draw() {
        if (!this.dataArray || !this.currentVisualizer) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.currentVisualizer.draw(this.dataArray);
        requestAnimationFrame(() => this.draw());
    }

    setMode(mode) {
        if (this.visualizers.has(mode)) {
            this.currentVisualizer = this.visualizers.get(mode);
            this.currentVisualizer.init();
            this.currentMode = mode; // ← ¡Importante!
        }
    }
}

// Clase base para visualizadores
class BaseVisualizer {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.ctx = visualizer.ctx;
        this.canvas = visualizer.canvas;
    }

    init() {}
    draw() {}
}

// Implementación de visualizadores específicos
class WaveVisualizer extends BaseVisualizer {
    draw(dataArray) {
        const { ctx, canvas } = this;
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = getComputedStyle(this.visualizer).getPropertyValue('--primary-color');

        const sliceWidth = canvas.width / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            
            x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }
}

class BarsVisualizer extends BaseVisualizer {
    draw(dataArray) {
        const { ctx, canvas } = this;
        const barWidth = (canvas.width / dataArray.length) * 0.8;
        const spacing = (canvas.width / dataArray.length) * 0.2;
        let x = 0;

        ctx.fillStyle = getComputedStyle(this.visualizer).getPropertyValue('--primary-color');

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + spacing;
        }
    }
}

class CenteredBarsVisualizer extends BaseVisualizer {
    draw(dataArray) {
        const { ctx, canvas } = this;
        const centerY = canvas.height / 2;
        const barWidth = (canvas.width / dataArray.length) * 0.6;
        const spacing = (canvas.width / dataArray.length) * 0.4;
        let x = 0;

        ctx.fillStyle = getComputedStyle(this.visualizer).getPropertyValue('--primary-color');

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * centerY;
            ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
            x += barWidth + spacing;
        }
    }
}

class FloatingBarsVisualizer extends BaseVisualizer {
    init() {
        this.floatOffsets = new Array(128).fill(0);
    }

    draw(dataArray) {
        const { ctx, canvas } = this;
        const centerY = canvas.height / 2;
        const barWidth = (canvas.width / dataArray.length) * 0.8;
        const spacing = (canvas.width / dataArray.length) * 0.2;
        let x = 0;

        ctx.fillStyle = getComputedStyle(this.visualizer).getPropertyValue('--primary-color');

        for (let i = 0; i < dataArray.length; i++) {
            const height = (dataArray[i] / 255) * centerY;
            this.floatOffsets[i] = (this.floatOffsets[i] + 0.02) % (Math.PI * 2);
            const floatOffset = Math.sin(this.floatOffsets[i]) * 10;
            
            ctx.fillRect(
                x, 
                centerY - height + floatOffset, 
                barWidth, 
                height
            );
            x += barWidth + spacing;
        }
    }
}
class CirculeVisualizer extends BaseVisualizer {
    init() {
        this.rotation = 0;
        this.history = new Array(60).fill(0); // Historial de promedios
    }

    draw(dataArray) {
        const { ctx, canvas } = this;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(canvas.width, canvas.height) * 0.4;
        
        // Calcular promedio actual
        const currentAvg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        this.history.push(currentAvg);
        this.history.shift();

        // Fondo reactivo
        ctx.fillStyle = getComputedStyle(this.visualizer).getPropertyValue('--background');
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Círculo principal pulsante
        ctx.beginPath();
        ctx.strokeStyle = getComputedStyle(this.visualizer).getPropertyValue('--primary-color');
        ctx.lineWidth = 4;
        ctx.arc(
            centerX,
            centerY,
            maxRadius * (currentAvg / 255) * 0.8,
            0,
            Math.PI * 2
        );
        ctx.stroke();

        // Anillos de frecuencia
        const angleStep = (Math.PI * 2) / dataArray.length;
        this.rotation += 0.002;
        
        dataArray.forEach((value, i) => {
            const angle = angleStep * i + this.rotation;
            const radius = (value / 255) * maxRadius * 0.4;
            
            ctx.beginPath();
            ctx.fillStyle = `hsla(${(i / dataArray.length) * 360}, 70%, 50%, 0.7)`;
            ctx.arc(
                centerX + Math.cos(angle) * maxRadius * 0.6,
                centerY + Math.sin(angle) * maxRadius * 0.6,
                radius,
                0,
                Math.PI * 2
            );
            ctx.fill();
        });

        // Efecto de onda de historial
        ctx.strokeStyle = getComputedStyle(this.visualizer).getPropertyValue('--secondary-color');
        ctx.beginPath();
        this.history.forEach((val, i) => {
            const x = (canvas.width / this.history.length) * i;
            const y = canvas.height - (val / 255) * canvas.height;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
}
class PulseVisualizer extends BaseVisualizer {
    draw(dataArray) {
        const { ctx, canvas } = this;
        const maxBarHeight = canvas.height / 2; // Altura máxima de las barras
        const primaryColor = getComputedStyle(this.visualizer).getPropertyValue('--primary-color');

        // Calcular el ancho de cada barra y el espacio entre ellas
        const totalGapWidth = 2 * (dataArray.length - 1); // Espacio total entre barras (2px de gap entre cada barra)
        const totalBarWidth = canvas.width - totalGapWidth; // Ancho total disponible para las barras
        const barWidth = totalBarWidth / dataArray.length; // Ancho de cada barra

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * maxBarHeight;

            // Posición horizontal de la barra
            const x = i * (barWidth + 2); // 2px de espacio entre barras

            // Dibujar la barra
            ctx.fillStyle = primaryColor;
            ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth, barHeight);
        }
    }
}
// Registrar el custom element
customElements.define('audio-visualizer', AudioVisualizer);