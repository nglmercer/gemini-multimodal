class ScreenCapture {
    constructor() {
      this.stream = null;
      this.isStreaming = false;
      this.type = "screen";
      this.eventListeners = new Set();
    }
  
    handleStreamEnded = () => {
      this.isStreaming = false;
      this.stream = null;
      // Notify listeners of state change
      this.notifyListeners();
    };
  
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
  export { ScreenCapture };
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