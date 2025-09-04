#!/usr/bin/env python3
"""
Pixer Web Interface Startup Script

This script provides an easy way to start the Pixer web interface with
proper configuration and error handling.
"""

import os
import sys
import logging
import webbrowser
import time
from threading import Timer

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import flask
        import PIL
        print("✓ All dependencies are installed")
        return True
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        print("Please install dependencies with: pip install -r requirements.txt")
        return False

def open_browser(url, delay=2):
    """Open browser after a delay"""
    def open_url():
        try:
            webbrowser.open(url)
            print(f"✓ Opened browser at {url}")
        except Exception as e:
            print(f"Could not open browser automatically: {e}")
            print(f"Please open your browser and go to: {url}")
    
    Timer(delay, open_url).start()

def main():
    """Main startup function"""
    print("=" * 50)
    print("🖼️  Pixer Web Interface")
    print("=" * 50)
    
    # Setup logging
    setup_logging()
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Configuration
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_PORT', 8000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    auto_open = os.environ.get('AUTO_OPEN_BROWSER', 'True').lower() == 'true'
    
    print(f"📡 Server: http://{host}:{port}")
    print(f"🔧 Debug mode: {debug}")
    print(f"🌐 Auto-open browser: {auto_open}")
    print()
    
    # Instructions
    print("📋 Instructions:")
    print("1. Connect to your Pixer WiFi network (usually 'Pixer-XXXX')")
    print("2. Ensure your Pixer device is powered on")
    print("3. Use the web interface to upload images and manage your device")
    print()
    
    # Open browser automatically if requested
    if auto_open:
        url = f"http://{host}:{port}"
        print(f"🚀 Starting server and opening browser...")
        open_browser(url)
    else:
        print(f"🚀 Starting server...")
        print(f"   Open your browser and go to: http://{host}:{port}")
    
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 50)
    
    # Import and run the Flask app
    try:
        from app import app, pixer_service
        app.run(host=host, port=port, debug=debug, threaded=True)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down server...")
        try:
            pixer_service.shutdown()
        except:
            pass
        print("✓ Server stopped")
    except Exception as e:
        print(f"✗ Error starting server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
