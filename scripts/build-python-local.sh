#!/bin/bash

# 本地 Python 打包測試腳本
# 用於在本地環境測試 PyInstaller 設定是否正確

echo "🐍 本地 Python 打包測試"
echo "========================"

# 檢查 Python 是否已安裝
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python 未安裝，請先安裝 Python 3.x"
    exit 1
fi

# 確定使用的 Python 命令
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

echo "📋 使用的 Python 命令: $PYTHON_CMD"
echo "📋 Python 版本: $($PYTHON_CMD --version)"

# 檢查必要的依賴
echo "🔍 檢查 Python 依賴..."
$PYTHON_CMD -c "import PIL" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Pillow 未安裝，正在安裝..."
    pip3 install Pillow || pip install Pillow
    if [ $? -ne 0 ]; then
        echo "❌ Pillow 安裝失敗"
        exit 1
    fi
    echo "✅ Pillow 安裝成功"
fi

$PYTHON_CMD -c "import PyInstaller" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ PyInstaller 未安裝，正在安裝..."
    pip3 install PyInstaller || pip install PyInstaller
    if [ $? -ne 0 ]; then
        echo "❌ PyInstaller 安裝失敗"
        exit 1
    fi
    echo "✅ PyInstaller 安裝成功"
fi

# 建立 python-dist 目錄
echo "📁 建立輸出目錄..."
mkdir -p python-dist

# 打包 upload.py
echo "📦 打包 upload.py..."
pyinstaller --onefile --distpath ./python-dist --name upload upload.py
if [ $? -ne 0 ]; then
    echo "❌ upload.py 打包失敗"
    exit 1
fi

# 打包 firmware_upgrade.py
echo "📦 打包 firmware_upgrade.py..."
pyinstaller --onefile --distpath ./python-dist --name firmware_upgrade firmware_upgrade.py
if [ $? -ne 0 ]; then
    echo "❌ firmware_upgrade.py 打包失敗"
    exit 1
fi

echo "✅ Python 打包完成"
echo ""
echo "📋 打包結果:"
ls -la python-dist/

# 測試執行檔
echo ""
echo "🧪 測試執行檔..."

# 測試 upload 執行檔
echo "測試 upload 執行檔..."
./python-dist/upload > /dev/null 2>&1
UPLOAD_EXIT_CODE=$?
if [ $UPLOAD_EXIT_CODE -eq 0 ] || [ $UPLOAD_EXIT_CODE -eq 1 ]; then
    echo "✅ upload 執行檔可以正常啟動"
else
    echo "❌ upload 執行檔啟動失敗 (退出碼: $UPLOAD_EXIT_CODE)"
fi

# 測試 firmware_upgrade 執行檔
echo "測試 firmware_upgrade 執行檔..."
./python-dist/firmware_upgrade > /dev/null 2>&1
FW_EXIT_CODE=$?
if [ $FW_EXIT_CODE -eq 0 ] || [ $FW_EXIT_CODE -eq 1 ]; then
    echo "✅ firmware_upgrade 執行檔可以正常啟動"
else
    echo "❌ firmware_upgrade 執行檔啟動失敗 (退出碼: $FW_EXIT_CODE)"
fi

echo ""
echo "🎉 本地打包測試完成！"
echo "💡 現在可以執行 'npm run dev' 來測試 Electron 應用程式"
