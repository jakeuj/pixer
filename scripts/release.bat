@echo off
chcp 65001 >nul

REM Pixer Controller 發布腳本 (Windows)
REM 用於建立標籤並觸發 GitHub Actions 自動建置

echo 🖼️  Pixer Controller 發布腳本 (Windows)
echo ==========================================

REM 檢查是否有未提交的變更
git status --porcelain >nul 2>&1
if %errorlevel% equ 0 (
    for /f %%i in ('git status --porcelain') do (
        echo ❌ 有未提交的變更，請先提交所有變更
        git status --short
        pause
        exit /b 1
    )
)

REM 檢查是否在 main 分支
for /f "tokens=*" %%i in ('git branch --show-current') do set current_branch=%%i
if not "%current_branch%"=="main" (
    echo ⚠️  目前不在 main 分支 (目前: %current_branch%^)
    set /p continue="是否要繼續？(y/N): "
    if /i not "%continue%"=="y" (
        echo 取消發布
        exit /b 1
    )
)

REM 獲取版本號
if not "%1"=="" (
    set version=%1
) else (
    set /p version="請輸入版本號 (例如: 1.0.0): "
)

REM 簡單的版本號格式檢查
echo %version% | findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
if %errorlevel% neq 0 (
    echo ❌ 版本號格式錯誤，應為 x.y.z 格式
    pause
    exit /b 1
)

set tag=v%version%

REM 檢查標籤是否已存在
git tag -l | findstr /x "%tag%" >nul
if %errorlevel% equ 0 (
    echo ❌ 標籤 %tag% 已存在
    pause
    exit /b 1
)

echo 📋 發布資訊：
echo    版本: %version%
echo    標籤: %tag%
echo    分支: %current_branch%
echo.

REM 確認發布
set /p confirm="確認要發布此版本嗎？(y/N): "
if /i not "%confirm%"=="y" (
    echo 取消發布
    exit /b 1
)

echo 🏷️  建立標籤...
git tag -a "%tag%" -m "Release %version%"
if %errorlevel% neq 0 (
    echo ❌ 建立標籤失敗
    pause
    exit /b 1
)

echo 📤 推送標籤到遠端...
git push origin "%tag%"
if %errorlevel% neq 0 (
    echo ❌ 推送標籤失敗
    pause
    exit /b 1
)

echo ✅ 標籤已推送！
echo.
echo 🚀 GitHub Actions 將自動開始建置流程
echo    可以在 GitHub 專案的 Actions 頁面查看進度
echo.
echo 📦 建置完成後，發布檔案將出現在 Releases 頁面

pause
