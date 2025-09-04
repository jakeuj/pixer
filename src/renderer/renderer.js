// DOM elements
const elements = {
    connectionStatus: document.getElementById('connection-status'),
    batteryLevel: document.getElementById('battery-level'),
    bleVersion: document.getElementById('ble-version'),
    iteVersion: document.getElementById('ite-version'),
    mcuVersion: document.getElementById('mcu-version'),
    checkDeviceBtn: document.getElementById('check-device-btn'),
    resetDeviceBtn: document.getElementById('reset-device-btn'),
    selectImageBtn: document.getElementById('select-image-btn'),
    uploadImageBtn: document.getElementById('upload-image-btn'),
    imagePreview: document.getElementById('image-preview'),
    selectedFileInfo: document.getElementById('selected-file-info'),
    fileName: document.getElementById('file-name'),
    fileSize: document.getElementById('file-size'),
    progressSection: document.getElementById('progress-section'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    bleBinStatus: document.getElementById('ble-bin-status'),
    iteBinStatus: document.getElementById('ite-bin-status'),
    pixerBinStatus: document.getElementById('pixer-bin-status'),
    logContainer: document.getElementById('log-container'),
    clearLogBtn: document.getElementById('clear-log-btn'),
    appInfo: document.getElementById('app-info')
};

// Application state
let selectedImagePath = null;

// Initialize the application
async function init() {
    await loadAppInfo();
    await checkFirmwareFiles();
    setupEventListeners();
    addLogEntry('Application initialized', 'info');
}

// Load application information
async function loadAppInfo() {
    try {
        const appInfo = await window.electronAPI.getAppInfo();
        elements.appInfo.textContent = `${appInfo.name} v${appInfo.version} (${appInfo.platform})`;
    } catch (error) {
        addLogEntry(`Failed to load app info: ${error.message}`, 'error');
    }
}

// Check firmware files availability
async function checkFirmwareFiles() {
    try {
        const firmwareFiles = await window.electronAPI.checkFirmwareFiles();
        
        elements.bleBinStatus.textContent = firmwareFiles['ble.bin'] ? '✅ Available' : '❌ Missing';
        elements.bleBinStatus.className = `status ${firmwareFiles['ble.bin'] ? 'connected' : 'disconnected'}`;
        
        elements.iteBinStatus.textContent = firmwareFiles['ite.bin'] ? '✅ Available' : '❌ Missing';
        elements.iteBinStatus.className = `status ${firmwareFiles['ite.bin'] ? 'connected' : 'disconnected'}`;
        
        elements.pixerBinStatus.textContent = firmwareFiles['pixer.bin'] ? '✅ Available' : '❌ Missing';
        elements.pixerBinStatus.className = `status ${firmwareFiles['pixer.bin'] ? 'connected' : 'disconnected'}`;
        
        addLogEntry('Firmware files checked', 'info');
    } catch (error) {
        addLogEntry(`Failed to check firmware files: ${error.message}`, 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    elements.checkDeviceBtn.addEventListener('click', checkDevice);
    elements.resetDeviceBtn.addEventListener('click', resetDevice);
    elements.selectImageBtn.addEventListener('click', selectImage);
    elements.uploadImageBtn.addEventListener('click', uploadImage);
    elements.clearLogBtn.addEventListener('click', clearLog);
    
    // Listen for upload progress
    window.electronAPI.onUploadProgress((progress) => {
        updateProgress(progress);
    });

    // Listen for log messages from main process
    window.electronAPI.onLogMessage((logData) => {
        addLogEntry(logData.message, logData.level);
    });
}

// Check device status
async function checkDevice() {
    elements.checkDeviceBtn.disabled = true;
    elements.checkDeviceBtn.textContent = 'Checking...';
    
    try {
        addLogEntry('Checking device connection...', 'info');
        const result = await window.electronAPI.checkDevice();
        
        if (result.success) {
            const data = result.data;
            elements.connectionStatus.textContent = 'Connected';
            elements.connectionStatus.className = 'status connected';
            elements.batteryLevel.textContent = `${data.batteryLevel}%`;
            elements.bleVersion.textContent = data.bleVersion || '--';
            elements.iteVersion.textContent = data.iteVersion || '--';
            elements.mcuVersion.textContent = data.mcuVersion || '--';
            
            addLogEntry(`Device connected - Battery: ${data.batteryLevel}%`, 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        elements.connectionStatus.textContent = 'Disconnected';
        elements.connectionStatus.className = 'status disconnected';
        elements.batteryLevel.textContent = '--';
        elements.bleVersion.textContent = '--';
        elements.iteVersion.textContent = '--';
        elements.mcuVersion.textContent = '--';
        
        addLogEntry(`Device check failed: ${error.message}`, 'error');
    } finally {
        elements.checkDeviceBtn.disabled = false;
        elements.checkDeviceBtn.textContent = 'Check Device';
    }
}

// Reset device
async function resetDevice() {
    if (!confirm('Are you sure you want to reset the device?')) {
        return;
    }
    
    elements.resetDeviceBtn.disabled = true;
    elements.resetDeviceBtn.textContent = 'Resetting...';
    
    try {
        addLogEntry('Sending reset command...', 'info');
        const result = await window.electronAPI.resetDevice();
        
        if (result.success) {
            addLogEntry('Device reset command sent successfully', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        addLogEntry(`Reset failed: ${error.message}`, 'error');
    } finally {
        elements.resetDeviceBtn.disabled = false;
        elements.resetDeviceBtn.textContent = 'Reset Device';
    }
}

// Select image file
async function selectImage() {
    try {
        const imagePath = await window.electronAPI.selectImageFile();
        
        if (imagePath) {
            selectedImagePath = imagePath;
            
            // Update UI
            const fileName = imagePath.split('/').pop();
            elements.fileName.textContent = fileName;
            
            // Get file size (approximate)
            elements.fileSize.textContent = 'Selected';
            
            // Show file info
            elements.selectedFileInfo.style.display = 'block';
            
            // Enable upload button
            elements.uploadImageBtn.disabled = false;
            
            // Update preview
            updateImagePreview(imagePath);
            
            addLogEntry(`Image selected: ${fileName}`, 'info');
        }
    } catch (error) {
        addLogEntry(`Failed to select image: ${error.message}`, 'error');
    }
}

// Update image preview
function updateImagePreview(imagePath) {
    elements.imagePreview.innerHTML = `
        <img src="file://${imagePath}" alt="Selected image" class="preview-image">
    `;
    elements.imagePreview.classList.add('has-image');
}

// Upload image
async function uploadImage() {
    if (!selectedImagePath) {
        addLogEntry('No image selected', 'error');
        return;
    }
    
    elements.uploadImageBtn.disabled = true;
    elements.uploadImageBtn.textContent = 'Uploading...';
    elements.progressSection.style.display = 'block';
    
    try {
        addLogEntry('Starting image upload...', 'info');
        const result = await window.electronAPI.uploadImage(selectedImagePath);
        
        if (result.success) {
            addLogEntry('Image uploaded successfully!', 'success');
            updateProgress(100);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        addLogEntry(`Upload failed: ${error.message}`, 'error');
    } finally {
        elements.uploadImageBtn.disabled = false;
        elements.uploadImageBtn.textContent = 'Upload to Device';
        
        // Hide progress after a delay
        setTimeout(() => {
            elements.progressSection.style.display = 'none';
            updateProgress(0);
        }, 3000);
    }
}

// Update progress bar
function updateProgress(progress) {
    elements.progressFill.style.width = `${progress}%`;
    elements.progressText.textContent = `${progress}%`;
}

// Add log entry
function addLogEntry(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('p');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    elements.logContainer.appendChild(logEntry);
    elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
}

// Clear log
function clearLog() {
    elements.logContainer.innerHTML = '<p class="log-entry">Log cleared</p>';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
