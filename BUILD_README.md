# Pixer Controller 建置與發布指南

這個文件說明如何使用 GitHub Actions CI/CD 自動建置和發布 Pixer Controller 應用程式。

## 🚀 自動發布流程

### 觸發條件

CI/CD 流程會在以下情況下自動觸發：

1. **標籤推送** - 當推送以 `v` 開頭的標籤時（如 `v1.0.0`）
2. **手動觸發** - 在 GitHub Actions 頁面手動執行工作流程

### 建置目標

- **Windows 11 x64** - 建置為 NSIS 安裝程式 (`.exe`)
- **macOS x64** - 建置為 DMG 磁碟映像檔 (`.dmg`)

## 📋 發布步驟

### 方法 1：標籤發布（推薦）

1. **建立並推送標籤**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **自動建置** - GitHub Actions 會自動開始建置流程

3. **自動發布** - 建置完成後會自動建立 GitHub Release

### 方法 2：手動觸發

1. 前往 GitHub 專案頁面
2. 點擊 "Actions" 標籤
3. 選擇 "Build and Release" 工作流程
4. 點擊 "Run workflow"
5. 輸入版本號（如 `v1.0.0`）
6. 點擊 "Run workflow" 確認

## 🔧 本地測試

在推送到 GitHub 之前，可以使用本地建置腳本測試：

### macOS/Linux
```bash
chmod +x scripts/build-local.sh
./scripts/build-local.sh
```

### Windows
```cmd
scripts\build-local.bat
```

## 📁 建置產物

建置完成後會產生以下檔案：

### Windows
- `Pixer-Controller-Setup-v1.0.0.exe` - NSIS 安裝程式
  - 支援自訂安裝路徑
  - 建立桌面和開始選單捷徑
  - 包含所有必要的 Python 依賴

### macOS  
- `Pixer-Controller-v1.0.0.dmg` - DMG 磁碟映像檔
  - 拖拽安裝到 Applications 資料夾
  - 包含所有必要的 Python 依賴

## 🛠️ 技術細節

### Python 依賴處理

CI/CD 流程會自動：
1. 安裝 Python 3.11 和必要套件（Pillow, PyInstaller）
2. 使用 PyInstaller 將 Python 腳本打包成獨立執行檔
3. 將執行檔嵌入到 Electron 應用程式中

### 跨平台支援

- **Windows**: 使用 `upload.exe` 和 `firmware_upgrade.exe`
- **macOS**: 使用 `upload` 和 `firmware_upgrade` (無副檔名)

### 檔案結構

打包後的應用程式包含：
```
Pixer Controller.app/Contents/Resources/
├── python-dist/
│   ├── upload(.exe)
│   └── firmware_upgrade(.exe)
├── ble.bin
├── ite.bin
└── pixer.bin
```

## 🔍 故障排除

### 常見問題

1. **建置失敗 - Python 依賴問題**
   - 檢查 `upload.py` 中的 import 語句
   - 確保所有依賴都在 CI/CD 腳本中安裝

2. **建置失敗 - Node.js 依賴問題**
   - 檢查 `package.json` 中的依賴版本
   - 確保使用 `npm ci` 而不是 `npm install`

3. **發布失敗 - 權限問題**
   - 確保 GitHub Token 有足夠權限
   - 檢查專案設定中的 Actions 權限

4. **應用程式無法啟動**
   - 檢查 Python 執行檔路徑
   - 確保所有資源檔案都正確打包

5. **GitHub Actions 版本問題**
   - 已更新所有 actions 到最新版本：
     - `actions/checkout@v4`
     - `actions/setup-node@v4`
     - `actions/setup-python@v5`
     - `actions/upload-artifact@v4`
     - `actions/download-artifact@v4`
     - `softprops/action-gh-release@v2`

### 除錯方法

1. **查看 GitHub Actions 日誌**
   - 前往 Actions 頁面查看詳細建置日誌
   - 檢查每個步驟的輸出

2. **本地測試**
   - 使用本地建置腳本重現問題
   - 檢查建置產物是否正確

3. **測試打包後的應用程式**
   - 在目標平台上測試安裝和執行
   - 檢查 Python 執行檔是否正常工作

## 📝 自訂配置

### 修改版本號

在 `package.json` 中修改版本號：
```json
{
  "version": "1.0.0"
}
```

### 新增圖示

將圖示檔案放在 `assets/` 目錄：
- `assets/icon.ico` - Windows 圖示
- `assets/icon.icns` - macOS 圖示

### 修改應用程式資訊

在 `package.json` 的 `build` 區段修改：
```json
{
  "build": {
    "appId": "com.jakeuj.pixer",
    "productName": "Pixer Controller"
  }
}
```

## 🔄 版本管理

建議使用語義化版本號：
- `v1.0.0` - 主要版本
- `v1.1.0` - 次要版本（新功能）
- `v1.0.1` - 修補版本（錯誤修正）

## 📞 支援

如果遇到問題，請：
1. 檢查 GitHub Actions 日誌
2. 查看本文件的故障排除章節
3. 在專案中建立 Issue 回報問題
