import os
import logging
import json
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from werkzeug.utils import secure_filename
import threading
import time
from datetime import datetime

from pixer_service import PixerService
from image_processor import PixerImageProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Flask app configuration
app = Flask(__name__)
app.secret_key = 'pixer-web-interface-secret-key-change-in-production'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Global service instance
pixer_service = PixerService()

# Global state for tracking operations
operation_status = {
    'current_operation': None,
    'progress': 0,
    'stage': 'idle',
    'last_update': time.time(),
    'result': None
}
status_lock = threading.Lock()

def update_operation_status(status_update):
    """Update global operation status thread-safely"""
    with status_lock:
        operation_status.update(status_update)
        operation_status['last_update'] = time.time()

@app.route('/')
def index():
    """Main page with device status and upload form"""
    device_status = pixer_service.get_device_status()
    return render_template('index.html', device_status=device_status)

@app.route('/api/device/status')
def api_device_status():
    """API endpoint to get current device status"""
    device_status = pixer_service.get_device_status()
    return jsonify(device_status)

@app.route('/api/device/check', methods=['POST'])
def api_device_check():
    """API endpoint to check device connectivity"""
    def on_complete(result):
        update_operation_status({
            'current_operation': 'device_check',
            'stage': 'complete',
            'progress': 100,
            'result': result
        })
    
    update_operation_status({
        'current_operation': 'device_check',
        'stage': 'checking',
        'progress': 50,
        'result': None
    })
    
    future = pixer_service.check_device_async(callback=on_complete)
    
    return jsonify({
        'success': True,
        'message': 'Device check started',
        'operation_id': 'device_check'
    })

@app.route('/api/device/reset', methods=['POST'])
def api_device_reset():
    """API endpoint to reset device"""
    def on_complete(result):
        update_operation_status({
            'current_operation': 'device_reset',
            'stage': 'complete',
            'progress': 100,
            'result': result
        })
    
    update_operation_status({
        'current_operation': 'device_reset',
        'stage': 'resetting',
        'progress': 50,
        'result': None
    })
    
    future = pixer_service.reset_device_async(callback=on_complete)
    
    return jsonify({
        'success': True,
        'message': 'Device reset started',
        'operation_id': 'device_reset'
    })

@app.route('/api/upload', methods=['POST'])
def api_upload():
    """API endpoint to upload image"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    # Check file extension
    allowed_extensions = PixerImageProcessor.get_supported_formats()
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        return jsonify({
            'success': False, 
            'error': f'Unsupported file format. Supported: {", ".join(allowed_extensions)}'
        }), 400
    
    try:
        # Read file data
        file_data = file.read()
        
        def on_progress(progress_info):
            update_operation_status({
                'current_operation': 'image_upload',
                'stage': progress_info['stage'],
                'progress': progress_info['progress'],
                'result': None
            })
        
        def on_complete(result):
            update_operation_status({
                'current_operation': 'image_upload',
                'stage': 'complete',
                'progress': 100,
                'result': result
            })
        
        update_operation_status({
            'current_operation': 'image_upload',
            'stage': 'starting',
            'progress': 0,
            'result': None
        })
        
        future = pixer_service.upload_image_async(
            file_data, 
            progress_callback=on_progress,
            completion_callback=on_complete
        )
        
        return jsonify({
            'success': True,
            'message': 'Image upload started',
            'operation_id': 'image_upload',
            'filename': file.filename
        })
        
    except Exception as e:
        logger.error(f"Error handling upload: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/operation/status')
def api_operation_status():
    """API endpoint to get current operation status"""
    with status_lock:
        return jsonify(dict(operation_status))

@app.route('/api/operation/clear', methods=['POST'])
def api_operation_clear():
    """API endpoint to clear operation status"""
    update_operation_status({
        'current_operation': None,
        'progress': 0,
        'stage': 'idle',
        'result': None
    })
    return jsonify({'success': True, 'message': 'Operation status cleared'})

@app.route('/upload')
def upload_page():
    """Dedicated upload page"""
    return render_template('upload.html')

@app.route('/device')
def device_page():
    """Device management page"""
    device_status = pixer_service.get_device_status()
    return render_template('device.html', device_status=device_status)

@app.route('/help')
def help_page():
    """Help and documentation page"""
    supported_formats = PixerImageProcessor.get_supported_formats()
    return render_template('help.html', supported_formats=supported_formats)

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({
        'success': False, 
        'error': 'File too large. Maximum size is 16MB.'
    }), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return render_template('error.html', 
                         error_code=404, 
                         error_message="Page not found"), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {e}")
    return render_template('error.html', 
                         error_code=500, 
                         error_message="Internal server error"), 500

def cleanup_old_uploads():
    """Clean up old uploaded files (run periodically)"""
    try:
        upload_dir = app.config['UPLOAD_FOLDER']
        current_time = time.time()
        max_age = 3600  # 1 hour
        
        for filename in os.listdir(upload_dir):
            file_path = os.path.join(upload_dir, filename)
            if os.path.isfile(file_path):
                file_age = current_time - os.path.getctime(file_path)
                if file_age > max_age:
                    os.remove(file_path)
                    logger.debug(f"Cleaned up old upload: {filename}")
    except Exception as e:
        logger.error(f"Error cleaning up uploads: {e}")

def start_cleanup_thread():
    """Start background thread for cleanup tasks"""
    def cleanup_worker():
        while True:
            time.sleep(1800)  # Run every 30 minutes
            cleanup_old_uploads()
    
    cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
    cleanup_thread.start()

if __name__ == '__main__':
    # Start background cleanup thread
    start_cleanup_thread()
    
    # Get configuration from environment variables
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_PORT', 8000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Pixer Web Interface on {host}:{port}")
    logger.info(f"Debug mode: {debug}")
    
    try:
        app.run(host=host, port=port, debug=debug, threaded=True)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        pixer_service.shutdown()
