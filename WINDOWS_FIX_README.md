# Windows 打包修復說明

## 問題描述

在 Windows 打包後，點擊「檢查裝置」按鈕會出現以下錯誤：

```
裝置檢查失敗: 'C:\Users\Frank\AppData\Local\Temp\pixer_upload_1757068217527' ���O�����Υ~���R�O�B�i���檺�{���Χ妸�ɡC
```

這個錯誤訊息表示「不是內部或外部命令，也不是可執行的程式或批次檔」。同時還有中文亂碼問題。

## 問題原因

1. **缺少副檔名**：在 Windows 上，執行檔需要 `.exe` 副檔名才能被系統識別
2. **路徑空格問題**：應用程式安裝在包含空格的路徑時可能導致執行失敗
3. **檔案權限問題**：複製到臨時目錄的檔案可能沒有正確的執行權限
4. **中文編碼問題**：Windows 上的中文輸出出現亂碼

## 修復內容

### 1. 修復臨時檔案副檔名問題

**修改位置**: `main.js` 第 369-419 行

**修復前**:
```javascript
const tempExecutable = path.join(tempDir, `pixer_${scriptName}_${Date.now()}`);
```

**修復後**:
```javascript
// 確保臨時檔案有正確的副檔名
const tempExecutable = path.join(tempDir, `pixer_${scriptName}_${Date.now()}${ext}`);
```

### 2. 改善 Windows 權限處理

**修復前**:
```javascript
fs.chmodSync(tempExecutable, 0o755); // 設定執行權限
```

**修復後**:
```javascript
// 在 Windows 上設定執行權限
if (process.platform === 'win32') {
  // Windows 上主要依賴副檔名，但仍嘗試設定權限
  try {
    fs.chmodSync(tempExecutable, 0o755);
  } catch (chmodError) {
    console.warn(`[WARN] Failed to set permissions on Windows: ${chmodError.message}`);
  }
} else {
  fs.chmodSync(tempExecutable, 0o755); // 設定執行權限
}
```

### 3. 改善路徑處理

**修復前**:
```javascript
return {
  executable: executablePath,
  script: null
};
```

**修復後**:
```javascript
// 回退到原始路徑，但在 Windows 上用引號包圍路徑
const finalExecutablePath = process.platform === 'win32' && executablePath.includes(' ') 
  ? `"${executablePath}"` 
  : executablePath;

return {
  executable: finalExecutablePath,
  script: null
};
```

### 4. 修復中文編碼問題

**修復前**:
```javascript
const python = spawn(pythonConfig.executable, args, {
  env: process.env,
  // ...
});
```

**修復後**:
```javascript
// 設定環境變數，在 Windows 上確保正確的編碼
const spawnEnv = { ...process.env };
if (process.platform === 'win32') {
  spawnEnv.PYTHONIOENCODING = 'utf-8';
  spawnEnv.LANG = 'zh_TW.UTF-8';
}

const python = spawn(pythonConfig.executable, args, {
  env: spawnEnv,
  // ...
});
```

### 5. 改善跨平台相容性

**Windows**: 使用臨時檔案複製策略，確保副檔名和權限正確
**macOS/Linux**: 直接使用原始路徑，保持原有穩定性

### 6. 統一固件升級功能

將固件升級功能也改為使用 `getPythonExecutablePath` 函數，確保一致性。

## 測試方法

### 方法 1: 使用測試腳本

1. **建立 Python 執行檔**:
   ```bash
   npm run build:python
   ```

2. **執行測試**:
   ```bash
   npm run test:windows-fix
   ```

### 方法 2: 使用批次檔案

執行 `build-and-test.bat`，它會自動：
1. 建立 Python 執行檔
2. 執行修復測試
3. 顯示測試結果

### 方法 3: 完整建置測試

1. **建立完整應用程式**:
   ```bash
   npm run build
   ```

2. **測試打包後的應用程式**:
   - 在 `dist` 目錄中找到 `.exe` 檔案
   - 安裝並執行應用程式
   - 測試「檢查裝置」功能

## 預期結果

修復後，應用程式應該能夠：

**Windows**:
1. ✅ 正確複製 Python 執行檔到臨時目錄
2. ✅ 臨時檔案具有正確的 `.exe` 副檔名
3. ✅ 成功執行裝置檢查功能
4. ✅ 正確清理臨時檔案
5. ✅ 正確顯示中文訊息，無亂碼

**macOS/Linux**:
1. ✅ 保持原有穩定性，直接使用原始執行檔
2. ✅ 正確設定檔案權限
3. ✅ 成功執行所有功能

## 除錯資訊

如果問題仍然存在，請檢查以下日誌：

1. **開發者工具控制台**：按 F12 查看詳細錯誤訊息
2. **主程序日誌**：查看 `[DEBUG]` 和 `[ERROR]` 訊息
3. **檔案系統**：確認 `python-dist` 目錄中包含 `upload.exe`

## 相關檔案

- `main.js`: 主要修復邏輯
- `test-windows-fix.js`: 測試腳本
- `build-and-test.bat`: Windows 測試批次檔
- `package.json`: 新增的測試腳本

## 注意事項

1. 此修復主要針對 Windows 平台，但不會影響其他平台的功能
2. 修復後的程式碼向後相容，不會破壞現有功能
3. 建議在不同 Windows 版本上測試以確保相容性
