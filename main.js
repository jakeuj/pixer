const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // 可選：應用程式圖示
    title: 'Pixer Controller'
  });

  mainWindow.loadFile('index.html');

  // 開發模式下開啟開發者工具
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

// IPC 處理程序

// 選擇圖片檔案
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 檢查 Pixer 裝置狀態
ipcMain.handle('check-pixer', async () => {
  return new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();
    const scriptPath = path.join(__dirname, 'upload.py');
    
    const python = spawn(pythonPath, [scriptPath], {
      cwd: __dirname
    });

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        // 解析輸出以獲取裝置資訊
        // 合併 stdout 和 stderr 來解析
        const allOutput = output + '\n' + error;
        const lines = allOutput.split('\n');
        const deviceInfo = {};

        lines.forEach(line => {
          if (line.includes('Battery=')) {
            const value = line.split('Battery=')[1];
            if (value) {
              deviceInfo.battery = value.trim();
            }
          }
          if (line.includes('BLE Version=')) {
            const value = line.split('BLE Version=')[1];
            if (value) {
              deviceInfo.bleVersion = value.trim();
            }
          }
          if (line.includes('MCU Version=')) {
            const value = line.split('MCU Version=')[1];
            if (value) {
              deviceInfo.mcuVersion = value.trim();
            }
          }
          if (line.includes('ITE Version=')) {
            const value = line.split('ITE Version=')[1];
            if (value) {
              deviceInfo.iteVersion = value.trim();
            }
          }
        });

        resolve({
          success: true,
          deviceInfo,
          output
        });
      } else {
        resolve({
          success: false,
          error: error || `Python script exited with code ${code}`,
          output
        });
      }
    });

    python.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to start Python process: ${err.message}`
      });
    });
  });
});

// 上傳圖片到 Pixer
ipcMain.handle('upload-image', async (event, imagePath) => {
  return new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();
    const scriptPath = path.join(__dirname, 'upload.py');
    
    const python = spawn(pythonPath, [scriptPath, imagePath], {
      cwd: __dirname
    });

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      // 發送進度更新到渲染程序
      if (chunk.includes('progress:')) {
        const progressMatch = chunk.match(/progress: (\d+)%/);
        if (progressMatch) {
          mainWindow.webContents.send('upload-progress', parseInt(progressMatch[1]));
        }
      }
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          output
        });
      } else {
        resolve({
          success: false,
          error: error || `Upload failed with code ${code}`,
          output
        });
      }
    });

    python.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to start Python process: ${err.message}`
      });
    });
  });
});

// 重置 Pixer 裝置
ipcMain.handle('reset-pixer', async () => {
  return new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();
    const scriptPath = path.join(__dirname, 'reset_pixer.py');
    
    // 建立臨時的重置腳本
    const resetScript = `
import sys
import os
sys.path.append('${__dirname}')
from upload import MainActivity

activity = MainActivity()
activity.reset()
`;

    fs.writeFileSync(scriptPath, resetScript);

    const python = spawn(pythonPath, [scriptPath], {
      cwd: __dirname
    });

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      // 清理臨時檔案
      try {
        fs.unlinkSync(scriptPath);
      } catch (e) {
        // 忽略清理錯誤
      }

      if (code === 0) {
        resolve({
          success: true,
          output
        });
      } else {
        resolve({
          success: false,
          error: error || `Reset failed with code ${code}`,
          output
        });
      }
    });

    python.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to start Python process: ${err.message}`
      });
    });
  });
});

// 獲取 Python 執行路徑
function getPythonPath() {
  // 嘗試不同的 Python 命令
  const pythonCommands = ['python3', 'python', 'py'];
  
  // 在開發環境中，可以設定環境變數 PYTHON_PATH
  if (process.env.PYTHON_PATH) {
    return process.env.PYTHON_PATH;
  }
  
  // 預設使用 python3
  return 'python3';
}
