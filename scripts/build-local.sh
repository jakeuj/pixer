#!/bin/bash

# Pixer Controller 本地建置腳本
# 用於在本地測試 CI/CD 流程

set -e

echo "🖼️  Pixer Controller 本地建置腳本"
echo "=================================="

# 檢查必要工具
echo "🔍 檢查必要工具..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝，請先安裝 Node.js"
    exit 1
fi

if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python 未安裝，請先安裝 Python 3.x"
    exit 1
fi

if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
    echo "❌ pip 未安裝，請先安裝 pip"
    exit 1
fi

echo "✅ 必要工具檢查完成"

# 設定 Python 命令
PYTHON_CMD="python3"
PIP_CMD="pip3"

if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
    PIP_CMD="pip"
fi

echo "📦 安裝 Python 依賴..."
$PIP_CMD install --upgrade pip
$PIP_CMD install Pillow PyInstaller

echo "📦 安裝 Node.js 依賴..."
npm ci

echo "🔨 建立 Python 獨立執行檔..."
mkdir -p python-dist

# 建立 upload 執行檔
echo "  - 建立 upload 執行檔..."
pyinstaller --onefile --distpath ./python-dist --name upload upload.py

# 建立 firmware_upgrade 執行檔
echo "  - 建立 firmware_upgrade 執行檔..."
pyinstaller --onefile --distpath ./python-dist --name firmware_upgrade firmware_upgrade.py

echo "✅ Python 執行檔建立完成"

# 備份原始檔案
echo "💾 備份原始檔案..."
cp package.json package.json.backup
cp main.js main.js.backup

# 更新 package.json
echo "⚙️  更新 package.json 配置..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS 配置
    cat > package.json << 'EOF'
{
  "name": "pixer-electron",
  "version": "1.0.0",
  "description": "Pixer E-Ink Photo Frame Controller",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --dev",
    "build": "electron-builder",
    "dist": "electron-builder --publish=never"
  },
  "keywords": ["pixer", "e-ink", "photo-frame", "electron"],
  "author": "jakeuj",
  "license": "Unlicense",
  "devDependencies": {
    "electron": "^27.0.0",
    "electron-builder": "^24.6.4"
  },
  "dependencies": {},
  "build": {
    "appId": "com.jakeuj.pixer",
    "productName": "Pixer Controller",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "renderer.js",
      "index.html",
      "styles.css",
      "python-dist/upload",
      "python-dist/firmware_upgrade",
      "ble.bin",
      "ite.bin",
      "pixer.bin"
    ],
    "extraResources": [
      {
        "from": "python-dist/upload",
        "to": "python-dist/upload"
      },
      {
        "from": "python-dist/firmware_upgrade",
        "to": "python-dist/firmware_upgrade"
      },
      {
        "from": "ble.bin",
        "to": "ble.bin"
      },
      {
        "from": "ite.bin",
        "to": "ite.bin"
      },
      {
        "from": "pixer.bin",
        "to": "pixer.bin"
      }
    ],
    "mac": {
      "category": "public.app-category.utilities",
      "target": {
        "target": "dmg",
        "arch": ["x64"]
      }
    }
  }
}
EOF
else
    # Windows/Linux 配置
    cat > package.json << 'EOF'
{
  "name": "pixer-electron",
  "version": "1.0.0",
  "description": "Pixer E-Ink Photo Frame Controller",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --dev",
    "build": "electron-builder",
    "dist": "electron-builder --publish=never"
  },
  "keywords": ["pixer", "e-ink", "photo-frame", "electron"],
  "author": "jakeuj",
  "license": "Unlicense",
  "devDependencies": {
    "electron": "^27.0.0",
    "electron-builder": "^24.6.4"
  },
  "dependencies": {},
  "build": {
    "appId": "com.jakeuj.pixer",
    "productName": "Pixer Controller",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "renderer.js",
      "index.html",
      "styles.css",
      "python-dist/upload.exe",
      "python-dist/firmware_upgrade.exe",
      "ble.bin",
      "ite.bin",
      "pixer.bin"
    ],
    "extraResources": [
      {
        "from": "python-dist/upload.exe",
        "to": "python-dist/upload.exe"
      },
      {
        "from": "python-dist/firmware_upgrade.exe",
        "to": "python-dist/firmware_upgrade.exe"
      },
      {
        "from": "ble.bin",
        "to": "ble.bin"
      },
      {
        "from": "ite.bin",
        "to": "ite.bin"
      },
      {
        "from": "pixer.bin",
        "to": "pixer.bin"
      }
    ],
    "win": {
      "target": {
        "target": "nsis",
        "arch": ["x64"]
      }
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
EOF
fi

# 建立支援獨立執行檔的 main.js
echo "⚙️  建立支援獨立執行檔的 main.js..."
cat > main.js << 'EOF'
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
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
    }
  });

  mainWindow.loadFile('index.html');

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

function getPythonExecutablePath(scriptName) {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    // 開發模式：使用獨立執行檔（本地建置測試）
    const ext = process.platform === 'win32' ? '.exe' : '';
    const localPath = path.join(__dirname, 'python-dist', `${scriptName}${ext}`);
    
    if (fs.existsSync(localPath)) {
      return {
        executable: localPath,
        script: null
      };
    } else {
      // 回退到原始 Python 腳本
      return {
        executable: getPythonPath(),
        script: path.join(__dirname, `${scriptName}.py`)
      };
    }
  } else {
    // 打包模式：使用獨立執行檔
    const resourcesPath = process.resourcesPath;
    const ext = process.platform === 'win32' ? '.exe' : '';
    return {
      executable: path.join(resourcesPath, 'python-dist', `${scriptName}${ext}`),
      script: null
    };
  }
}

function getPythonPath() {
  const pythonCommands = ['python3', 'python', 'py'];
  if (process.env.PYTHON_PATH) {
    return process.env.PYTHON_PATH;
  }
  return 'python3';
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

// 選擇圖片檔案
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 檢查 Pixer 裝置狀態
ipcMain.handle('check-pixer', async () => {
  return new Promise((resolve) => {
    const pythonConfig = getPythonExecutablePath('upload');
    const args = pythonConfig.script ? [pythonConfig.script] : [];
    
    const python = spawn(pythonConfig.executable, args, {
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
        resolve({
          success: true,
          output
        });
      } else {
        resolve({
          success: false,
          error: error || `Check failed with code ${code}`,
          output
        });
      }
    });

    python.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to start process: ${err.message}`
      });
    });
  });
});

// 上傳圖片到 Pixer
ipcMain.handle('upload-image', async (event, imagePath) => {
  return new Promise((resolve) => {
    const pythonConfig = getPythonExecutablePath('upload');
    const args = pythonConfig.script ? [pythonConfig.script, imagePath] : [imagePath];
    
    const python = spawn(pythonConfig.executable, args, {
      cwd: __dirname
    });

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
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
        error: `Failed to start process: ${err.message}`
      });
    });
  });
});

// 重置 Pixer 裝置
ipcMain.handle('reset-pixer', async () => {
  return new Promise((resolve) => {
    const resetScript = `
import sys
import os
sys.path.append('${__dirname}')
from upload import MainActivity

if __name__ == "__main__":
    activity = MainActivity()
    activity.reset()
`;
    
    const tempScriptPath = path.join(__dirname, 'temp_reset.py');
    fs.writeFileSync(tempScriptPath, resetScript);
    
    const pythonPath = getPythonPath();
    const python = spawn(pythonPath, [tempScriptPath], {
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
      try {
        fs.unlinkSync(tempScriptPath);
      } catch (e) {}
      
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
      try {
        fs.unlinkSync(tempScriptPath);
      } catch (e) {}
      
      resolve({
        success: false,
        error: `Failed to start Python process: ${err.message}`
      });
    });
  });
});
EOF

echo "🔨 建置 Electron 應用程式..."
npm run build

echo "🧹 清理暫存檔案..."
# 恢復原始檔案
mv package.json.backup package.json
mv main.js.backup main.js

echo "✅ 建置完成！"
echo ""
echo "📁 建置檔案位置："
ls -la dist/

echo ""
echo "🎉 本地建置測試完成！"
echo "   可以在 dist/ 目錄中找到建置好的應用程式"
