import React, { useState, useEffect } from 'react';
import DeviceSelector from './components/DeviceSelector';
import StreamConfig from './components/StreamConfig';
import StreamControls from './components/StreamControls';
import LogViewer from './components/LogViewer';
import './styles.css';

// Define the window interface to access the exposed Electron APIs
declare global {
  interface Window {
    electron: {
      platform: {
        getPlatform: () => Promise<string>;
      };
      devices: {
        getAudioDevices: () => Promise<any[]>;
      };
      streaming: {
        startStream: (config: any) => Promise<void>;
        stopStream: () => Promise<void>;
        getStatus: () => Promise<any>;
      };
      config: {
        saveConfig: (config: any) => Promise<void>;
        loadConfig: () => Promise<any>;
      };
      listeners: {
        onStreamStatus: (callback: (status: string) => void) => () => void;
        onStreamLog: (callback: (log: string) => void) => () => void;
        onStreamError: (callback: (error: any) => void) => () => void;
      };
    };
  }
}

const App: React.FC = () => {
  const [platform, setPlatform] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [streamConfig, setStreamConfig] = useState<{
    rtmpUrl: string;
    rtmpStreamKey: string;
    audioBitrate?: string;
    audioCodec?: string;
  }>({
    rtmpUrl: '',
    rtmpStreamKey: '',
    audioBitrate: '128k',
    audioCodec: 'aac'
  });
  const [streamStatus, setStreamStatus] = useState<string>('Idle');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  useEffect(() => {
    // Get platform information when component mounts
    const getPlatform = async () => {
      try {
        const platformName = await window.electron.platform.getPlatform();
        setPlatform(platformName);
      } catch (error) {
        console.error('Failed to get platform:', error);
      }
    };

    getPlatform();
  }, []);

  // Update streaming state based on status
  useEffect(() => {
    setIsStreaming(streamStatus === 'Streaming' || streamStatus === 'Connecting');
  }, [streamStatus]);

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleConfigChange = (config: {
    rtmpUrl: string;
    rtmpStreamKey: string;
    audioBitrate?: string;
    audioCodec?: string;
  }) => {
    setStreamConfig(config);
  };

  const handleStatusChange = (status: string) => {
    setStreamStatus(status);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ADN Audio Broadcaster</h1>
        <div className="platform-badge">
          {platform && <span>Running on {platform}</span>}
        </div>
      </header>
      
      <main className="app-content">
        <div className="main-layout">
          <div className="config-panel">
            <section className="panel-section">
              <h2>Audio Device</h2>
              <DeviceSelector onDeviceSelect={handleDeviceSelect} />
            </section>
            
            <section className="panel-section">
              <h2>Stream Configuration</h2>
              <StreamConfig 
                onConfigChange={handleConfigChange} 
                isStreaming={isStreaming} 
              />
            </section>
            
            <section className="panel-section">
              <h2>Controls</h2>
              <StreamControls 
                deviceId={selectedDeviceId} 
                config={streamConfig} 
                onStatusChange={handleStatusChange} 
              />
            </section>
          </div>
          
          <div className="log-panel">
            <LogViewer maxLines={500} />
          </div>
        </div>
      </main>
      
      <footer className="app-footer">
        <div className="status-bar">
          <div className={`status-indicator ${streamStatus.toLowerCase()}`}>
            Status: {streamStatus}
          </div>
          <div className="app-version">
            ADN Audio Broadcaster v1.0.0
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;


