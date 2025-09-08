const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pixer', {
  uploadImage: (filePath) => ipcRenderer.invoke('upload-image', filePath)
});
