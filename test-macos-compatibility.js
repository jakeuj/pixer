// 測試 macOS 相容性的腳本
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 模擬打包環境
const mockApp = {
  isPackaged: true
};

// 模擬 process.resourcesPath
const mockResourcesPath = path.join(__dirname, 'mock-resources-macos');

// 建立測試環境
function setupTestEnvironment() {
  console.log('🔧 設定 macOS 測試環境...');
  
  // 建立模擬的 resources 目錄結構
  const pythonDistPath = path.join(mockResourcesPath, 'python-dist');
  if (!fs.existsSync(pythonDistPath)) {
    fs.mkdirSync(pythonDistPath, { recursive: true });
  }
  
  // 複製實際的執行檔到模擬目錄
  const actualUploadPath = path.join(__dirname, 'python-dist', 'upload');
  const mockUploadPath = path.join(pythonDistPath, 'upload');
  
  if (fs.existsSync(actualUploadPath)) {
    fs.copyFileSync(actualUploadPath, mockUploadPath);
    fs.chmodSync(mockUploadPath, 0o755); // 設定執行權限
    console.log('✅ 複製 upload 到測試目錄');
  } else {
    console.log('❌ 找不到 upload，請先執行 npm run build:python');
    return false;
  }
  
  return true;
}

// macOS 版本的 getPythonExecutablePath 函數
function getPythonExecutablePath(scriptName) {
  const isDev = false; // 模擬打包環境
  const ext = '';

  console.log(`[DEBUG] Getting Python executable path for ${scriptName}`);
  console.log(`[DEBUG] isDev: ${isDev}, platform: ${process.platform}`);

  // 打包模式：使用獨立執行檔
  const resourcesPath = mockResourcesPath; // 使用模擬路徑
  const executablePath = path.join(resourcesPath, 'python-dist', `${scriptName}${ext}`);
  console.log(`[DEBUG] Production mode - resourcesPath: ${resourcesPath}`);
  console.log(`[DEBUG] Production mode - executable path: ${executablePath}`);
  console.log(`[DEBUG] Production mode - file exists: ${fs.existsSync(executablePath)}`);

  // 檢查檔案是否存在
  if (!fs.existsSync(executablePath)) {
    console.error(`[ERROR] Python executable not found: ${executablePath}`);
    return null;
  }

  // macOS: 直接使用原始路徑，設定執行權限
  try {
    fs.chmodSync(executablePath, 0o755);
  } catch (chmodError) {
    console.warn(`[WARN] Failed to set permissions: ${chmodError.message}`);
  }

  console.log(`[DEBUG] macOS: Using original executable: ${executablePath}`);

  return {
    executable: executablePath,
    script: null
  };
}

// 測試裝置檢查功能
function testDeviceCheck() {
  return new Promise((resolve) => {
    console.log('🔍 測試 macOS 裝置檢查功能...');

    const pythonConfig = getPythonExecutablePath('upload');
    if (!pythonConfig) {
      resolve({ success: false, error: 'Failed to get Python executable path' });
      return;
    }

    const args = pythonConfig.script ? [pythonConfig.script] : [];

    console.log(`[test] Spawning: ${pythonConfig.executable}`);
    console.log(`[test] Args: ${JSON.stringify(args)}`);

    const python = spawn(pythonConfig.executable, args, {
      cwd: mockResourcesPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      shell: true
    });

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('[stdout]', text.trim());
    });

    python.stderr.on('data', (data) => {
      const text = data.toString();
      error += text;
      console.log('[stderr]', text.trim());
    });

    python.on('close', (code) => {
      console.log(`[test] Process exited with code: ${code}`);
      
      resolve({
        success: code === 0,
        output,
        error,
        code
      });
    });

    python.on('error', (err) => {
      console.log(`[test] Process error: ${err.message}`);
      console.log(`[test] Error code: ${err.code}`);

      resolve({
        success: false,
        error: `Failed to start Python process: ${err.message} (code: ${err.code})`
      });
    });
  });
}

// 清理測試環境
function cleanupTestEnvironment() {
  console.log('🧹 清理 macOS 測試環境...');
  try {
    if (fs.existsSync(mockResourcesPath)) {
      fs.rmSync(mockResourcesPath, { recursive: true, force: true });
      console.log('✅ 測試環境清理完成');
    }
  } catch (e) {
    console.error('❌ 清理測試環境失敗:', e.message);
  }
}

// 主測試函數
async function runTest() {
  if (process.platform !== 'darwin') {
    console.log('⚠️  此測試僅適用於 macOS 系統');
    return;
  }

  console.log('🚀 開始 macOS 相容性測試\n');
  
  if (!setupTestEnvironment()) {
    console.log('❌ 測試環境設定失敗');
    return;
  }
  
  try {
    const result = await testDeviceCheck();
    
    console.log('\n📊 測試結果:');
    console.log('成功:', result.success);
    if (result.error) {
      console.log('錯誤:', result.error);
    }
    if (result.output) {
      console.log('輸出:', result.output.trim());
    }
    console.log('退出代碼:', result.code);
    
    if (result.success) {
      console.log('\n✅ macOS 相容性測試通過！');
    } else {
      console.log('\n❌ macOS 相容性測試失敗');
    }
  } catch (e) {
    console.error('\n❌ 測試過程中發生錯誤:', e.message);
  } finally {
    cleanupTestEnvironment();
  }
}

// 執行測試
if (require.main === module) {
  runTest();
}

module.exports = { runTest, testDeviceCheck };
