const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 給渲染程序
contextBridge.exposeInMainWorld('electronAPI', {
  // 選擇圖片檔案
  selectImage: () => ipcRenderer.invoke('select-image'),
  
  // 檢查 Pixer 裝置
  checkPixer: () => ipcRenderer.invoke('check-pixer'),
  
  // 上傳圖片
  uploadImage: (imagePath) => ipcRenderer.invoke('upload-image', imagePath),
  
  // 重置裝置
  resetPixer: () => ipcRenderer.invoke('reset-pixer'),
  
  // 監聽上傳進度
  onUploadProgress: (callback) => {
    ipcRenderer.on('upload-progress', (event, progress) => callback(progress));
  },
  
  // 移除上傳進度監聽器
  removeUploadProgressListener: () => {
    ipcRenderer.removeAllListeners('upload-progress');
  }
});
