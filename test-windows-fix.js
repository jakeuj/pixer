// 測試跨平台相容性的腳本
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 模擬打包環境
const mockApp = {
  isPackaged: true
};

// 模擬 process.resourcesPath
const mockResourcesPath = path.join(__dirname, 'mock-resources');

// 建立測試環境
function setupTestEnvironment() {
  console.log('🔧 設定測試環境...');
  
  // 建立模擬的 resources 目錄結構
  const pythonDistPath = path.join(mockResourcesPath, 'python-dist');
  if (!fs.existsSync(pythonDistPath)) {
    fs.mkdirSync(pythonDistPath, { recursive: true });
  }
  
  // 複製實際的執行檔到模擬目錄
  const ext = process.platform === 'win32' ? '.exe' : '';
  const actualUploadPath = path.join(__dirname, 'python-dist', `upload${ext}`);
  const mockUploadPath = path.join(pythonDistPath, `upload${ext}`);

  if (fs.existsSync(actualUploadPath)) {
    fs.copyFileSync(actualUploadPath, mockUploadPath);
    console.log(`✅ 複製 upload${ext} 到測試目錄`);
  } else {
    console.log(`❌ 找不到 upload${ext}，請先執行 npm run build:python`);
    return false;
  }
  
  return true;
}

// 修復後的 getPythonExecutablePath 函數
function getPythonExecutablePath(scriptName) {
  const isDev = false; // 模擬打包環境
  const ext = process.platform === 'win32' ? '.exe' : '';

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

  // 複製執行檔到臨時目錄來避免空格問題
  const tempDir = os.tmpdir();
  // 確保臨時檔案有正確的副檔名
  const tempExecutable = path.join(tempDir, `pixer_${scriptName}_${Date.now()}${ext}`);

  try {
    // 複製執行檔
    if (fs.existsSync(tempExecutable)) {
      fs.unlinkSync(tempExecutable);
    }
    fs.copyFileSync(executablePath, tempExecutable);
    
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
    
    console.log(`[DEBUG] Copied executable: ${tempExecutable}`);

    return {
      executable: tempExecutable,
      script: null,
      cleanup: () => {
        try {
          if (fs.existsSync(tempExecutable)) {
            fs.unlinkSync(tempExecutable);
          }
        } catch (e) {
          console.error(`[ERROR] Failed to cleanup temp file: ${e.message}`);
        }
      }
    };
  } catch (e) {
    console.error(`[ERROR] Failed to copy executable: ${e.message}`);
    // 回退到原始路徑，但在 Windows 上用引號包圍路徑
    const finalExecutablePath = process.platform === 'win32' && executablePath.includes(' ') 
      ? `"${executablePath}"` 
      : executablePath;
    
    return {
      executable: finalExecutablePath,
      script: null
    };
  }
}

// 測試裝置檢查功能
function testDeviceCheck() {
  return new Promise((resolve) => {
    console.log('🔍 測試裝置檢查功能...');

    const pythonConfig = getPythonExecutablePath('upload');
    if (!pythonConfig) {
      resolve({ success: false, error: 'Failed to get Python executable path' });
      return;
    }

    const args = pythonConfig.script ? [pythonConfig.script] : [];

    console.log(`[test] Spawning: ${pythonConfig.executable}`);
    console.log(`[test] Args: ${JSON.stringify(args)}`);

    // 設定環境變數，在 Windows 上確保正確的編碼
    const spawnEnv = { ...process.env };
    if (process.platform === 'win32') {
      spawnEnv.PYTHONIOENCODING = 'utf-8';
      spawnEnv.LANG = 'zh_TW.UTF-8';
    }

    const python = spawn(pythonConfig.executable, args, {
      cwd: mockResourcesPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: spawnEnv,
      shell: true,
      windowsHide: true
    });

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      // 在 Windows 上處理編碼問題
      const text = process.platform === 'win32'
        ? data.toString('utf8')
        : data.toString();
      output += text;
      console.log('[stdout]', text.trim());
    });

    python.stderr.on('data', (data) => {
      // 在 Windows 上處理編碼問題
      const text = process.platform === 'win32'
        ? data.toString('utf8')
        : data.toString();
      error += text;
      console.log('[stderr]', text.trim());
    });

    python.on('close', (code) => {
      // 清理臨時檔案
      if (pythonConfig.cleanup) {
        pythonConfig.cleanup();
      }

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
      console.log(`[test] Error errno: ${err.errno}`);
      console.log(`[test] Error syscall: ${err.syscall}`);
      console.log(`[test] Error path: ${err.path}`);

      // 清理臨時檔案
      if (pythonConfig.cleanup) {
        pythonConfig.cleanup();
      }

      resolve({
        success: false,
        error: `Failed to start Python process: ${err.message} (code: ${err.code})`
      });
    });
  });
}

// 清理測試環境
function cleanupTestEnvironment() {
  console.log('🧹 清理測試環境...');
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
  console.log('🚀 開始 Windows 打包修復測試\n');
  
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
      console.log('\n✅ 測試通過！Windows 打包修復成功');
    } else {
      console.log('\n❌ 測試失敗，需要進一步調試');
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
