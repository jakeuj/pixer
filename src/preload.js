const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  selectImageFile: () => ipcRenderer.invoke('select-image-file'),
  
  // Device operations
  checkDevice: () => ipcRenderer.invoke('check-device'),
  resetDevice: () => ipcRenderer.invoke('reset-device'),
  uploadImage: (imagePath) => ipcRenderer.invoke('upload-image', imagePath),
  
  // Firmware operations
  checkFirmwareFiles: () => ipcRenderer.invoke('check-firmware-files'),
  
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // Event listeners
  onUploadProgress: (callback) => {
    ipcRenderer.on('upload-progress', (event, progress) => callback(progress));
  },

  onLogMessage: (callback) => {
    ipcRenderer.on('log-message', (event, logData) => callback(logData));
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
