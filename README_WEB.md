# Pixer Web Interface

A web-based interface for the Pixer E-Ink photo frame device, allowing you to upload images and manage the device through your browser.

## Features

- **Web-based image upload** - Upload images through a user-friendly web interface
- **Device management** - Check device status, battery level, and firmware versions
- **Real-time progress tracking** - Monitor upload progress and operation status
- **Image processing** - Automatic image resizing, rotation, and format conversion
- **Responsive design** - Works on desktop and mobile devices
- **Modular architecture** - Clean, maintainable code structure

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Connect to Pixer WiFi network** (usually named "Pixer-XXXX")

3. **Start the web interface:**
   ```bash
   python app.py
   ```

4. **Open your browser** and go to `http://localhost:8000`

5. **Upload images** and manage your Pixer device through the web interface

## File Structure

```
pixer/
├── app.py                 # Main Flask web application
├── pixer_client.py        # Device communication module
├── pixer_service.py       # High-level device operations service
├── image_processor.py     # Image processing and conversion
├── requirements.txt       # Python dependencies
├── templates/            # HTML templates
│   ├── base.html         # Base template with navigation
│   ├── index.html        # Home page with upload form
│   ├── upload.html       # Dedicated upload page
│   ├── device.html       # Device management page
│   ├── help.html         # Help and documentation
│   └── error.html        # Error pages
├── static/              # Static assets
│   ├── css/
│   │   └── style.css    # Custom styles
│   └── js/
│       └── app.js       # JavaScript functionality
└── uploads/             # Temporary upload directory (created automatically)
```

## Usage

### Home Page
- Upload images using the file selector or drag-and-drop
- View device status and battery level
- Quick access to device operations

### Upload Page
- Dedicated page for image uploads
- Image preview and file information
- Detailed upload process information

### Device Page
- Comprehensive device information
- Device management operations (check status, reset)
- Network and technical details

### Help Page
- Complete documentation and troubleshooting guide
- Supported image formats and technical specifications
- FAQ and common issues

## Configuration

### Environment Variables
- `FLASK_HOST` - Server host (default: 127.0.0.1)
- `FLASK_PORT` - Server port (default: 8000)
- `FLASK_DEBUG` - Debug mode (default: False)

### Example:
```bash
export FLASK_HOST=0.0.0.0
export FLASK_PORT=8080
export FLASK_DEBUG=true
python app.py
```

## API Endpoints

The web interface provides REST API endpoints:

- `GET /api/device/status` - Get device status
- `POST /api/device/check` - Check device connectivity
- `POST /api/device/reset` - Reset device
- `POST /api/upload` - Upload image
- `GET /api/operation/status` - Get operation status
- `POST /api/operation/clear` - Clear operation status

## Image Processing

Images are automatically processed for the Pixer device:

- **Format conversion** - Converts to 4-bit grayscale
- **Automatic rotation** - Portrait images rotated to landscape
- **Resizing** - Scaled to 1872×1404 pixels
- **Aspect ratio preservation** - Images are cropped to fit

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- BMP (.bmp)
- TIFF (.tiff, .tif)
- WebP (.webp)

## Device Communication

The interface communicates with the Pixer device via TCP socket:

- **Host:** 192.168.1.1
- **Port:** 6000
- **Protocol:** Custom TCP commands

### Commands
- `#TEST#` - Test connection
- `batteryLevel` - Get battery percentage
- `bleVersion` - Get Bluetooth firmware version
- `mcuVersion` - Get MCU firmware version
- `iteVersion` - Get display controller version
- `reset` - Reset device

## Troubleshooting

### Connection Issues
1. Ensure you're connected to the Pixer WiFi network
2. Verify the device is powered on and responsive
3. Check that the device IP is 192.168.1.1
4. Try resetting the device if it becomes unresponsive

### Upload Issues
1. Check file format is supported
2. Ensure file size is under 16MB
3. Verify device battery level is sufficient
4. Try smaller images if uploads are slow

### Web Interface Issues
1. Clear browser cache and reload
2. Check browser console for JavaScript errors
3. Ensure Flask server is running
4. Verify all dependencies are installed

## Development

### Running in Development Mode
```bash
export FLASK_DEBUG=true
python app.py
```

### Code Structure
- **Modular design** - Separate modules for different functionality
- **Error handling** - Comprehensive error handling and logging
- **Async operations** - Non-blocking operations with progress tracking
- **Responsive UI** - Bootstrap-based responsive design

## Original Command Line Tool

The original `upload.py` script is still available for command-line usage:
```bash
python upload.py image.jpg
```

## License

This project maintains the same license as the original Pixer project.
