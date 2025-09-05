@echo off
chcp 65001 >nul

REM 本地 Python 打包測試腳本 (Windows)
REM 用於在本地環境測試 PyInstaller 設定是否正確

echo 🐍 本地 Python 打包測試
echo ========================

REM 檢查 Python 是否已安裝
python --version >nul 2>&1
if %errorlevel% neq 0 (
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Python 未安裝，請先安裝 Python 3.x
        pause
        exit /b 1
    )
    set PYTHON_CMD=python3
) else (
    set PYTHON_CMD=python
)

echo 📋 使用的 Python 命令: %PYTHON_CMD%
%PYTHON_CMD% --version

REM 檢查必要的依賴
echo 🔍 檢查 Python 依賴...
%PYTHON_CMD% -c "import PIL" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Pillow 未安裝，正在安裝...
    pip install Pillow
    if %errorlevel% neq 0 (
        echo ❌ Pillow 安裝失敗
        pause
        exit /b 1
    )
    echo ✅ Pillow 安裝成功
)

%PYTHON_CMD% -c "import PyInstaller" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PyInstaller 未安裝，正在安裝...
    pip install PyInstaller
    if %errorlevel% neq 0 (
        echo ❌ PyInstaller 安裝失敗
        pause
        exit /b 1
    )
    echo ✅ PyInstaller 安裝成功
)

REM 建立 python-dist 目錄
echo 📁 建立輸出目錄...
if not exist "python-dist" mkdir python-dist

REM 打包 upload.py
echo 📦 打包 upload.py...
pyinstaller --onefile --distpath ./python-dist --name upload upload.py
if %errorlevel% neq 0 (
    echo ❌ upload.py 打包失敗
    pause
    exit /b 1
)

REM 打包 firmware_upgrade.py
echo 📦 打包 firmware_upgrade.py...
pyinstaller --onefile --distpath ./python-dist --name firmware_upgrade firmware_upgrade.py
if %errorlevel% neq 0 (
    echo ❌ firmware_upgrade.py 打包失敗
    pause
    exit /b 1
)

echo ✅ Python 打包完成
echo.
echo 📋 打包結果:
dir python-dist

REM 測試執行檔
echo.
echo 🧪 測試執行檔...

REM 測試 upload 執行檔
echo 測試 upload 執行檔...
python-dist\upload.exe >nul 2>&1
set UPLOAD_EXIT_CODE=%errorlevel%
if %UPLOAD_EXIT_CODE% equ 0 (
    echo ✅ upload 執行檔可以正常啟動
) else if %UPLOAD_EXIT_CODE% equ 1 (
    echo ✅ upload 執行檔可以正常啟動
) else (
    echo ❌ upload 執行檔啟動失敗 (退出碼: %UPLOAD_EXIT_CODE%)
)

REM 測試 firmware_upgrade 執行檔
echo 測試 firmware_upgrade 執行檔...
python-dist\firmware_upgrade.exe >nul 2>&1
set FW_EXIT_CODE=%errorlevel%
if %FW_EXIT_CODE% equ 0 (
    echo ✅ firmware_upgrade 執行檔可以正常啟動
) else if %FW_EXIT_CODE% equ 1 (
    echo ✅ firmware_upgrade 執行檔可以正常啟動
) else (
    echo ❌ firmware_upgrade 執行檔啟動失敗 (退出碼: %FW_EXIT_CODE%)
)

echo.
echo 🎉 本地打包測試完成！
echo 💡 現在可以執行 'npm run dev' 來測試 Electron 應用程式
pause
