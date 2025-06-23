import { ipcMain, BrowserWindow } from 'electron';
import { DeviceDetector } from './deviceDetector';
import { FFmpegController, StreamConfig } from './ffmpegController';
import { ConfigManager } from './configManager';
import * as os from 'os';

/**
 * Sets up all IPC handlers for communication between main and renderer processes
 */
export function setupIpcHandlers() {
  // Get main window reference
  const getMainWindow = (): BrowserWindow | null => {
    const windows = BrowserWindow.getAllWindows();
    return windows.length > 0 ? windows[0] : null;
  };

  // Platform detection
  ipcMain.handle('get-platform', () => {
    return os.platform();
  });

  // Audio device detection
  ipcMain.handle('get-audio-devices', async () => {
    try {
      const devices = await DeviceDetector.getAudioDevices();
      return devices;
    } catch (error) {
      console.error('Error getting audio devices:', error);
      throw error;
    }
  });

  // Configuration management
  ipcMain.handle('save-config', async (_event, config: Partial<StreamConfig>) => {
    try {
      ConfigManager.getInstance().saveConfig(config);
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  });

  ipcMain.handle('load-config', async () => {
    try {
      return ConfigManager.getInstance().loadConfig();
    } catch (error) {
      console.error('Error loading config:', error);
      throw error;
    }
  });

  // Streaming control
  ipcMain.handle('start-stream', async (_event, config: StreamConfig) => {
    try {
      await FFmpegController.getInstance().startStream(config);
      return true;
    } catch (error) {
      console.error('Error starting stream:', error);
      throw error;
    }
  });

  ipcMain.handle('stop-stream', async () => {
    try {
      await FFmpegController.getInstance().stopStream();
      return true;
    } catch (error) {
      console.error('Error stopping stream:', error);
      throw error;
    }
  });

  ipcMain.handle('get-stream-status', () => {
    return FFmpegController.getInstance().getStatus();
  });

  // Set up FFmpeg controller event listeners
  const ffmpegController = FFmpegController.getInstance();

  // Stream status listener
  ffmpegController.addStatusListener((status) => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-status', status.status);
    }
  });

  // Stream log listener
  ffmpegController.addLogListener((log) => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-log', log);
    }
  });
}
