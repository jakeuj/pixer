const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Import our custom modules
const PixerClient = require('./pixer-client');
const ImageProcessor = require('./image-processor');

let mainWindow;
let pixerClient;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Initialize Pixer client
pixerClient = new PixerClient();

// IPC handlers
ipcMain.handle('select-image-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('check-device', async () => {
  try {
    const deviceInfo = await pixerClient.checkDevice();
    return { success: true, data: deviceInfo };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-device', async () => {
  try {
    await pixerClient.resetDevice();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('upload-image', async (event, imagePath) => {
  try {
    log(`Starting image upload for: ${imagePath}`, 'info');

    // Process the image
    const imageProcessor = new ImageProcessor(imagePath);
    const processedData = await imageProcessor.convert();

    if (!processedData) {
      throw new Error('Failed to process image');
    }

    log(`Image processed successfully, size: ${processedData.length} bytes`, 'info');

    // Create a new client instance for upload to ensure fresh connection
    const uploadClient = new PixerClient();

    // Upload to device with progress updates
    const result = await uploadClient.uploadImage(processedData, (progress) => {
      mainWindow.webContents.send('upload-progress', progress);
    });

    log('Image upload completed successfully', 'info');
    return { success: true, data: result };
  } catch (error) {
    log(`Upload failed: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});

// Handle firmware file checking
ipcMain.handle('check-firmware-files', async () => {
  const firmwareFiles = ['ble.bin', 'ite.bin', 'pixer.bin'];
  const availableFiles = {};
  
  for (const file of firmwareFiles) {
    const filePath = path.join(process.cwd(), file);
    availableFiles[file] = fs.existsSync(filePath);
  }
  
  return availableFiles;
});

// Handle app info
ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform
  };
});

// Enhanced logging
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);

  // Send to renderer for display in log
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('log-message', { message, level, timestamp });
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'error');
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
});
