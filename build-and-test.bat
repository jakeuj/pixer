@echo off
chcp 65001 >nul
echo 🔧 Windows 打包修復測試腳本
echo.

REM 檢查是否在正確的目錄
if not exist "upload.py" (
    echo ❌ 錯誤：請在專案根目錄執行此腳本
    pause
    exit /b 1
)

echo 📦 步驟 1: 建立 Python 執行檔...
if not exist "python-dist" mkdir python-dist

REM 檢查 PyInstaller 是否已安裝
python -c "import PyInstaller" >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 安裝 PyInstaller...
    pip install PyInstaller
    if %errorlevel% neq 0 (
        echo ❌ PyInstaller 安裝失敗
        pause
        exit /b 1
    )
)

REM 建立 upload 執行檔
echo   - 建立 upload.exe...
pyinstaller --onefile --distpath ./python-dist --name upload upload.py
if %errorlevel% neq 0 (
    echo ❌ upload.exe 建立失敗
    pause
    exit /b 1
)

echo ✅ Python 執行檔建立完成

echo.
echo 🧪 步驟 2: 執行修復測試...
node test-windows-fix.js
if %errorlevel% neq 0 (
    echo ❌ 測試失敗
    pause
    exit /b 1
)

echo.
echo 🎉 所有測試完成！
echo.
echo 💡 如果測試通過，您可以：
echo    1. 執行 npm run build 建立完整的應用程式
echo    2. 在 dist 目錄中找到打包好的執行檔
echo    3. 測試實際的裝置檢查功能
echo.
pause
