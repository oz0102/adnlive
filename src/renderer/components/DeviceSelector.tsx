import React, { useState, useEffect } from 'react';

interface AudioDevice {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

interface DeviceSelectorProps {
  onDeviceSelect: (deviceId: string) => void;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({ onDeviceSelect }) => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load audio devices when component mounts
    const loadDevices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get devices from Electron main process
        const audioDevices = await window.electron.devices.getAudioDevices();
        setDevices(audioDevices);
        
        // Load saved device ID from config
        const config = await window.electron.config.loadConfig();
        if (config && config.lastDeviceId && audioDevices.some(d => d.id === config.lastDeviceId)) {
          setSelectedDevice(config.lastDeviceId);
          onDeviceSelect(config.lastDeviceId);
        } else if (audioDevices.length > 0) {
          // Select first device as default if no saved device
          const defaultDevice = audioDevices.find(d => d.isDefault) || audioDevices[0];
          setSelectedDevice(defaultDevice.id);
          onDeviceSelect(defaultDevice.id);
        }
      } catch (error) {
        console.error('Failed to load audio devices:', error);
        setError('Failed to load audio devices. Please check your audio hardware and permissions.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDevices();
  }, [onDeviceSelect]);

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedDevice(deviceId);
    onDeviceSelect(deviceId);
    
    // Save selected device to config
    window.electron.config.saveConfig({ lastDeviceId: deviceId })
      .catch(error => console.error('Failed to save device selection:', error));
  };

  if (isLoading) {
    return <div className="device-selector-loading">Loading audio devices...</div>;
  }

  if (error) {
    return <div className="device-selector-error">{error}</div>;
  }

  return (
    <div className="device-selector">
      <label htmlFor="audio-device">Select Audio Input Device:</label>
      <select
        id="audio-device"
        className="device-select"
        value={selectedDevice}
        onChange={handleDeviceChange}
      >
        {devices.length === 0 ? (
          <option value="">No audio devices found</option>
        ) : (
          devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name} {device.isDefault ? '(Default)' : ''}
            </option>
          ))
        )}
      </select>
      <div className="device-count">
        {devices.length} {devices.length === 1 ? 'device' : 'devices'} found
      </div>
    </div>
  );
};

export default DeviceSelector;
