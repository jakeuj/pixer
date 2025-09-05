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
    logContainer: document.getElementById('log-container'),

    // 固件升級相關
    // 版本顯示
    bleCurrent: document.getElementById('ble-current'),
    bleTarget: document.getElementById('ble-target'),
    bleUpgradeStatus: document.getElementById('ble-upgrade-status'),
    iteCurrent: document.getElementById('ite-current'),
    iteTarget: document.getElementById('ite-target'),
    iteUpgradeStatus: document.getElementById('ite-upgrade-status'),
    bspCurrent: document.getElementById('bsp-current'),
    bspTarget: document.getElementById('bsp-target'),
    bspUpgradeStatus: document.getElementById('bsp-upgrade-status'),

    // 檔案選擇
    bleFilePath: document.getElementById('ble-file-path'),
    iteFilePath: document.getElementById('ite-file-path'),
    bspFilePath: document.getElementById('bsp-file-path'),
    selectBleFile: document.getElementById('select-ble-file'),
    selectIteFile: document.getElementById('select-ite-file'),
    selectBspFile: document.getElementById('select-bsp-file'),

    // 升級控制
    upgradeWarnings: document.getElementById('upgrade-warnings'),
    batteryWarning: document.getElementById('battery-warning'),
    fileWarning: document.getElementById('file-warning'),
    checkFirmware: document.getElementById('check-firmware'),
    startUpgrade: document.getElementById('start-upgrade'),

    // 升級進度
    upgradeProgress: document.getElementById('upgrade-progress'),
    upgradeStage: document.getElementById('upgrade-stage'),
    upgradePercentage: document.getElementById('upgrade-percentage'),
    upgradeProgressFill: document.getElementById('upgrade-progress-fill')
};

// 全域變數
let selectedImagePath = null;
let firmwareFiles = {
    ble: null,
    ite: null,
    bsp: null
};
let currentVersions = {
    ble: null,
    ite: null,
    bsp: null,
    battery: null
};
const targetVersions = {
    ble: 14,
    ite: 35,
    bsp: 1702061
};

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

    // 固件升級相關
    elements.selectBleFile.addEventListener('click', () => selectFirmwareFile('ble'));
    elements.selectIteFile.addEventListener('click', () => selectFirmwareFile('ite'));
    elements.selectBspFile.addEventListener('click', () => selectFirmwareFile('bsp'));
    elements.checkFirmware.addEventListener('click', checkFirmwareVersions);
    elements.startUpgrade.addEventListener('click', startFirmwareUpgrade);

    // 監聽上傳進度
    window.electronAPI.onUploadProgress((progress) => {
        updateUploadProgress(progress);
    });

    // 監聽固件升級進度
    window.electronAPI.onFirmwareProgress((progress) => {
        updateFirmwareProgress(progress);
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

        // 更新固件版本資訊
        updateFirmwareVersions(deviceInfo);
    } else {
        elements.connectionStatus.textContent = '未連接';
        elements.connectionStatus.className = 'status-value disconnected';

        elements.batteryLevel.textContent = '--';
        elements.bleVersion.textContent = '--';
        elements.mcuVersion.textContent = '--';
        elements.iteVersion.textContent = '--';

        // 清除固件版本資訊
        updateFirmwareVersions(null);
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

// ========== 固件升級相關函數 ==========

// 更新固件版本資訊
function updateFirmwareVersions(deviceInfo) {
    if (deviceInfo) {
        // 解析版本號
        const bleVersion = parseBleVersion(deviceInfo.bleVersion);
        const iteVersion = parseIteVersion(deviceInfo.iteVersion);
        const bspVersion = parseBspVersion(deviceInfo.mcuVersion);
        const battery = parseInt(deviceInfo.battery) || 0;

        // 儲存當前版本
        currentVersions.ble = bleVersion;
        currentVersions.ite = iteVersion;
        currentVersions.bsp = bspVersion;
        currentVersions.battery = battery;

        // 更新顯示
        elements.bleCurrent.textContent = deviceInfo.bleVersion || '--';
        elements.iteCurrent.textContent = deviceInfo.iteVersion || '--';
        elements.bspCurrent.textContent = deviceInfo.mcuVersion || '--';

        // 更新升級狀態
        updateUpgradeStatus('ble', bleVersion, targetVersions.ble);
        updateUpgradeStatus('ite', iteVersion, targetVersions.ite);
        updateUpgradeStatus('bsp', bspVersion, targetVersions.bsp);

        // 檢查電池警告
        checkBatteryWarning(battery);

        // 更新升級按鈕狀態
        updateUpgradeButtonState();
    } else {
        // 清除版本資訊
        currentVersions = { ble: null, ite: null, bsp: null, battery: null };

        elements.bleCurrent.textContent = '--';
        elements.iteCurrent.textContent = '--';
        elements.bspCurrent.textContent = '--';

        elements.bleUpgradeStatus.textContent = '--';
        elements.bleUpgradeStatus.className = 'upgrade-status unknown';
        elements.iteUpgradeStatus.textContent = '--';
        elements.iteUpgradeStatus.className = 'upgrade-status unknown';
        elements.bspUpgradeStatus.textContent = '--';
        elements.bspUpgradeStatus.className = 'upgrade-status unknown';

        hideWarnings();
        elements.startUpgrade.disabled = true;
    }
}

// 解析 BLE 版本號 (例如: "1.0.12" -> 12)
function parseBleVersion(versionStr) {
    if (!versionStr) return 0;
    const parts = versionStr.split('.');
    return parts.length >= 3 ? parseInt(parts[2]) || 0 : 0;
}

// 解析 ITE 版本號 (例如: "1.0.30" -> 30)
function parseIteVersion(versionStr) {
    if (!versionStr) return 0;
    const parts = versionStr.split('.');
    return parts.length >= 3 ? parseInt(parts[2]) || 0 : 0;
}

// 解析 BSP 版本號 (例如: "1_1702061-01-01_0" -> 1702061)
function parseBspVersion(versionStr) {
    if (!versionStr) return 0;
    const parts = versionStr.split('_');
    if (parts.length >= 2) {
        const datePart = parts[1].replace(/-/g, '');
        return parseInt(datePart) || 0;
    }
    return 0;
}

// 更新升級狀態顯示
function updateUpgradeStatus(type, currentVersion, targetVersion) {
    const statusElement = elements[`${type}UpgradeStatus`];

    if (currentVersion === null || currentVersion === undefined) {
        statusElement.textContent = '--';
        statusElement.className = 'upgrade-status unknown';
    } else if (currentVersion >= targetVersion) {
        statusElement.textContent = '最新';
        statusElement.className = 'upgrade-status up-to-date';
    } else {
        statusElement.textContent = '需要升級';
        statusElement.className = 'upgrade-status needs-update';
    }
}

// 檢查電池警告
function checkBatteryWarning(battery) {
    if (battery <= 15) {
        elements.batteryWarning.style.display = 'flex';
        elements.upgradeWarnings.style.display = 'block';
    } else {
        elements.batteryWarning.style.display = 'none';
        if (!elements.fileWarning.style.display || elements.fileWarning.style.display === 'none') {
            elements.upgradeWarnings.style.display = 'none';
        }
    }
}

// 更新升級按鈕狀態
function updateUpgradeButtonState() {
    const hasLowBattery = currentVersions.battery <= 15;
    const needsUpgrade = (
        (currentVersions.ble < targetVersions.ble && firmwareFiles.ble) ||
        (currentVersions.ite < targetVersions.ite && firmwareFiles.ite) ||
        (currentVersions.bsp < targetVersions.bsp && firmwareFiles.bsp)
    );
    const hasSelectedFiles = firmwareFiles.ble || firmwareFiles.ite || firmwareFiles.bsp;

    elements.startUpgrade.disabled = hasLowBattery || !needsUpgrade || !hasSelectedFiles;

    // 更新檔案警告
    if (hasSelectedFiles) {
        elements.fileWarning.style.display = 'none';
    } else {
        elements.fileWarning.style.display = 'flex';
        elements.upgradeWarnings.style.display = 'block';
    }

    if (!hasSelectedFiles || hasLowBattery) {
        elements.upgradeWarnings.style.display = 'block';
    } else if (!elements.batteryWarning.style.display || elements.batteryWarning.style.display === 'none') {
        elements.upgradeWarnings.style.display = 'none';
    }
}

// 隱藏所有警告
function hideWarnings() {
    elements.upgradeWarnings.style.display = 'none';
    elements.batteryWarning.style.display = 'none';
    elements.fileWarning.style.display = 'none';
}

// 選擇固件檔案
async function selectFirmwareFile(type) {
    try {
        const result = await window.electronAPI.selectFirmwareFile(type);
        if (result.success && result.filePath) {
            firmwareFiles[type] = result.filePath;
            elements[`${type}FilePath`].value = result.filePath;
            addLog(`已選擇 ${type.toUpperCase()} 固件檔案: ${result.fileName}`, 'info');
            updateUpgradeButtonState();
        }
    } catch (error) {
        addLog(`選擇 ${type.toUpperCase()} 固件檔案時發生錯誤: ${error.message}`, 'error');
    }
}

// 檢查固件版本
async function checkFirmwareVersions() {
    const button = elements.checkFirmware;
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = '檢查中...';

    addLog('正在檢查固件版本...', 'info');

    try {
        const result = await window.electronAPI.checkPixer();

        if (result.success) {
            updateFirmwareVersions(result.deviceInfo);
            addLog('固件版本檢查完成', 'success');
        } else {
            addLog(`固件版本檢查失敗: ${result.error}`, 'error');
            updateFirmwareVersions(null);
        }
    } catch (error) {
        addLog(`檢查固件版本時發生錯誤: ${error.message}`, 'error');
        updateFirmwareVersions(null);
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// 開始固件升級
async function startFirmwareUpgrade() {
    // 確認對話框
    const confirmMessage = `
確定要開始固件升級嗎？

升級過程中請勿關閉應用程式或中斷連線。
升級完成後裝置將自動重啟。

選擇的固件檔案：
${firmwareFiles.ble ? `• BLE: ${firmwareFiles.ble.split('/').pop()}` : ''}
${firmwareFiles.ite ? `• ITE: ${firmwareFiles.ite.split('/').pop()}` : ''}
${firmwareFiles.bsp ? `• BSP: ${firmwareFiles.bsp.split('/').pop()}` : ''}
    `.trim();

    if (!confirm(confirmMessage)) {
        return;
    }

    const button = elements.startUpgrade;
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = '升級中...';

    // 顯示進度條
    elements.upgradeProgress.style.display = 'block';
    updateFirmwareProgress({ stage: '準備升級...', percentage: 0 });

    addLog('開始固件升級...', 'info');

    try {
        const upgradeParams = {
            bleFile: firmwareFiles.ble,
            iteFile: firmwareFiles.ite,
            bspFile: firmwareFiles.bsp,
            targetVersions: targetVersions
        };

        const result = await window.electronAPI.upgradeFirmware(upgradeParams);

        if (result.success) {
            addLog('固件升級完成！裝置將重新啟動', 'success');
            updateFirmwareProgress({ stage: '升級完成', percentage: 100 });

            // 清除選擇的檔案
            firmwareFiles = { ble: null, ite: null, bsp: null };
            elements.bleFilePath.value = '';
            elements.iteFilePath.value = '';
            elements.bspFilePath.value = '';

            // 3秒後隱藏進度條並重新檢查版本
            setTimeout(() => {
                elements.upgradeProgress.style.display = 'none';
                checkDevice(); // 重新檢查裝置狀態
            }, 3000);
        } else {
            addLog(`固件升級失敗: ${result.error}`, 'error');
            updateFirmwareProgress({ stage: '升級失敗', percentage: 0 });
        }
    } catch (error) {
        addLog(`固件升級時發生錯誤: ${error.message}`, 'error');
        updateFirmwareProgress({ stage: '升級錯誤', percentage: 0 });
    } finally {
        button.disabled = false;
        button.textContent = originalText;
        updateUpgradeButtonState();
    }
}

// 更新固件升級進度
function updateFirmwareProgress(progress) {
    elements.upgradeStage.textContent = progress.stage || '處理中...';
    elements.upgradePercentage.textContent = `${progress.percentage || 0}%`;
    elements.upgradeProgressFill.style.width = `${progress.percentage || 0}%`;
}
