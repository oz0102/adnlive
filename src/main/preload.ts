import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  platform: {
    getPlatform: () => ipcRenderer.invoke('get-platform')
  },
  devices: {
    getAudioDevices: () => ipcRenderer.invoke('get-audio-devices')
  },
  streaming: {
    startStream: (config: any) => ipcRenderer.invoke('start-stream', config),
    stopStream: () => ipcRenderer.invoke('stop-stream'),
    getStatus: () => ipcRenderer.invoke('get-stream-status')
  },
  config: {
    saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
    loadConfig: () => ipcRenderer.invoke('load-config')
  },
  listeners: {
    onStreamStatus: (callback: (status: string) => void) => {
      const listener = (_event: any, status: string) => callback(status);
      ipcRenderer.on('stream-status', listener);
      return () => ipcRenderer.removeListener('stream-status', listener);
    },
    onStreamLog: (callback: (log: string) => void) => {
      const listener = (_event: any, log: string) => callback(log);
      ipcRenderer.on('stream-log', listener);
      return () => ipcRenderer.removeListener('stream-log', listener);
    },
    onStreamError: (callback: (error: any) => void) => {
      const listener = (_event: any, error: any) => callback(error);
      ipcRenderer.on('stream-error', listener);
      return () => ipcRenderer.removeListener('stream-error', listener);
    }
  }
});

