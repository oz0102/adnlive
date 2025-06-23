import React, { useState, useEffect } from 'react';

interface StreamControlsProps {
  deviceId: string | null;
  config: {
    rtmpUrl: string;
    rtmpStreamKey: string;
    audioBitrate?: string;
    audioCodec?: string;
  };
  onStatusChange: (status: string) => void;
}

const StreamControls: React.FC<StreamControlsProps> = ({ 
  deviceId, 
  config, 
  onStatusChange 
}) => {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [durationTimer, setDurationTimer] = useState<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (durationTimer) {
        clearInterval(durationTimer);
      }
    };
  }, [durationTimer]);

  // Set up stream status listener
  useEffect(() => {
    const removeStatusListener = window.electron.listeners.onStreamStatus((status) => {
      console.log('Stream status update:', status);
      
      if (status === 'Streaming') {
        setIsStreaming(true);
        setIsLoading(false);
        setError(null);
        
        // Start duration timer
        const timer = setInterval(async () => {
          try {
            const statusInfo = await window.electron.streaming.getStatus();
            if (statusInfo && statusInfo.duration !== null) {
              setDuration(statusInfo.duration);
            }
          } catch (err) {
            console.error('Failed to get stream duration:', err);
          }
        }, 1000);
        
        setDurationTimer(timer);
      } else if (status === 'Connecting') {
        setIsLoading(true);
        setIsStreaming(false);
      } else if (status === 'Error') {
        setIsStreaming(false);
        setIsLoading(false);
        // Error details will come through the error listener
      } else if (status === 'Stopped' || status === 'Idle') {
        setIsStreaming(false);
        setIsLoading(false);
        setDuration(null);
        
        // Clear duration timer
        if (durationTimer) {
          clearInterval(durationTimer);
          setDurationTimer(null);
        }
      }
      
      onStatusChange(status);
    });
    
    const removeErrorListener = window.electron.listeners.onStreamError((error) => {
      console.error('Stream error:', error);
      setError(error.message);
      setIsLoading(false);
      setIsStreaming(false);
      
      // Clear duration timer
      if (durationTimer) {
        clearInterval(durationTimer);
        setDurationTimer(null);
      }
    });
    
    return () => {
      removeStatusListener();
      removeErrorListener();
    };
  }, [onStatusChange, durationTimer]);

  const startStream = async () => {
    if (!deviceId) {
      setError('No audio device selected');
      return;
    }
    
    if (!config.rtmpUrl || !config.rtmpStreamKey) {
      setError('RTMP URL and Stream Key are required');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      await window.electron.streaming.startStream({
        deviceId,
        rtmpUrl: config.rtmpUrl,
        rtmpStreamKey: config.rtmpStreamKey,
        audioBitrate: config.audioBitrate,
        audioCodec: config.audioCodec
      });
      
      // Status will be updated by the listener
    } catch (err: any) {
      console.error('Failed to start stream:', err);
      setError(err.message || 'Failed to start stream');
      setIsLoading(false);
    }
  };

  const stopStream = async () => {
    try {
      setIsLoading(true);
      
      await window.electron.streaming.stopStream();
      
      // Status will be updated by the listener
    } catch (err: any) {
      console.error('Failed to stop stream:', err);
      setError(err.message || 'Failed to stop stream');
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const isStartDisabled = !deviceId || !config.rtmpUrl || !config.rtmpStreamKey || isLoading || isStreaming;
  const isStopDisabled = !isStreaming || isLoading;

  return (
    <div className="stream-controls">
      <div className="controls-container">
        <button
          className={`control-button start-button ${isStartDisabled ? 'disabled' : ''}`}
          onClick={startStream}
          disabled={isStartDisabled}
        >
          Start Streaming
        </button>
        
        <button
          className={`control-button stop-button ${isStopDisabled ? 'disabled' : ''}`}
          onClick={stopStream}
          disabled={isStopDisabled}
        >
          Stop Streaming
        </button>
      </div>
      
      {isLoading && (
        <div className="status-indicator loading">
          <div className="loading-spinner"></div>
          <span>{isStreaming ? 'Stopping stream...' : 'Starting stream...'}</span>
        </div>
      )}
      
      {isStreaming && duration !== null && (
        <div className="status-indicator streaming">
          <div className="streaming-indicator"></div>
          <span>Live: {formatDuration(duration)}</span>
        </div>
      )}
      
      {error && (
        <div className="status-indicator error">
          <span>Error: {error}</span>
        </div>
      )}
    </div>
  );
};

export default StreamControls;
