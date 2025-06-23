import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

// Interface for streaming configuration
export interface StreamConfig {
  deviceId: string;
  rtmpUrl: string;
  rtmpStreamKey: string;
  audioBitrate?: string;
  audioCodec?: string;
}

// Interface for streaming error
export interface StreamingError {
  code: string;
  message: string;
  isFatal: boolean;
}

// Interface for stream status
export interface StreamStatus {
  status: 'Idle' | 'Connecting' | 'Streaming' | 'Stopping' | 'Stopped' | 'Error';
  duration: number | null;
  error: StreamingError | null;
}

/**
 * Controls FFmpeg process for audio streaming
 */
export class FFmpegController {
  private static instance: FFmpegController;
  private ffmpegProcess: ChildProcess | null = null;
  private streamStartTime: number | null = null;
  private status: StreamStatus = {
    status: 'Idle',
    duration: null,
    error: null
  };
  private logListeners: ((log: string) => void)[] = [];
  private statusListeners: ((status: StreamStatus) => void)[] = [];

  /**
   * Get the singleton instance
   */
  public static getInstance(): FFmpegController {
    if (!FFmpegController.instance) {
      FFmpegController.instance = new FFmpegController();
    }
    return FFmpegController.instance;
  }

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get FFmpeg executable path based on platform
   */
  private async getFFmpegPath(): Promise<string> {
    const platform = os.platform();
    let ffmpegPath: string;

    // Check if FFmpeg is bundled with the app
    if (app.isPackaged) {
      // In packaged app, FFmpeg should be in resources directory
      const resourcePath = process.resourcesPath;
      
      switch (platform) {
        case 'win32':
          ffmpegPath = path.join(resourcePath, 'ffmpeg', 'win', 'ffmpeg.exe');
          break;
        case 'darwin':
          ffmpegPath = path.join(resourcePath, 'ffmpeg', 'mac', 'ffmpeg');
          break;
        case 'linux':
          ffmpegPath = path.join(resourcePath, 'ffmpeg', 'linux', 'ffmpeg');
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      
      // Check if the bundled FFmpeg exists
      try {
        await fs.promises.access(ffmpegPath, fs.constants.X_OK);
        return ffmpegPath;
      } catch (error) {
        console.warn(`Bundled FFmpeg not found at ${ffmpegPath}, falling back to system FFmpeg`);
      }
    }
    
    // Fall back to system FFmpeg
    return platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  }

  /**
   * Build FFmpeg command arguments for streaming
   */
  private buildFFmpegArgs(config: StreamConfig): string[] {
    const platform = os.platform();
    const args: string[] = [];
    
    // Input device selection
    switch (platform) {
      case 'win32':
        // Windows: DirectShow
        args.push('-f', 'dshow', '-i', `audio=${config.deviceId}`);
        break;
      case 'darwin':
        // macOS: AVFoundation
        args.push('-f', 'avfoundation', '-i', config.deviceId);
        break;
      case 'linux':
        // Linux: ALSA
        args.push('-f', 'alsa', '-i', config.deviceId);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
    
    // Audio codec and bitrate
    args.push(
      '-c:a', config.audioCodec || 'aac',
      '-b:a', config.audioBitrate || '128k',
      '-ar', '44100', // Sample rate
      '-ac', '2',     // Stereo
      '-f', 'flv'     // Output format
    );
    
    // Output URL
    const streamUrl = `${config.rtmpUrl}/${config.rtmpStreamKey}`;
    args.push(streamUrl);
    
    return args;
  }

  /**
   * Start streaming with the given configuration
   */
  public async startStream(config: StreamConfig): Promise<void> {
    // Check if already streaming
    if (this.ffmpegProcess) {
      throw {
        code: 'ALREADY_STREAMING',
        message: 'Stream is already running',
        isFatal: false
      };
    }
    
    try {
      // Update status
      this.updateStatus('Connecting');
      
      // Get FFmpeg path
      const ffmpegPath = await this.getFFmpegPath();
      
      // Build arguments
      const args = this.buildFFmpegArgs(config);
      
      // Log the command (with stream key redacted)
      const logArgs = [...args];
      const streamKeyIndex = logArgs.length - 1;
      const redactedUrl = logArgs[streamKeyIndex].replace(config.rtmpStreamKey, '***REDACTED***');
      logArgs[streamKeyIndex] = redactedUrl;
      this.log(`Starting FFmpeg with command: ${ffmpegPath} ${logArgs.join(' ')}`);
      
      // Spawn FFmpeg process
      this.ffmpegProcess = spawn(ffmpegPath, args);
      this.streamStartTime = Date.now();
      
      // Handle stdout
      this.ffmpegProcess.stdout!.on('data', (data) => {
        this.log(`FFmpeg stdout: ${data.toString()}`);
      });
      
      // Handle stderr
      this.ffmpegProcess.stderr!.on('data', (data) => {
        const output = data.toString();
        this.log(`FFmpeg stderr: ${output}`);
        
        // Check for common error patterns
        if (output.includes('Connection refused') || output.includes('Failed to connect')) {
          this.handleError({
            code: 'CONNECTION_FAILED',
            message: 'Failed to connect to streaming server',
            isFatal: true
          });
        } else if (output.includes('Invalid data found')) {
          this.handleError({
            code: 'INVALID_DATA',
            message: 'Invalid audio data or format',
            isFatal: true
          });
        } else if (output.includes('Error opening input')) {
          this.handleError({
            code: 'DEVICE_ERROR',
            message: 'Error accessing audio device',
            isFatal: true
          });
        }
        
        // Check for streaming started indicators
        if (output.includes('Stream mapping:') || output.includes('frame=')) {
          this.updateStatus('Streaming');
        }
      });
      
      // Handle process exit
      this.ffmpegProcess.on('exit', (code, signal) => {
        if (code !== 0 && this.status.status !== 'Error') {
          this.handleError({
            code: 'FFMPEG_EXIT',
            message: `FFmpeg exited with code ${code}, signal: ${signal}`,
            isFatal: true
          });
        } else if (this.status.status !== 'Error') {
          this.updateStatus('Stopped');
        }
        
        this.ffmpegProcess = null;
        this.streamStartTime = null;
      });
      
      // Handle process error
      this.ffmpegProcess.on('error', (error) => {
        this.handleError({
          code: 'FFMPEG_ERROR',
          message: `FFmpeg error: ${error.message}`,
          isFatal: true
        });
        
        this.ffmpegProcess = null;
        this.streamStartTime = null;
      });
      
    } catch (error: any) {
      this.handleError({
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || String(error),
        isFatal: true
      });
      throw error;
    }
  }

  /**
   * Stop the current stream
   */
  public async stopStream(): Promise<void> {
    if (!this.ffmpegProcess) {
      this.log('No active stream to stop');
      return;
    }
    
    this.updateStatus('Stopping');
    this.log('Stopping FFmpeg process...');
    
    const currentFfmpegProcess = this.ffmpegProcess; // Capture the process to a local variable

    return new Promise<void>((resolve) => {
      // Set a timeout to force kill if graceful shutdown fails
      const forceKillTimeout = setTimeout(() => {
        if (currentFfmpegProcess) {
          this.log('Force killing FFmpeg process...');
          currentFfmpegProcess.kill('SIGKILL');
        }
      }, 5000);
      
      // Listen for process exit
      const exitListener = () => {
        clearTimeout(forceKillTimeout);
        this.updateStatus('Stopped');
        this.log('FFmpeg process stopped');
        resolve();
      };
      
      currentFfmpegProcess.once('exit', exitListener);
      
      // Try graceful shutdown first
      currentFfmpegProcess.kill('SIGTERM');
    });
  }

  /**
   * Get current streaming status
   */
  public getStatus(): StreamStatus {
    // Update duration if streaming
    if (this.status.status === 'Streaming' && this.streamStartTime) {
      this.status.duration = Math.floor((Date.now() - this.streamStartTime) / 1000);
    }
    
    return { ...this.status };
  }

  /**
   * Add a log listener
   */
  public addLogListener(listener: (log: string) => void): () => void {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== listener);
    };
  }

  /**
   * Add a status listener
   */
  public addStatusListener(listener: (status: StreamStatus) => void): () => void {
    this.statusListeners.push(listener);
    listener({ ...this.status }); // Send initial status
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  /**
   * Update streaming status
   */
  private updateStatus(status: StreamStatus['status']): void {
    this.status = {
      status,
      duration: status === 'Streaming' && this.streamStartTime 
        ? Math.floor((Date.now() - this.streamStartTime) / 1000) 
        : null,
      error: status === 'Error' ? this.status.error : null
    };
    
    // Notify listeners
    this.statusListeners.forEach(listener => listener({ ...this.status }));
  }

  /**
   * Handle streaming error
   */
  private handleError(error: StreamingError): void {
    this.log(`Error: ${error.code} - ${error.message}`);
    
    this.status = {
      status: 'Error',
      duration: this.streamStartTime ? Math.floor((Date.now() - this.streamStartTime) / 1000) : null,
      error
    };
    
    // Notify listeners
    this.statusListeners.forEach(listener => listener({ ...this.status }));
    
    // Kill process if fatal error
    if (error.isFatal && this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGKILL');
      this.ffmpegProcess = null;
      this.streamStartTime = null;
    }
  }

  /**
   * Log a message
   */
  private log(message: string): void {
    console.log(`[FFmpegController] ${message}`);
    this.logListeners.forEach(listener => listener(message));
  }
}


