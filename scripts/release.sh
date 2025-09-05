#!/bin/bash

# Pixer Controller 發布腳本
# 用於建立標籤並觸發 GitHub Actions 自動建置

set -e

echo "🖼️  Pixer Controller 發布腳本"
echo "============================="

# 檢查是否有未提交的變更
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ 有未提交的變更，請先提交所有變更"
    git status --short
    exit 1
fi

# 檢查是否在 main 分支
current_branch=$(git branch --show-current)
if [[ "$current_branch" != "main" ]]; then
    echo "⚠️  目前不在 main 分支 (目前: $current_branch)"
    read -p "是否要繼續？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "取消發布"
        exit 1
    fi
fi

# 獲取版本號
if [[ -n "$1" ]]; then
    version="$1"
else
    echo "請輸入版本號 (例如: 1.0.0):"
    read -r version
fi

# 驗證版本號格式
if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ 版本號格式錯誤，應為 x.y.z 格式"
    exit 1
fi

tag="v$version"

# 檢查標籤是否已存在
if git tag -l | grep -q "^$tag$"; then
    echo "❌ 標籤 $tag 已存在"
    exit 1
fi

echo "📋 發布資訊："
echo "   版本: $version"
echo "   標籤: $tag"
echo "   分支: $current_branch"
echo

# 確認發布
read -p "確認要發布此版本嗎？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "取消發布"
    exit 1
fi

echo "🏷️  建立標籤..."
git tag -a "$tag" -m "Release $version"

echo "📤 推送標籤到遠端..."
git push origin "$tag"

echo "✅ 標籤已推送！"
echo ""
echo "🚀 GitHub Actions 將自動開始建置流程"
echo "   可以在以下網址查看進度："
echo "   https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"
echo ""
echo "📦 建置完成後，發布檔案將出現在："
echo "   https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/releases/tag/$tag"
