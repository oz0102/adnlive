import React, { useState, useEffect } from 'react';

interface StreamConfigProps {
  onConfigChange: (config: {
    rtmpUrl: string;
    rtmpStreamKey: string;
    audioBitrate?: string;
    audioCodec?: string;
  }) => void;
  isStreaming: boolean;
}

const StreamConfig: React.FC<StreamConfigProps> = ({ onConfigChange, isStreaming }) => {
  const [rtmpUrl, setRtmpUrl] = useState<string>('');
  const [rtmpStreamKey, setRtmpStreamKey] = useState<string>('');
  const [showStreamKey, setShowStreamKey] = useState<boolean>(false);
  const [audioBitrate, setAudioBitrate] = useState<string>('128k');
  const [audioCodec, setAudioCodec] = useState<string>('aac');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Load saved configuration when component mounts
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await window.electron.config.loadConfig();
        if (config) {
          setRtmpUrl(config.rtmpUrl || '');
          setRtmpStreamKey(config.rtmpStreamKey || '');
          setAudioBitrate(config.audioBitrate || '128k');
          setAudioCodec(config.audioCodec || 'aac');
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    };

    loadConfig();
  }, []);

  // Update parent component when configuration changes
  useEffect(() => {
    onConfigChange({
      rtmpUrl,
      rtmpStreamKey,
      audioBitrate,
      audioCodec
    });
  }, [rtmpUrl, rtmpStreamKey, audioBitrate, audioCodec, onConfigChange]);

  // Save configuration when it changes
  useEffect(() => {
    const saveConfig = async () => {
      try {
        await window.electron.config.saveConfig({
          rtmpUrl,
          rtmpStreamKey,
          audioBitrate,
          audioCodec
        });
      } catch (error) {
        console.error('Failed to save configuration:', error);
      }
    };

    // Debounce saving to avoid excessive writes
    const timeoutId = setTimeout(saveConfig, 500);
    return () => clearTimeout(timeoutId);
  }, [rtmpUrl, rtmpStreamKey, audioBitrate, audioCodec]);

  const toggleStreamKeyVisibility = () => {
    setShowStreamKey(!showStreamKey);
  };

  const toggleAdvancedSettings = () => {
    setShowAdvanced(!showAdvanced);
  };

  return (
    <div className="stream-config">
      <div className="config-group">
        <label htmlFor="rtmp-url">RTMP URL:</label>
        <input
          id="rtmp-url"
          type="text"
          value={rtmpUrl}
          onChange={(e) => setRtmpUrl(e.target.value)}
          placeholder="rtmp://your-streaming-server/live"
          disabled={isStreaming}
          className="config-input"
        />
      </div>

      <div className="config-group">
        <label htmlFor="stream-key">Stream Key:</label>
        <div className="stream-key-container">
          <input
            id="stream-key"
            type={showStreamKey ? "text" : "password"}
            value={rtmpStreamKey}
            onChange={(e) => setRtmpStreamKey(e.target.value)}
            placeholder="your-stream-key"
            disabled={isStreaming}
            className="config-input"
          />
          <button
            type="button"
            onClick={toggleStreamKeyVisibility}
            className="visibility-toggle"
            disabled={isStreaming}
          >
            {showStreamKey ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div className="advanced-toggle">
        <button
          type="button"
          onClick={toggleAdvancedSettings}
          className="toggle-button"
          disabled={isStreaming}
        >
          {showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"}
        </button>
      </div>

      {showAdvanced && (
        <div className="advanced-settings">
          <div className="config-group">
            <label htmlFor="audio-bitrate">Audio Bitrate:</label>
            <select
              id="audio-bitrate"
              value={audioBitrate}
              onChange={(e) => setAudioBitrate(e.target.value)}
              disabled={isStreaming}
              className="config-select"
            >
              <option value="64k">64 kbps</option>
              <option value="96k">96 kbps</option>
              <option value="128k">128 kbps</option>
              <option value="192k">192 kbps</option>
              <option value="256k">256 kbps</option>
            </select>
          </div>

          <div className="config-group">
            <label htmlFor="audio-codec">Audio Codec:</label>
            <select
              id="audio-codec"
              value={audioCodec}
              onChange={(e) => setAudioCodec(e.target.value)}
              disabled={isStreaming}
              className="config-select"
            >
              <option value="aac">AAC</option>
              <option value="libmp3lame">MP3</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamConfig;
