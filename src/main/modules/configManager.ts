import Store from 'electron-store';
import * as os from 'os';
import * as crypto from 'crypto';

// Interface for stream configuration
export interface StreamConfig {
  rtmpUrl: string;
  rtmpStreamKey: string;
  audioBitrate?: string;
  audioCodec?: string;
  lastDeviceId?: string;
}

/**
 * Manages secure configuration storage
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private store: Store<StreamConfig>;
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Get encryption key from environment or generate a default one
    const encryptionKey = this.getEncryptionKey();
    
    // Initialize electron-store with encryption
    this.store = new Store<StreamConfig>({
      name: 'adn-audio-broadcaster-config',
      encryptionKey,
      schema: {
        rtmpUrl: { type: 'string', default: '' },
        rtmpStreamKey: { type: 'string', default: '' },
        audioBitrate: { type: 'string', default: '128k', enum: ['64k', '96k', '128k', '192k', '256k'] },
        audioCodec: { type: 'string', default: 'aac', enum: ['aac', 'libmp3lame'] },
        lastDeviceId: { type: 'string', default: '' }
      }
    });
  }
  
  /**
   * Get encryption key from environment or generate a default one
   */
  private getEncryptionKey(): string {
    // Try to get from environment variable
    const envKey = process.env.STREAM_KEY_SECRET;
    if (envKey) {
      return envKey;
    }
    
    // Generate a machine-specific key based on hardware info
    // This is not as secure as a proper environment variable but better than hardcoding
    const username = os.userInfo().username;
    const hostname = os.hostname();
    const cpus = os.cpus().length;
    const platform = os.platform();
    const arch = os.arch();
    
    // Create a deterministic but machine-specific key
    const machineInfo = `${username}-${hostname}-${cpus}-${platform}-${arch}-ADN_BROADCASTER_KEY`;
    return crypto.createHash('sha256').update(machineInfo).digest('hex');
  }
  
  /**
   * Save configuration
   */
  public saveConfig(config: Partial<StreamConfig>): void {
    // Update only the provided fields
    Object.entries(config).forEach(([key, value]) => {
      if (value !== undefined) {
        this.store.set(key as keyof StreamConfig, value);
      }
    });
  }
  
  /**
   * Load configuration
   */
  public loadConfig(): StreamConfig {
    return this.store.store;
  }
  
  /**
   * Clear sensitive configuration
   */
  public clearSensitiveConfig(): void {
    this.store.delete('rtmpStreamKey');
  }
  
  /**
   * Clear all configuration
   */
  public clearAllConfig(): void {
    this.store.clear();
  }
}


