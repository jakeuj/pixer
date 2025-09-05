#!/bin/bash

# 完整的本地建置測試腳本
# 測試 Python 打包 + Electron 打包的完整流程

echo "🧪 完整本地建置測試"
echo "===================="

# 1. 清理之前的建置
echo "🧹 清理之前的建置..."
rm -rf python-dist/
rm -rf dist/
rm -rf build/
rm -f *.spec

# 2. 執行 Python 打包
echo "🐍 執行 Python 打包..."
./scripts/build-python-local.sh
if [ $? -ne 0 ]; then
    echo "❌ Python 打包失敗"
    exit 1
fi

# 3. 檢查 Node.js 依賴
echo "📦 檢查 Node.js 依賴..."
if [ ! -d "node_modules" ]; then
    echo "安裝 Node.js 依賴..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Node.js 依賴安裝失敗"
        exit 1
    fi
fi

# 4. 執行 Electron 打包
echo "⚡ 執行 Electron 打包..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Electron 打包失敗"
    exit 1
fi

# 5. 檢查打包結果
echo "📋 檢查打包結果..."
echo "dist/ 目錄內容:"
ls -la dist/

# 6. 檢查 DMG 檔案內容（如果存在）
DMG_FILE=$(find dist/ -name "*.dmg" | head -1)
if [ -n "$DMG_FILE" ]; then
    echo ""
    echo "📱 檢查 DMG 檔案: $DMG_FILE"
    echo "檔案大小: $(du -h "$DMG_FILE" | cut -f1)"
    
    # 掛載 DMG 並檢查內容
    echo "掛載 DMG 檢查內容..."
    MOUNT_POINT="/tmp/pixer_test_mount"
    mkdir -p "$MOUNT_POINT"
    
    hdiutil attach "$DMG_FILE" -mountpoint "$MOUNT_POINT" -quiet
    if [ $? -eq 0 ]; then
        echo "DMG 內容:"
        ls -la "$MOUNT_POINT/"
        
        # 檢查 app 內容
        APP_PATH=$(find "$MOUNT_POINT" -name "*.app" | head -1)
        if [ -n "$APP_PATH" ]; then
            echo ""
            echo "App 內容:"
            echo "Contents/Resources/:"
            ls -la "$APP_PATH/Contents/Resources/" | head -10
            
            # 檢查 python-dist 是否存在
            if [ -d "$APP_PATH/Contents/Resources/python-dist" ]; then
                echo ""
                echo "python-dist 內容:"
                ls -la "$APP_PATH/Contents/Resources/python-dist/"
            else
                echo "❌ python-dist 目錄不存在於 app 中"
            fi
        fi
        
        # 卸載 DMG
        hdiutil detach "$MOUNT_POINT" -quiet
        rmdir "$MOUNT_POINT"
    else
        echo "❌ 無法掛載 DMG 檔案"
    fi
fi

echo ""
echo "🎉 完整建置測試完成！"
echo ""
echo "📋 總結:"
echo "✅ Python 執行檔打包成功"
echo "✅ Electron 應用程式打包成功"
echo ""
echo "💡 下一步:"
echo "   1. 可以手動測試打包的應用程式"
echo "   2. 確認 Python 執行檔在打包後能正常運作"
echo "   3. 測試裝置連線功能"
