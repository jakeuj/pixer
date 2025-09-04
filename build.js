#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Pixer Electron App...\n');

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
}

// Check if firmware files exist
const firmwareFiles = ['ble.bin', 'ite.bin', 'pixer.bin'];
const missingFiles = firmwareFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
    console.log('⚠️  Warning: Missing firmware files:');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    console.log('   These files will be needed for firmware updates.\n');
}

// Build for current platform
const platform = process.platform;
let buildCommand;

switch (platform) {
    case 'win32':
        buildCommand = 'npm run build:win';
        break;
    case 'darwin':
        buildCommand = 'npm run build:mac';
        break;
    case 'linux':
        buildCommand = 'npm run build:linux';
        break;
    default:
        buildCommand = 'npm run build';
}

console.log(`🔨 Building for ${platform}...`);
try {
    execSync(buildCommand, { stdio: 'inherit' });
    console.log('\n✅ Build completed successfully!');
    console.log('📁 Check the "dist" folder for the built application.');
} catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
}
