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
    console.log('[check-pixer] Starting device check...');

    const pythonConfig = getPythonExecutablePath('upload');
    const args = pythonConfig.script ? [pythonConfig.script] : [];

    console.log(`[check-pixer] Spawning: ${pythonConfig.executable}`);
    console.log(`[check-pixer] Args: ${JSON.stringify(args)}`);
    console.log(`[check-pixer] Working directory: ${__dirname}`);

    // 設定正確的工作目錄
    const workingDir = app.isPackaged ? process.resourcesPath : __dirname;
    console.log(`[check-pixer] Working directory: ${workingDir}`);

    // 設定環境變數，在 Windows 上確保正確的編碼
    const spawnEnv = { ...process.env };
    if (process.platform === 'win32') {
      spawnEnv.PYTHONIOENCODING = 'utf-8';
      spawnEnv.LANG = 'zh_TW.UTF-8';
    }

    // 嘗試使用 shell 模式來處理路徑中的空格
    const python = spawn(pythonConfig.executable, args, {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: spawnEnv,
      shell: true,
      windowsHide: true
    });

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      // 在 Windows 上處理編碼問題
      const text = process.platform === 'win32'
        ? data.toString('utf8')
        : data.toString();
      output += text;
    });

    python.stderr.on('data', (data) => {
      // 在 Windows 上處理編碼問題
      const text = process.platform === 'win32'
        ? data.toString('utf8')
        : data.toString();
      error += text;
    });

    python.on('close', (code) => {
      // 清理符號連結
      if (pythonConfig.cleanup) {
        pythonConfig.cleanup();
      }

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
      console.log(`[check-pixer] Process error: ${err.message}`);
      console.log(`[check-pixer] Error code: ${err.code}`);
      console.log(`[check-pixer] Error errno: ${err.errno}`);
      console.log(`[check-pixer] Error syscall: ${err.syscall}`);
      console.log(`[check-pixer] Error path: ${err.path}`);

      resolve({
        success: false,
        error: `Failed to start Python process: ${err.message} (code: ${err.code})`
      });
    });
  });
});

// 上傳圖片到 Pixer
ipcMain.handle('upload-image', async (event, imagePath) => {
  return new Promise((resolve, reject) => {
    console.log('[upload-image] Starting image upload...');

    const pythonConfig = getPythonExecutablePath('upload');
    const args = pythonConfig.script ? [pythonConfig.script, imagePath] : [imagePath];

    console.log(`[upload-image] Spawning: ${pythonConfig.executable}`);
    console.log(`[upload-image] Args: ${JSON.stringify(args)}`);

    // 設定正確的工作目錄
    const workingDir = app.isPackaged ? process.resourcesPath : __dirname;
    console.log(`[upload-image] Working directory: ${workingDir}`);

    // 設定環境變數，在 Windows 上確保正確的編碼
    const spawnEnv = { ...process.env };
    if (process.platform === 'win32') {
      spawnEnv.PYTHONIOENCODING = 'utf-8';
      spawnEnv.LANG = 'zh_TW.UTF-8';
    }

    const python = spawn(pythonConfig.executable, args, {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: spawnEnv,
      shell: true,
      windowsHide: true
    });

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      // 在 Windows 上處理編碼問題
      const chunk = process.platform === 'win32'
        ? data.toString('utf8')
        : data.toString();
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
      // 在 Windows 上處理編碼問題
      const text = process.platform === 'win32'
        ? data.toString('utf8')
        : data.toString();
      error += text;
    });

    python.on('close', (code) => {
      // 清理臨時檔案
      if (pythonConfig.cleanup) {
        pythonConfig.cleanup();
      }

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
      console.log(`[upload-image] Process error: ${err.message}`);
      console.log(`[upload-image] Error code: ${err.code}`);
      console.log(`[upload-image] Error errno: ${err.errno}`);
      console.log(`[upload-image] Error syscall: ${err.syscall}`);
      console.log(`[upload-image] Error path: ${err.path}`);

      // 清理臨時檔案
      if (pythonConfig.cleanup) {
        pythonConfig.cleanup();
      }

      resolve({
        success: false,
        error: `Failed to start Python process: ${err.message} (code: ${err.code})`
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

// 獲取 Python 執行檔路徑
function getPythonExecutablePath(scriptName) {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const ext = process.platform === 'win32' ? '.exe' : '';

  console.log(`[DEBUG] Getting Python executable path for ${scriptName}`);
  console.log(`[DEBUG] isDev: ${isDev}, platform: ${process.platform}`);

  if (isDev) {
    // 開發模式：檢查是否有本地建置的執行檔
    const localPath = path.join(__dirname, 'python-dist', `${scriptName}${ext}`);
    console.log(`[DEBUG] Checking local path: ${localPath}`);

    if (fs.existsSync(localPath)) {
      console.log(`[DEBUG] Using local executable: ${localPath}`);
      return {
        executable: localPath,
        script: null
      };
    } else {
      // 回退到原始 Python 腳本
      const pythonPath = getPythonPath();
      const scriptPath = path.join(__dirname, `${scriptName}.py`);
      console.log(`[DEBUG] Using Python script: ${pythonPath} ${scriptPath}`);
      return {
        executable: pythonPath,
        script: scriptPath
      };
    }
  } else {
    // 打包模式：使用獨立執行檔
    const resourcesPath = process.resourcesPath;
    const executablePath = path.join(resourcesPath, 'python-dist', `${scriptName}${ext}`);
    console.log(`[DEBUG] Production mode - resourcesPath: ${resourcesPath}`);
    console.log(`[DEBUG] Production mode - executable path: ${executablePath}`);
    console.log(`[DEBUG] Production mode - file exists: ${fs.existsSync(executablePath)}`);

    // 檢查檔案是否存在
    if (!fs.existsSync(executablePath)) {
      console.error(`[ERROR] Python executable not found: ${executablePath}`);
      // 列出 python-dist 目錄內容以便除錯
      const pythonDistPath = path.join(resourcesPath, 'python-dist');
      if (fs.existsSync(pythonDistPath)) {
        console.log(`[DEBUG] Contents of ${pythonDistPath}:`);
        try {
          const files = fs.readdirSync(pythonDistPath);
          files.forEach(file => console.log(`[DEBUG]   - ${file}`));
        } catch (e) {
          console.error(`[ERROR] Failed to list directory: ${e.message}`);
        }
      } else {
        console.error(`[ERROR] python-dist directory not found: ${pythonDistPath}`);
      }
    }

    // 在 Windows 上，複製執行檔到臨時目錄來避免路徑和副檔名問題
    // 在 macOS/Linux 上，直接使用原始路徑以保持穩定性
    if (process.platform === 'win32') {
      const tempDir = require('os').tmpdir();
      // 確保臨時檔案有正確的副檔名
      const tempExecutable = path.join(tempDir, `pixer_${scriptName}_${Date.now()}${ext}`);

      try {
        // 複製執行檔
        if (fs.existsSync(tempExecutable)) {
          fs.unlinkSync(tempExecutable);
        }
        fs.copyFileSync(executablePath, tempExecutable);

        // Windows 上主要依賴副檔名，但仍嘗試設定權限
        try {
          fs.chmodSync(tempExecutable, 0o755);
        } catch (chmodError) {
          console.warn(`[WARN] Failed to set permissions on Windows: ${chmodError.message}`);
        }

        console.log(`[DEBUG] Windows: Copied executable to temp: ${tempExecutable}`);

        return {
          executable: tempExecutable,
          script: null,
          cleanup: () => {
            try {
              if (fs.existsSync(tempExecutable)) {
                fs.unlinkSync(tempExecutable);
              }
            } catch (e) {
              console.error(`[ERROR] Failed to cleanup temp file: ${e.message}`);
            }
          }
        };
      } catch (e) {
        console.error(`[ERROR] Windows: Failed to copy executable: ${e.message}`);
        // 回退到原始路徑，用引號包圍路徑
        const finalExecutablePath = executablePath.includes(' ')
          ? `"${executablePath}"`
          : executablePath;

        return {
          executable: finalExecutablePath,
          script: null
        };
      }
    } else {
      // macOS/Linux: 直接使用原始路徑，設定執行權限
      try {
        fs.chmodSync(executablePath, 0o755);
      } catch (chmodError) {
        console.warn(`[WARN] Failed to set permissions: ${chmodError.message}`);
      }

      console.log(`[DEBUG] macOS/Linux: Using original executable: ${executablePath}`);

      return {
        executable: executablePath,
        script: null
      };
    }
  }
}

// 獲取 Python 執行路徑（開發模式用）
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

// 選擇固件檔案
ipcMain.handle('select-firmware-file', async (event, type) => {
  const filters = [
    { name: 'Binary Files', extensions: ['bin'] },
    { name: 'All Files', extensions: ['*'] }
  ];

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters,
    title: `選擇 ${type.toUpperCase()} 固件檔案`
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);

    return {
      success: true,
      filePath: filePath,
      fileName: fileName
    };
  }

  return { success: false };
});

// 固件升級
ipcMain.handle('upgrade-firmware', async (event, params) => {
  return new Promise((resolve) => {
    console.log('[upgrade-firmware] Starting firmware upgrade...');

    const pythonConfig = getPythonExecutablePath('firmware_upgrade');
    const args = pythonConfig.script ? [pythonConfig.script] : [];

    // 添加固件檔案參數
    if (params.bleFile) {
      args.push('--ble-file', params.bleFile);
    }
    if (params.iteFile) {
      args.push('--ite-file', params.iteFile);
    }
    if (params.bspFile) {
      args.push('--bsp-file', params.bspFile);
    }

    // 添加目標版本參數
    if (params.targetVersions) {
      args.push('--ble-version', params.targetVersions.ble.toString());
      args.push('--ite-version', params.targetVersions.ite.toString());
      args.push('--bsp-version', params.targetVersions.bsp.toString());
    }

    console.log(`[upgrade-firmware] Spawning: ${pythonConfig.executable}`);
    console.log(`[upgrade-firmware] Args: ${JSON.stringify(args)}`);

    // 設定正確的工作目錄
    const workingDir = app.isPackaged ? process.resourcesPath : __dirname;
    console.log(`[upgrade-firmware] Working directory: ${workingDir}`);

    // 設定環境變數，在 Windows 上確保正確的編碼
    const spawnEnv = { ...process.env };
    if (process.platform === 'win32') {
      spawnEnv.PYTHONIOENCODING = 'utf-8';
      spawnEnv.LANG = 'zh_TW.UTF-8';
    }

    const python = spawn(pythonConfig.executable, args, {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: spawnEnv,
      shell: true,
      windowsHide: true
    });

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      // 在 Windows 上處理編碼問題
      const text = process.platform === 'win32'
        ? data.toString('utf8')
        : data.toString();
      output += text;
      console.log('Firmware upgrade stdout:', text);

      // 解析進度資訊
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes('[FW]')) {
          // 發送進度更新到前端
          if (line.includes('BLE update')) {
            mainWindow.webContents.send('firmware-progress', {
              stage: '正在升級 BLE 固件...',
              percentage: 25
            });
          } else if (line.includes('ITE update')) {
            mainWindow.webContents.send('firmware-progress', {
              stage: '正在升級 ITE 固件...',
              percentage: 50
            });
          } else if (line.includes('BSP update')) {
            mainWindow.webContents.send('firmware-progress', {
              stage: '正在升級 BSP 固件...',
              percentage: 75
            });
          } else if (line.includes('sent: off') || line.includes('sent: reset')) {
            mainWindow.webContents.send('firmware-progress', {
              stage: '重啟裝置中...',
              percentage: 90
            });
          }
        }
      }
    });

    python.stderr.on('data', (data) => {
      // 在 Windows 上處理編碼問題
      const text = process.platform === 'win32'
        ? data.toString('utf8')
        : data.toString();
      errorOutput += text;
      console.error('Firmware upgrade stderr:', text);
    });

    python.on('close', (code) => {
      // 清理臨時檔案
      if (pythonConfig.cleanup) {
        pythonConfig.cleanup();
      }

      console.log(`Firmware upgrade process exited with code ${code}`);

      if (code === 0) {
        resolve({
          success: true,
          output: output
        });
      } else {
        resolve({
          success: false,
          error: errorOutput || `Process exited with code ${code}`,
          output: output
        });
      }
    });

    python.on('error', (err) => {
      // 清理臨時檔案
      if (pythonConfig.cleanup) {
        pythonConfig.cleanup();
      }

      console.log(`[upgrade-firmware] Process error: ${err.message}`);
      console.log(`[upgrade-firmware] Error code: ${err.code}`);
      console.log(`[upgrade-firmware] Error errno: ${err.errno}`);
      console.log(`[upgrade-firmware] Error syscall: ${err.syscall}`);
      console.log(`[upgrade-firmware] Error path: ${err.path}`);

      resolve({
        success: false,
        error: `Failed to start firmware upgrade process: ${err.message} (code: ${err.code})`
      });
    });
  });
});
