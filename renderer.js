// DOM 元素
const elements = {
    // 狀態顯示
    connectionStatus: document.getElementById('connection-status'),
    batteryLevel: document.getElementById('battery-level'),
    bleVersion: document.getElementById('ble-version'),
    mcuVersion: document.getElementById('mcu-version'),
    iteVersion: document.getElementById('ite-version'),
    
    // 按鈕
    checkDevice: document.getElementById('check-device'),
    selectImage: document.getElementById('select-image'),
    uploadImage: document.getElementById('upload-image'),
    resetDevice: document.getElementById('reset-device'),
    clearLogs: document.getElementById('clear-logs'),
    
    // 圖片相關
    imagePreview: document.getElementById('image-preview'),
    
    // 進度條
    uploadProgress: document.getElementById('upload-progress'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    
    // 日誌
    logContainer: document.getElementById('log-container')
};

// 全域變數
let selectedImagePath = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    addLog('應用程式已啟動', 'info');
});

// 設定事件監聽器
function setupEventListeners() {
    // 檢查裝置
    elements.checkDevice.addEventListener('click', checkDevice);
    
    // 選擇圖片
    elements.selectImage.addEventListener('click', selectImage);
    elements.imagePreview.addEventListener('click', selectImage);
    
    // 上傳圖片
    elements.uploadImage.addEventListener('click', uploadImage);
    
    // 重置裝置
    elements.resetDevice.addEventListener('click', resetDevice);
    
    // 清除日誌
    elements.clearLogs.addEventListener('click', clearLogs);
    
    // 監聽上傳進度
    window.electronAPI.onUploadProgress((progress) => {
        updateUploadProgress(progress);
    });
}

// 檢查裝置狀態
async function checkDevice() {
    const button = elements.checkDevice;
    const originalText = button.textContent;
    
    button.disabled = true;
    button.textContent = '檢查中...';
    
    addLog('正在檢查 Pixer 裝置狀態...', 'info');
    
    try {
        const result = await window.electronAPI.checkPixer();
        
        if (result.success) {
            // 更新裝置狀態
            updateDeviceStatus(result.deviceInfo);
            addLog('裝置檢查完成', 'success');
        } else {
            // 顯示錯誤
            updateDeviceStatus(null);
            addLog(`裝置檢查失敗: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`檢查裝置時發生錯誤: ${error.message}`, 'error');
        updateDeviceStatus(null);
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// 更新裝置狀態顯示
function updateDeviceStatus(deviceInfo) {
    if (deviceInfo) {
        elements.connectionStatus.textContent = '已連接';
        elements.connectionStatus.className = 'status-value connected';
        
        elements.batteryLevel.textContent = deviceInfo.battery ? `${deviceInfo.battery}%` : '--';
        elements.bleVersion.textContent = deviceInfo.bleVersion || '--';
        elements.mcuVersion.textContent = deviceInfo.mcuVersion || '--';
        elements.iteVersion.textContent = deviceInfo.iteVersion || '--';
    } else {
        elements.connectionStatus.textContent = '未連接';
        elements.connectionStatus.className = 'status-value disconnected';
        
        elements.batteryLevel.textContent = '--';
        elements.bleVersion.textContent = '--';
        elements.mcuVersion.textContent = '--';
        elements.iteVersion.textContent = '--';
    }
}

// 選擇圖片
async function selectImage() {
    try {
        const imagePath = await window.electronAPI.selectImage();
        
        if (imagePath) {
            selectedImagePath = imagePath;
            showImagePreview(imagePath);
            elements.uploadImage.disabled = false;
            addLog(`已選擇圖片: ${imagePath.split('/').pop()}`, 'info');
        }
    } catch (error) {
        addLog(`選擇圖片時發生錯誤: ${error.message}`, 'error');
    }
}

// 顯示圖片預覽
function showImagePreview(imagePath) {
    const img = document.createElement('img');
    img.src = `file://${imagePath}`;
    img.className = 'preview-image';
    img.alt = '選擇的圖片';
    
    // 清空預覽區域並添加圖片
    elements.imagePreview.innerHTML = '';
    elements.imagePreview.appendChild(img);
    elements.imagePreview.classList.add('has-image');
}

// 上傳圖片
async function uploadImage() {
    if (!selectedImagePath) {
        addLog('請先選擇要上傳的圖片', 'warning');
        return;
    }
    
    const button = elements.uploadImage;
    const originalText = button.textContent;
    
    button.disabled = true;
    button.textContent = '上傳中...';
    elements.uploadProgress.style.display = 'flex';
    
    addLog('開始上傳圖片到 Pixer 裝置...', 'info');
    
    try {
        const result = await window.electronAPI.uploadImage(selectedImagePath);
        
        if (result.success) {
            addLog('圖片上傳成功！', 'success');
            updateUploadProgress(100);
        } else {
            addLog(`圖片上傳失敗: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`上傳圖片時發生錯誤: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
        
        // 延遲隱藏進度條
        setTimeout(() => {
            elements.uploadProgress.style.display = 'none';
            updateUploadProgress(0);
        }, 2000);
    }
}

// 更新上傳進度
function updateUploadProgress(progress) {
    elements.progressFill.style.width = `${progress}%`;
    elements.progressText.textContent = `${progress}%`;
}

// 重置裝置
async function resetDevice() {
    const button = elements.resetDevice;
    const originalText = button.textContent;
    
    // 確認對話框
    if (!confirm('確定要重置 Pixer 裝置嗎？')) {
        return;
    }
    
    button.disabled = true;
    button.textContent = '重置中...';
    
    addLog('正在重置 Pixer 裝置...', 'info');
    
    try {
        const result = await window.electronAPI.resetPixer();
        
        if (result.success) {
            addLog('裝置重置成功', 'success');
            // 清空裝置狀態
            updateDeviceStatus(null);
        } else {
            addLog(`裝置重置失敗: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`重置裝置時發生錯誤: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// 清除日誌
function clearLogs() {
    elements.logContainer.innerHTML = '';
    addLog('日誌已清除', 'info');
}

// 添加日誌
function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = `[${new Date().toLocaleTimeString()}]`;
    
    const messageSpan = document.createElement('span');
    messageSpan.className = 'message';
    messageSpan.textContent = message;
    
    logEntry.appendChild(timestamp);
    logEntry.appendChild(messageSpan);
    
    elements.logContainer.appendChild(logEntry);
    
    // 自動滾動到底部
    elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
    
    // 限制日誌條目數量
    const maxLogs = 100;
    const logs = elements.logContainer.children;
    if (logs.length > maxLogs) {
        elements.logContainer.removeChild(logs[0]);
    }
}

// 格式化檔案大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 處理拖放功能（可選）
function setupDragAndDrop() {
    elements.imagePreview.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.imagePreview.style.borderColor = '#667eea';
    });
    
    elements.imagePreview.addEventListener('dragleave', (e) => {
        e.preventDefault();
        elements.imagePreview.style.borderColor = '#cbd5e0';
    });
    
    elements.imagePreview.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.imagePreview.style.borderColor = '#cbd5e0';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                selectedImagePath = file.path;
                showImagePreview(file.path);
                elements.uploadImage.disabled = false;
                addLog(`已選擇圖片: ${file.name}`, 'info');
            } else {
                addLog('請選擇有效的圖片檔案', 'warning');
            }
        }
    });
}

// 啟用拖放功能
setupDragAndDrop();
