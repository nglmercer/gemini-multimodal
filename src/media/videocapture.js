class WebcamCapture {
  constructor() {
    this.stream = null;
    this.isStreaming = false;
    this.type = "webcam";
    this.eventListeners = new Set();
    this.videoElement = null;
  }

  handleStreamEnded = () => {
    this.isStreaming = false;
    this.stream = null;
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.notifyListeners();
  };

  setVideoElement(element) {
    if (!(element instanceof HTMLVideoElement)) {
      throw new Error('Element must be an HTMLVideoElement');
    }
    this.videoElement = element;
    
    // If there's an active stream, set it immediately
    if (this.stream) {
      this.videoElement.srcObject = this.stream;
      
      // Handle autoplay
      this.videoElement.play().catch(error => {
        console.error('Error playing video:', error);
      });
    }
  }

  addEventListener(callback) {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  notifyListeners() {
    const state = {
      stream: this.stream,
      isStreaming: this.isStreaming,
      type: this.type
    };
    this.eventListeners.forEach(callback => callback(state));
  }

  async start() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      this.stream = mediaStream;
      this.isStreaming = true;
      
      // If video element is set, update it with the new stream
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
      }

      // Add ended event listeners to all tracks
      this.stream.getTracks().forEach(track => {
        track.addEventListener('ended', this.handleStreamEnded);
      });
      this.notifyListeners();
      return mediaStream;
    } catch (error) {
      console.error('Error starting webcam capture:', error);
      throw error;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.removeEventListener('ended', this.handleStreamEnded);
        track.stop();
      });
      if (this.videoElement) {
        this.videoElement.srcObject = null;
      }
      this.stream = null;
      this.isStreaming = false;
      this.notifyListeners();
    }
  }

  getState() {
    return {
      type: this.type,
      start: this.start.bind(this),
      stop: this.stop.bind(this),
      isStreaming: this.isStreaming,
      stream: this.stream
    };
  }
}

class ScreenCapture {
  constructor() {
    this.stream = null;
    this.isStreaming = false;
    this.type = "screen";
    this.eventListeners = new Set();
    this.videoElement = null;
  }

  handleStreamEnded = () => {
    this.isStreaming = false;
    this.stream = null;
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.notifyListeners();
  };

  setVideoElement(element) {
    if (!(element instanceof HTMLVideoElement)) {
      throw new Error('Element must be an HTMLVideoElement');
    }
    this.videoElement = element;
    
    // If there's an active stream, set it immediately
    if (this.stream) {
      this.videoElement.srcObject = this.stream;
      
      // Handle autoplay
      this.videoElement.play().catch(error => {
        console.error('Error playing video:', error);
      });
    }
  }

  addEventListener(callback) {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  notifyListeners() {
    const state = {
      stream: this.stream,
      isStreaming: this.isStreaming,
      type: this.type
    };
    this.eventListeners.forEach(callback => callback(state));
  }

  async start() {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      this.stream = mediaStream;
      this.isStreaming = true;
      
      // If video element is set, update it with the new stream
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
      }

      // Add ended event listeners to all tracks
      this.stream.getTracks().forEach(track => {
        track.addEventListener('ended', this.handleStreamEnded);
      });
      this.notifyListeners();
      return mediaStream;
    } catch (error) {
      console.error('Error starting screen capture:', error);
      throw error;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.removeEventListener('ended', this.handleStreamEnded);
        track.stop();
      });
      if (this.videoElement) {
        this.videoElement.srcObject = null;
      }
      this.stream = null;
      this.isStreaming = false;
      this.notifyListeners();
    }
  }

  getState() {
    return {
      type: this.type,
      start: this.start.bind(this),
      stop: this.stop.bind(this),
      isStreaming: this.isStreaming,
      stream: this.stream
    };
  }
}
class MediaFrameExtractor {
  constructor(options = {}) {
    this.fps = options.fps || 0.5;
    this.scale = options.scale || 0.25;
    this.quality = options.quality || 1.0;
    this.timeoutId = null;
    this.isActive = false;
    this.mediaCapture = null;

    // Create canvas for frame extraction
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  setMediaCapture(capture) {
    if (!(capture instanceof WebcamCapture || capture instanceof ScreenCapture)) {
      throw new Error('Invalid media capture instance');
    }

    // Stop current extraction if active
    this.stop();
    
    this.mediaCapture = capture;
    
    // Add event listener to handle stream changes
    this.unsubscribe = this.mediaCapture.addEventListener((state) => {
      if (!state.isStreaming) {
        this.stop();
      }
    });
  }

  start(frameCallback) {
    if (!this.mediaCapture || !this.mediaCapture.stream) {
      throw new Error('No media stream available');
    }

    this.isActive = true;

    // Get the video track settings to set initial canvas size
    const videoTrack = this.mediaCapture.stream.getVideoTracks()[0];
    const { width, height } = videoTrack.getSettings();

    // Set canvas size based on scale
    this.canvas.width = width * this.scale;
    this.canvas.height = height * this.scale;

    const extractFrame = () => {
      if (!this.isActive || !this.mediaCapture.isStreaming) return;

      // Create a video element for the current frame
      const video = document.createElement('video');
      video.srcObject = this.mediaCapture.stream;
      video.play().then(() => {
        // Draw the frame
        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Convert to base64 JPEG
        const base64 = this.canvas.toDataURL('image/jpeg', this.quality);
        const data = base64.slice(base64.indexOf(',') + 1);
        
        // Send frame to callback
        frameCallback({
          mimeType: 'image/jpeg',
          data: data,
          width: this.canvas.width,
          height: this.canvas.height,
          timestamp: Date.now(),
          sourceType: this.mediaCapture.type
        });

        // Clean up video element
        video.pause();
        video.srcObject = null;

        // Schedule next frame
        if (this.isActive) {
          this.timeoutId = window.setTimeout(
            extractFrame,
            1000 / this.fps
          );
        }
      }).catch(error => {
        console.error('Error capturing frame:', error);
        this.stop();
      });
    };

    // Start the extraction loop
    extractFrame();
  }

  stop() {
    this.isActive = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  setOptions(options = {}) {
    this.fps = options.fps ?? this.fps;
    this.scale = options.scale ?? this.scale;
    this.quality = options.quality ?? this.quality;
  }

  getState() {
    return {
      isActive: this.isActive,
      fps: this.fps,
      scale: this.scale,
      quality: this.quality,
      sourceType: this.mediaCapture?.type || null
    };
  }
}
class VideoContainerManager {
  constructor() {
      this.videoWrappers = document.querySelectorAll('.video-wrapper');
      this.videoContainerGrid = document.querySelector('.video-container-grid');
      this.activeVideoSources = new Set();
  }

  updateContainerVisibility() {
      // Si no hay fuentes de video activas, ocultar el contenedor
      if (this.activeVideoSources.size === 0) {
          this.videoContainerGrid.classList.add('hidden');
      } else {
          this.videoContainerGrid.classList.remove('hidden');
      }

      // Ocultar wrappers individuales que no están activos
      this.videoWrappers.forEach(wrapper => {
          const videoId = wrapper.querySelector('video').id;
          if (!this.activeVideoSources.has(videoId)) {
              wrapper.classList.add('hidden');
          } else {
              wrapper.classList.remove('hidden');
          }
      });
  }

  addActiveVideoSource(sourceId) {
      this.activeVideoSources.add(sourceId);
      this.updateContainerVisibility();
  }

  removeActiveVideoSource(sourceId) {
      this.activeVideoSources.delete(sourceId);
      this.updateContainerVisibility();
  }
}
/* const screenCapture = new ScreenCapture();

// Add state change listener
const unsubscribe = screenCapture.addEventListener((state) => {
console.log('Stream state changed:', state);
// Update your UI here
});

// Start capturing
try {
await screenCapture.start();
} catch (error) {
console.error('Failed to start capture:', error);
}

// Stop capturing
screenCapture.stop();

// Remove listener when done
unsubscribe(); */
export { ScreenCapture, WebcamCapture, MediaFrameExtractor,VideoContainerManager };
// Create an instance
/* const webcam = new WebcamCapture();

// Add state change listener
const unsubscribe = webcam.addEventListener((state) => {
  console.log('Webcam state changed:', state);
  // Update your UI here
});

// Start webcam
try {
  await webcam.start();
} catch (error) {
  console.error('Failed to start webcam:', error);
}

// Stop webcam
webcam.stop();

// Remove listener when done
unsubscribe(); */