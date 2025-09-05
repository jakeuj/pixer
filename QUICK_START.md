# 🚀 Pixer Electron 快速開始

## 一鍵啟動

### macOS/Linux
```bash
./start.sh
```

### Windows
```cmd
start.bat
```

## 手動啟動

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **啟動應用程式**
   ```bash
   npm start
   ```

## 使用步驟

1. **準備 Pixer 裝置**
   - 按下重置孔喚醒裝置
   - 等待 WiFi 熱點建立

2. **連接網路**
   - 將電腦連接到 Pixer 的 WiFi 熱點
   - 確認可以訪問 192.168.1.1

3. **使用應用程式**
   - 點擊「檢查裝置」確認連線
   - 選擇要上傳的圖片
   - 點擊「上傳到 Pixer」

## 功能特色

✅ **圖形化介面** - 現代化的使用者介面  
✅ **裝置狀態** - 即時顯示電池電量和韌體版本  
✅ **進度顯示** - 上傳進度即時更新  
✅ **拖放支援** - 直接拖放圖片到應用程式  
✅ **日誌記錄** - 詳細的操作日誌  
✅ **Python 整合** - 直接使用現有的 upload.py  

## 故障排除

### 常見問題

**Q: 無法連接到裝置**  
A: 確認已連接到 Pixer 的 WiFi 熱點，IP 為 192.168.1.1

**Q: Python 找不到**  
A: 確保已安裝 Python 3.x 並在 PATH 中

**Q: Pillow 未安裝**  
A: 執行 `pip install Pillow`

**Q: 圖片上傳失敗**  
A: 檢查圖片格式，支援 JPG, PNG, BMP, GIF, TIFF

## 技術細節

- **前端**: Electron + HTML/CSS/JavaScript
- **後端**: Python 3.x + PIL/Pillow
- **通訊**: TCP Socket (192.168.1.1:6000)
- **協定**: Pixer 自定義協定

## 開發模式

```bash
npm run dev
```

開發模式會自動開啟開發者工具，方便除錯。
