# Pixer Electron 應用程式

這是一個基於 Electron 的 Pixer E-Ink 相框控制器，整合了原有的 Python `upload.py` 功能。

## 功能特色

- 🖼️ 圖形化使用者介面
- 📱 裝置狀態檢查（電池電量、韌體版本等）
- 🔄 圖片上傳與進度顯示
- 🔧 **固件升級功能**: 支援 BLE、ITE、BSP 三種固件的升級
- 🔄 裝置重置功能
- 📝 即時操作日誌
- 🎨 現代化 UI 設計

## 安裝與執行

### 1. 安裝依賴

```bash
npm install
```

### 2. 開發模式執行

```bash
npm run dev
```

### 3. 正式模式執行

```bash
npm start
```

### 4. 建置應用程式

```bash
npm run build
```

## 系統需求

- Node.js 16 或更高版本
- Python 3.x（需要安裝 PIL/Pillow）
- 已安裝的 Python 依賴：
  ```bash
  pip install Pillow
  ```

## 使用方式

1. **連接 Pixer 裝置**
   - 按下 Pixer 裝置的重置孔喚醒裝置
   - 裝置會建立 WiFi 熱點
   - 將電腦連接到 Pixer 的 WiFi 熱點

2. **檢查裝置狀態**
   - 點擊「檢查裝置」按鈕
   - 查看連線狀態、電池電量和韌體版本

3. **上傳圖片**
   - 點擊「選擇圖片」或直接拖放圖片到預覽區域
   - 支援 JPG, PNG, BMP, GIF, TIFF 格式
   - 點擊「上傳到 Pixer」開始上傳
   - 觀察上傳進度

4. **固件升級**
   - 點擊「檢查固件版本」確認當前版本
   - 選擇需要升級的固件檔案（BLE、ITE、BSP）
   - 確保電池電量 > 15%
   - 點擊「開始升級」執行升級程序
   - 升級完成後裝置會自動重啟

5. **重置裝置**
   - 如需重置裝置，點擊「重置裝置」按鈕

## 技術架構

### 主程序 (main.js)
- 建立 Electron 視窗
- 處理 IPC 通訊
- 執行 Python 腳本
- 檔案對話框處理

### 渲染程序 (renderer.js)
- 使用者介面邏輯
- 事件處理
- 狀態管理
- 日誌顯示

### 預載腳本 (preload.js)
- 安全的 API 暴露
- 主程序與渲染程序間的橋樑

### Python 整合
- 直接調用現有的 `upload.py`
- 新增 `firmware_upgrade.py` 處理固件升級
- 使用 `child_process.spawn()` 執行 Python 腳本
- 即時捕獲輸出和錯誤
- 進度回報機制

## 檔案結構

```
pixer-electron/
├── main.js              # Electron 主程序
├── preload.js           # 預載腳本
├── renderer.js          # 渲染程序邏輯
├── index.html           # 主要 HTML 檔案
├── styles.css           # 樣式表
├── package.json         # 專案設定
├── upload.py            # 原有的 Python 腳本
├── firmware_upgrade.py  # 固件升級 Python 腳本
├── ble.bin              # BLE 固件檔案
├── ite.bin              # ITE 固件檔案
├── pixer.bin            # BSP 固件檔案
└── ELECTRON_README.md   # 說明文件
```

## 自訂設定

### Python 路徑設定
如果系統中的 Python 命令不是 `python3`，可以設定環境變數：

```bash
export PYTHON_PATH=/path/to/your/python
npm start
```

### 裝置 IP 設定
預設連接到 `192.168.1.1:6000`，如需修改請編輯 `upload.py` 中的設定。

## 故障排除

### 常見問題

1. **Python 找不到**
   - 確保系統已安裝 Python 3.x
   - 檢查 PATH 環境變數
   - 嘗試設定 PYTHON_PATH 環境變數

2. **PIL/Pillow 未安裝**
   ```bash
   pip install Pillow
   ```

3. **無法連接到裝置**
   - 確認已連接到 Pixer 的 WiFi 熱點
   - 檢查裝置是否已喚醒
   - 確認 IP 位址為 192.168.1.1

4. **圖片上傳失敗**
   - 檢查圖片格式是否支援
   - 確認網路連線穩定
   - 查看日誌區域的錯誤訊息

5. **固件升級失敗**
   - 確認電池電量 > 15%
   - 檢查固件檔案是否存在且格式正確
   - 確保網路連線穩定
   - 升級過程中不要中斷連線

### 除錯模式

開發模式下會自動開啟開發者工具：

```bash
npm run dev
```

## 授權

本專案採用 Unlicense 授權，詳見 LICENSE 檔案。

## 貢獻

歡迎提交 Issue 和 Pull Request！
