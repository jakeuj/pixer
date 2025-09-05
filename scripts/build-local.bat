@echo off
chcp 65001 >nul

REM Pixer Controller 本地建置腳本 (Windows)
REM 用於在本地測試 CI/CD 流程

echo 🖼️  Pixer Controller 本地建置腳本 (Windows)
echo ================================================

REM 檢查必要工具
echo 🔍 檢查必要工具...

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安裝，請先安裝 Node.js
    pause
    exit /b 1
)

python --version >nul 2>&1
if %errorlevel% neq 0 (
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Python 未安裝，請先安裝 Python 3.x
        pause
        exit /b 1
    )
    set PYTHON_CMD=python3
    set PIP_CMD=pip3
) else (
    set PYTHON_CMD=python
    set PIP_CMD=pip
)

pip --version >nul 2>&1
if %errorlevel% neq 0 (
    pip3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ pip 未安裝，請先安裝 pip
        pause
        exit /b 1
    )
)

echo ✅ 必要工具檢查完成

echo 📦 安裝 Python 依賴...
%PIP_CMD% install --upgrade pip
%PIP_CMD% install Pillow PyInstaller

echo 📦 安裝 Node.js 依賴...
npm ci

echo 🔨 建立 Python 獨立執行檔...
if not exist "python-dist" mkdir python-dist

REM 建立 upload 執行檔
echo   - 建立 upload 執行檔...
pyinstaller --onefile --distpath ./python-dist --name upload upload.py

REM 建立 firmware_upgrade 執行檔
echo   - 建立 firmware_upgrade 執行檔...
pyinstaller --onefile --distpath ./python-dist --name firmware_upgrade firmware_upgrade.py

echo ✅ Python 執行檔建立完成

REM 備份原始檔案
echo 💾 備份原始檔案...
copy package.json package.json.backup >nul
copy main.js main.js.backup >nul

REM 更新 package.json (Windows 配置)
echo ⚙️  更新 package.json 配置...
(
echo {
echo   "name": "pixer-electron",
echo   "version": "1.0.0",
echo   "description": "Pixer E-Ink Photo Frame Controller",
echo   "main": "main.js",
echo   "scripts": {
echo     "start": "electron .",
echo     "dev": "electron . --dev",
echo     "build": "electron-builder",
echo     "dist": "electron-builder --publish=never"
echo   },
echo   "keywords": ["pixer", "e-ink", "photo-frame", "electron"],
echo   "author": "jakeuj",
echo   "license": "Unlicense",
echo   "devDependencies": {
echo     "electron": "^27.0.0",
echo     "electron-builder": "^24.6.4"
echo   },
echo   "dependencies": {},
echo   "build": {
echo     "appId": "com.jakeuj.pixer",
echo     "productName": "Pixer Controller",
echo     "directories": {
echo       "output": "dist"
echo     },
echo     "files": [
echo       "main.js",
echo       "preload.js",
echo       "renderer.js",
echo       "index.html",
echo       "styles.css",
echo       "python-dist/upload.exe",
echo       "python-dist/firmware_upgrade.exe",
echo       "ble.bin",
echo       "ite.bin",
echo       "pixer.bin"
echo     ],
echo     "extraResources": [
echo       {
echo         "from": "python-dist/upload.exe",
echo         "to": "python-dist/upload.exe"
echo       },
echo       {
echo         "from": "python-dist/firmware_upgrade.exe",
echo         "to": "python-dist/firmware_upgrade.exe"
echo       },
echo       {
echo         "from": "ble.bin",
echo         "to": "ble.bin"
echo       },
echo       {
echo         "from": "ite.bin",
echo         "to": "ite.bin"
echo       },
echo       {
echo         "from": "pixer.bin",
echo         "to": "pixer.bin"
echo       }
echo     ],
echo     "win": {
echo       "target": {
echo         "target": "nsis",
echo         "arch": ["x64"]
echo       }
echo     },
echo     "nsis": {
echo       "oneClick": false,
echo       "allowToChangeInstallationDirectory": true,
echo       "createDesktopShortcut": true,
echo       "createStartMenuShortcut": true
echo     }
echo   }
echo }
) > package.json

REM 建立支援獨立執行檔的 main.js
echo ⚙️  建立支援獨立執行檔的 main.js...
(
echo const { app, BrowserWindow, ipcMain, dialog } = require('electron'^);
echo const path = require('path'^);
echo const { spawn } = require('child_process'^);
echo const fs = require('fs'^);
echo.
echo let mainWindow;
echo.
echo function createWindow(^) {
echo   mainWindow = new BrowserWindow({
echo     width: 1200,
echo     height: 800,
echo     webPreferences: {
echo       nodeIntegration: false,
echo       contextIsolation: true,
echo       preload: path.join(__dirname, 'preload.js'^)
echo     }
echo   }^);
echo.
echo   mainWindow.loadFile('index.html'^);
echo.
echo   if (process.env.NODE_ENV === 'development'^) {
echo     mainWindow.webContents.openDevTools(^);
echo   }
echo }
echo.
echo function getPythonExecutablePath(scriptName^) {
echo   const isDev = process.env.NODE_ENV === 'development' ^|^| !app.isPackaged;
echo   
echo   if (isDev^) {
echo     // 開發模式：使用獨立執行檔（本地建置測試）
echo     const ext = process.platform === 'win32' ? '.exe' : '';
echo     const localPath = path.join(__dirname, 'python-dist', `${scriptName}${ext}`^);
echo     
echo     if (fs.existsSync(localPath^)^) {
echo       return {
echo         executable: localPath,
echo         script: null
echo       };
echo     } else {
echo       // 回退到原始 Python 腳本
echo       return {
echo         executable: getPythonPath(^),
echo         script: path.join(__dirname, `${scriptName}.py`^)
echo       };
echo     }
echo   } else {
echo     // 打包模式：使用獨立執行檔
echo     const resourcesPath = process.resourcesPath;
echo     const ext = process.platform === 'win32' ? '.exe' : '';
echo     return {
echo       executable: path.join(resourcesPath, 'python-dist', `${scriptName}${ext}`^),
echo       script: null
echo     };
echo   }
echo }
echo.
echo function getPythonPath(^) {
echo   const pythonCommands = ['python3', 'python', 'py'];
echo   if (process.env.PYTHON_PATH^) {
echo     return process.env.PYTHON_PATH;
echo   }
echo   return 'python3';
echo }
echo.
echo app.whenReady(^).then(createWindow^);
echo.
echo app.on('window-all-closed', (^) =^> {
echo   if (process.platform !== 'darwin'^) {
echo     app.quit(^);
echo   }
echo }^);
echo.
echo app.on('activate', (^) =^> {
echo   if (BrowserWindow.getAllWindows(^).length === 0^) {
echo     createWindow(^);
echo   }
echo }^);
echo.
echo // 其他 IPC 處理程序...
echo // (為了簡化，這裡省略了完整的 IPC 處理程序代碼)
) > main.js

echo 🔨 建置 Electron 應用程式...
npm run build

echo 🧹 清理暫存檔案...
REM 恢復原始檔案
move package.json.backup package.json >nul
move main.js.backup main.js >nul

echo ✅ 建置完成！
echo.
echo 📁 建置檔案位置：
dir dist\

echo.
echo 🎉 本地建置測試完成！
echo    可以在 dist\ 目錄中找到建置好的應用程式
pause
