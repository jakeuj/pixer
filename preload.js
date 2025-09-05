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
  },

  // 固件升級相關 API
  // 選擇固件檔案
  selectFirmwareFile: (type) => ipcRenderer.invoke('select-firmware-file', type),

  // 固件升級
  upgradeFirmware: (params) => ipcRenderer.invoke('upgrade-firmware', params),

  // 監聽固件升級進度
  onFirmwareProgress: (callback) => {
    ipcRenderer.on('firmware-progress', (event, progress) => callback(progress));
  },

  // 移除固件升級進度監聽器
  removeFirmwareProgressListener: () => {
    ipcRenderer.removeAllListeners('firmware-progress');
  }
});
