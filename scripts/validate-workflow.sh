#!/bin/bash

# GitHub Actions 工作流程驗證腳本
# 檢查 YAML 語法和配置是否正確

set -e

echo "🔍 GitHub Actions 工作流程驗證"
echo "=============================="

# 檢查是否安裝了必要工具
if ! command -v yamllint &> /dev/null; then
    echo "⚠️  yamllint 未安裝，跳過 YAML 語法檢查"
    echo "   安裝方法: pip install yamllint"
else
    echo "📝 檢查 YAML 語法..."
    yamllint .github/workflows/release.yml
    echo "✅ YAML 語法檢查通過"
fi

# 檢查工作流程檔案是否存在
workflow_file=".github/workflows/release.yml"
if [[ ! -f "$workflow_file" ]]; then
    echo "❌ 工作流程檔案不存在: $workflow_file"
    exit 1
fi

echo "📋 檢查工作流程配置..."

# 檢查觸發條件
if grep -q "tags:" "$workflow_file" && grep -q "workflow_dispatch:" "$workflow_file"; then
    echo "✅ 觸發條件配置正確 (標籤推送 + 手動觸發)"
else
    echo "❌ 觸發條件配置有問題"
    exit 1
fi

# 檢查建置矩陣
if grep -q "windows-latest" "$workflow_file" && grep -q "macos-latest" "$workflow_file"; then
    echo "✅ 建置矩陣配置正確 (Windows + macOS)"
else
    echo "❌ 建置矩陣配置有問題"
    exit 1
fi

# 檢查 Python 設定
if grep -q "actions/setup-python@v5" "$workflow_file"; then
    echo "✅ Python 設定使用最新版本"
else
    echo "❌ Python 設定版本過舊"
    exit 1
fi

# 檢查 Node.js 設定
if grep -q "actions/setup-node@v4" "$workflow_file"; then
    echo "✅ Node.js 設定使用最新版本"
else
    echo "❌ Node.js 設定版本過舊"
    exit 1
fi

# 檢查 artifact 上傳
if grep -q "actions/upload-artifact@v4" "$workflow_file"; then
    echo "✅ Artifact 上傳使用最新版本"
else
    echo "❌ Artifact 上傳版本過舊"
    exit 1
fi

# 檢查發布設定
if grep -q "softprops/action-gh-release@v2" "$workflow_file"; then
    echo "✅ 發布設定使用最新版本"
else
    echo "❌ 發布設定版本過舊"
    exit 1
fi

# 檢查必要檔案
required_files=(
    "package.json"
    "main.js"
    "upload.py"
    "firmware_upgrade.py"
    "ble.bin"
    "ite.bin"
    "pixer.bin"
)

echo "📁 檢查必要檔案..."
for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺少)"
    fi
done

# 檢查腳本權限
scripts=(
    "scripts/build-local.sh"
    "scripts/release.sh"
)

echo "🔐 檢查腳本權限..."
for script in "${scripts[@]}"; do
    if [[ -f "$script" ]]; then
        if [[ -x "$script" ]]; then
            echo "✅ $script (可執行)"
        else
            echo "⚠️  $script (不可執行，執行: chmod +x $script)"
        fi
    else
        echo "❌ $script (不存在)"
    fi
done

echo ""
echo "🎉 工作流程驗證完成！"
echo ""
echo "📝 下一步："
echo "1. 提交所有變更到 Git"
echo "2. 使用 ./scripts/release.sh 建立發布"
echo "3. 或手動建立標籤: git tag v1.0.0 && git push origin v1.0.0"
