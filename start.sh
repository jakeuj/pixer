#!/bin/bash

# Pixer Electron 應用程式啟動腳本

echo "🖼️  Pixer Electron Controller"
echo "================================"

# 檢查 Node.js 是否已安裝
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝，請先安裝 Node.js"
    echo "   下載地址: https://nodejs.org/"
    exit 1
fi

# 檢查 Python 是否已安裝
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python 未安裝，請先安裝 Python 3.x"
    echo "   下載地址: https://www.python.org/"
    exit 1
fi

# 檢查 Pillow 是否已安裝
echo "🔍 檢查 Python 依賴..."
python3 -c "import PIL" 2>/dev/null || python -c "import PIL" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Pillow 未安裝，正在安裝..."
    pip3 install Pillow || pip install Pillow
    if [ $? -ne 0 ]; then
        echo "❌ Pillow 安裝失敗，請手動安裝: pip install Pillow"
        exit 1
    fi
    echo "✅ Pillow 安裝成功"
fi

# 檢查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 安裝 Node.js 依賴..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依賴安裝失敗"
        exit 1
    fi
    echo "✅ 依賴安裝成功"
fi

# 啟動應用程式
echo "🚀 啟動 Pixer Controller..."
echo ""
echo "💡 使用提示:"
echo "   1. 確保已連接到 Pixer 裝置的 WiFi 熱點"
echo "   2. 裝置 IP 應為 192.168.1.1"
echo "   3. 首次使用請先點擊「檢查裝置」"
echo ""

npm start
