# Pixer Uploader (Electron Version)

This is an Electron-based desktop application for uploading images to the G+ Pixer e-ink photo frame. Originally based on [kasperis7/pixer](https://github.com/kasperis7/pixer), this version has been completely rewritten as a modern desktop application with a graphical user interface.

---

## Features
- 🖼️ **Image Upload**: Upload images to your Pixer e-ink photo frame
- 📱 **Modern GUI**: User-friendly interface with drag-and-drop support
- 🔋 **Device Monitoring**: Check battery level and device status
- 🔄 **Firmware Updates**: Automatic firmware upgrade capability (BLE/ITE/BSP)
- 📊 **Progress Tracking**: Real-time upload progress with visual feedback
- 📝 **Activity Logging**: Detailed logs of all operations
- 🎨 **Image Processing**: Automatic image optimization for e-ink display
- 🖥️ **Cross-Platform**: Works on Windows, macOS, and Linux

### Supported Image Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- BMP (.bmp)
- GIF (.gif)
- WebP (.webp)
- TIFF (.tiff)

---

## Installation & Usage

### Option 1: Download Pre-built Application
1. Download the latest release for your platform from the releases page
2. Install/extract the application
3. Run the Pixer Uploader

### Option 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/jakeuj/pixer.git
cd pixer

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build
```

---

## Requirements
- Node.js 16+ (for building from source)
- Network connection to Pixer device (192.168.1.1:6000)

---

## Changes
- Added firmware update process: supports updating `ble.bin`, `pixer.bin`, etc.  
- Improved error messages for easier debugging  
- Preserved the original image upload workflow  

---

## Firmware Upgrade Rules (Simple Version)

The uploader can also update the device firmware when needed.  
Updates are done **automatically** based on these simple rules:

- **Battery check**  
  - If the battery is too low (15% or less), no update will run.

- **When updates happen**  
  - If the device firmware is out of date, the uploader will send the correct file:
    - **BLE update** → `ble.bin`
    - **ITE update** → `ite.bin`
    - **BSP update** → `pixer.bin`

That’s it — the tool will check and update when safe.  
Users only need to prepare the firmware files in the same folder as the uploader.

---

## Reference
- Original Python version: [kasperis7/pixer](https://github.com/kasperis7/pixer)
- Electron Framework: [electronjs.org](https://electronjs.org)
- Sharp Image Processing: [sharp.pixelplumbing.com](https://sharp.pixelplumbing.com)

