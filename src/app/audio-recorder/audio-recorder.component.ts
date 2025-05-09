import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-audio-recorder',
  templateUrl: './audio-recorder.component.html',
  styleUrls: ['./audio-recorder.component.css']
})
export class AudioRecorderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('waveformCanvas') waveformCanvas!: ElementRef<HTMLCanvasElement>;

  mediaRecorder: any;
  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  stream: MediaStream | null = null;
  animationFrame: number | null = null;

  chunks: any[] = [];
  audioUrl: string | null = null;
  seconds: number = 0;
  interval: any;
  isRecording: boolean = false;
  isPlaying: boolean = false;
  audio: HTMLAudioElement | null = null;
  isProcessing: boolean = false;

  readonly MAX_RECORDING_TIME = 30; // Set maximum recording time to 30 seconds

  ngAfterViewInit() {
    // Canvas will be initialized when recording starts
  }

  ngOnDestroy() {
    this.cleanupRecording();
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }

  async startRecording() {
    this.resetState();

    try {
      // Get audio stream
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio context and analyser for visualization
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);

      // Configure analyser for better visualization
      this.analyser.fftSize = 128; // Smaller for better performance and visibility
      this.analyser.smoothingTimeConstant = 0.5; // Less smoothing for more reactive display

      // Set up media recorder
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.chunks = [];

      this.mediaRecorder.ondataavailable = (e: any) => this.chunks.push(e.data);
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.audioUrl = URL.createObjectURL(blob);
        this.cleanupRecording();
        this.prepareAudioElement();
        this.isProcessing = false; // Hide processing state

        setTimeout(() => {
          this.isRecording = false;
        });
      };

      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;

      // Start timer
      this.interval = setInterval(() => {
        this.seconds++;
        if (this.seconds >= this.MAX_RECORDING_TIME) { // Auto-stop after 30 seconds
          this.stopRecording();
        }
      }, 1000);

      // Give a slight delay to ensure canvas is ready
      setTimeout(() => {
        this.visualize();
      }, 100);

    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Unable to access microphone. Please check permissions.');
      this.resetState();
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.isRecording = false;
      this.isProcessing = true; // Show processing state
      clearInterval(this.interval);

      this.mediaRecorder.requestData();
      this.mediaRecorder.stop();
    }
  }

  playRecording() {
    if (this.audioUrl) {
      if (!this.audio) {
        this.prepareAudioElement();
      }

      if (this.audio) {
        if (this.isPlaying) {
          this.audio.pause();
          this.audio.currentTime = 0;
          this.isPlaying = false;
        } else {
          this.audio.play().then(() => {
            this.isPlaying = true;
          }).catch(err => {
            console.error('Error playing audio:', err);
          });

          // Listen for playback end
          this.audio.onended = () => {
            this.isPlaying = false;
          };
        }
      }
    }
  }

  private prepareAudioElement() {
    if (this.audioUrl) {
      this.audio = new Audio(this.audioUrl);
    }
  }

  cancel() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.audioUrl = null;
    this.seconds = 0;
    this.isPlaying = false;
  }

  private resetState() {
    this.cleanupRecording();
    this.isRecording = false;
    this.isPlaying = false;
    this.seconds = 0;
    this.audioUrl = null;
    this.chunks = [];
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }

  private cleanupRecording() {
    // Stop the animation
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Clear the interval
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Stop all tracks in the stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(err => console.error('Error closing AudioContext:', err));
    }

    this.analyser = null;
  }

  private visualize() {
    if (!this.analyser || !this.waveformCanvas || !this.isRecording) {
      return;
    }

    const canvas = this.waveformCanvas.nativeElement;
    const canvasCtx = canvas.getContext('2d');

    if (!canvasCtx) return;

    // Ensure canvas has actual dimensions to render on
    canvas.width = canvas.clientWidth || 300;
    canvas.height = canvas.clientHeight || 80;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isRecording || !this.analyser || !canvasCtx) return;

      this.animationFrame = requestAnimationFrame(draw);

      this.analyser.getByteFrequencyData(dataArray);

      // Clear the canvas with a subtle background
      canvasCtx.fillStyle = 'rgba(248, 249, 250, 0.3)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // For better visibility on light backgrounds
      canvasCtx.fillStyle = 'rgba(233, 30, 99, 0.1)'; // Very light pink background
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = Math.max(2, (canvas.width / bufferLength) * 2);
      let x = 0;

      // Draw stronger, more visible bars
      for (let i = 0; i < bufferLength; i++) {
        // Make visualization more dramatic by amplifying values
        const amplification = 1.5; // Increase visibility
        let barHeight = Math.min((dataArray[i] / 255) * canvas.height * amplification, canvas.height);

        // Ensure a minimum height for visual interest
        barHeight = Math.max(barHeight, 2);

        // Stronger coloring for better visibility
        const hue = 350 - (i / bufferLength) * 40; // More in the pink/red range
        canvasCtx.fillStyle = `hsla(${hue}, 90%, 60%, 0.9)`; // More saturated, less transparent

        // Center the bars vertically
        const yPos = (canvas.height - barHeight) / 2;
        canvasCtx.fillRect(x, yPos, barWidth - 1, barHeight); // Small gap between bars

        x += barWidth;
      }
    };

    draw();
  }
}