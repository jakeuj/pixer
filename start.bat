@echo off
chcp 65001 >nul

echo 🖼️  Pixer Electron Controller
echo ================================

REM 檢查 Node.js 是否已安裝
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安裝，請先安裝 Node.js
    echo    下載地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 檢查 Python 是否已安裝
python --version >nul 2>&1
if %errorlevel% neq 0 (
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Python 未安裝，請先安裝 Python 3.x
        echo    下載地址: https://www.python.org/
        pause
        exit /b 1
    )
)

REM 檢查 Pillow 是否已安裝
echo 🔍 檢查 Python 依賴...
python -c "import PIL" >nul 2>&1
if %errorlevel% neq 0 (
    python3 -c "import PIL" >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Pillow 未安裝，正在安裝...
        pip install Pillow
        if %errorlevel% neq 0 (
            pip3 install Pillow
            if %errorlevel% neq 0 (
                echo ❌ Pillow 安裝失敗，請手動安裝: pip install Pillow
                pause
                exit /b 1
            )
        )
        echo ✅ Pillow 安裝成功
    )
)

REM 檢查 node_modules 是否存在
if not exist "node_modules" (
    echo 📦 安裝 Node.js 依賴...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依賴安裝失敗
        pause
        exit /b 1
    )
    echo ✅ 依賴安裝成功
)

REM 啟動應用程式
echo 🚀 啟動 Pixer Controller...
echo.
echo 💡 使用提示:
echo    1. 確保已連接到 Pixer 裝置的 WiFi 熱點
echo    2. 裝置 IP 應為 192.168.1.1
echo    3. 首次使用請先點擊「檢查裝置」
echo.

npm start
