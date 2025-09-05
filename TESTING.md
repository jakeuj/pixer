# Pixer 本地測試指南

本文件說明如何在本地環境測試 Python 打包和 Electron 打包，確保 CI/CD 流程正常運作。

## 問題背景

在 GitHub Actions CI/CD 中，Python 打包的執行檔可能無法正常運作，出現 `spawn ENOTDIR` 錯誤。這通常是因為：

1. **架構不匹配**：M4 晶片 (ARM64) 與 CI/CD 中的 x64 架構不匹配
2. **執行檔路徑問題**：打包後的 Python 執行檔路徑不正確
3. **依賴缺失**：Python 執行檔缺少必要的依賴

## 本地測試步驟

### 1. Python 打包測試

```bash
# macOS/Linux
./scripts/build-python-local.sh

# Windows
scripts\build-python-local.bat
```

這個腳本會：
- 檢查並安裝 Python 依賴 (Pillow, PyInstaller)
- 使用 PyInstaller 打包 `upload.py` 和 `firmware_upgrade.py`
- 測試執行檔是否能正常啟動
- 輸出打包結果到 `python-dist/` 目錄

### 2. 完整建置測試

```bash
# 執行完整的本地建置測試
./scripts/test-local-build.sh
```

這個腳本會：
- 清理之前的建置
- 執行 Python 打包
- 安裝 Node.js 依賴
- 執行 Electron 打包
- 檢查打包結果和 DMG 內容

### 3. 手動測試 Electron 應用程式

```bash
# 開發模式（使用本地 Python 執行檔）
npm run dev

# 測試打包的應用程式
open dist/Pixer\ Controller-*.dmg
```

## 除錯資訊

### 檢查 Python 執行檔

```bash
# 檢查執行檔是否存在
ls -la python-dist/

# 測試執行檔
./python-dist/upload
./python-dist/firmware_upgrade
```

### 檢查 Electron 打包結果

```bash
# 檢查 dist 目錄
ls -la dist/

# 檢查 DMG 內容
hdiutil attach dist/Pixer\ Controller-*.dmg -mountpoint /tmp/pixer_mount
ls -la /tmp/pixer_mount/
ls -la /tmp/pixer_mount/Pixer\ Controller.app/Contents/Resources/
hdiutil detach /tmp/pixer_mount
```

## 架構支援

### 目前支援的架構

- **Windows**: x64
- **macOS**: x64, ARM64 (M1/M2/M3/M4)

### CI/CD 配置

`.github/workflows/release.yml` 已更新支援：
- Windows x64
- macOS x64 (Intel)
- macOS ARM64 (Apple Silicon)

## 常見問題

### 1. `spawn ENOTDIR` 錯誤

**原因**：Python 執行檔路徑不正確或檔案不存在

**解決方案**：
1. 檢查 `python-dist/` 目錄是否存在執行檔
2. 確認 `main.js` 中的路徑邏輯正確
3. 檢查 `package.json` 中的 `extraResources` 配置

### 2. Python 執行檔無法啟動

**原因**：依賴缺失或架構不匹配

**解決方案**：
1. 重新執行 `./scripts/build-python-local.sh`
2. 檢查 PyInstaller 版本和設定
3. 確認系統架構匹配

### 3. Electron 打包失敗

**原因**：Node.js 依賴問題或配置錯誤

**解決方案**：
1. 刪除 `node_modules/` 並重新安裝：`rm -rf node_modules && npm install`
2. 檢查 `package.json` 中的 `build` 配置
3. 確認所有必要檔案都在 `files` 和 `extraResources` 中

## 測試清單

在提交到 GitHub 之前，請確認：

- [ ] Python 執行檔能正常打包和啟動
- [ ] Electron 應用程式能正常打包
- [ ] 打包的 DMG/EXE 檔案包含 Python 執行檔
- [ ] 手動測試打包的應用程式能正常運作
- [ ] 裝置連線功能正常（需要實際 Pixer 裝置）

## 下一步

1. **本地測試**：執行完整的本地建置測試
2. **手動驗證**：安裝並測試打包的應用程式
3. **裝置測試**：連接到 Pixer 裝置測試實際功能
4. **CI/CD 測試**：推送到 GitHub 測試自動化建置
