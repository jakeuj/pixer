import logging
import threading
import time
from typing import Dict, Any, Optional, Callable
from concurrent.futures import ThreadPoolExecutor, Future
import queue

from pixer_client import PixerClient, PixerConnectionError
from image_processor import PixerImageProcessor, ImageProcessingError

logger = logging.getLogger(__name__)

class PixerService:
    """
    High-level service for Pixer device operations.
    Provides async-friendly interface for web applications.
    """
    
    def __init__(self, host: str = '192.168.1.1', port: int = 6000):
        self.host = host
        self.port = port
        self.image_processor = PixerImageProcessor()
        self.executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="pixer")
        self._device_info_cache = None
        self._cache_timestamp = 0
        self._cache_ttl = 30  # Cache device info for 30 seconds
        
    def check_device_async(self, callback: Optional[Callable] = None) -> Future:
        """
        Asynchronously check device status and get device information
        
        Args:
            callback: Optional callback function to call with results
            
        Returns:
            Future: Future object for the operation
        """
        def task():
            result = self._check_device_sync()
            if callback:
                callback(result)
            return result
            
        return self.executor.submit(task)
    
    def _check_device_sync(self) -> Dict[str, Any]:
        """
        Synchronously check device status and get device information
        
        Returns:
            dict: Device status and information
        """
        result = {
            'success': False,
            'timestamp': time.time(),
            'device_info': {},
            'error': None
        }
        
        try:
            with PixerClient(self.host, self.port) as client:
                client.connect()
                device_info = client.get_device_info()
                
                result['success'] = device_info.get('connected', False)
                result['device_info'] = device_info
                
                if not result['success']:
                    result['error'] = device_info.get('error', 'Device not responding')
                else:
                    # Cache the device info
                    self._device_info_cache = device_info
                    self._cache_timestamp = time.time()
                    
        except Exception as e:
            result['error'] = str(e)
            logger.error(f"Error checking device: {e}")
            
        return result
    
    def get_cached_device_info(self) -> Optional[Dict[str, Any]]:
        """
        Get cached device information if available and not expired
        
        Returns:
            dict: Cached device info or None if not available/expired
        """
        if (self._device_info_cache and 
            time.time() - self._cache_timestamp < self._cache_ttl):
            return self._device_info_cache
        return None
    
    def reset_device_async(self, callback: Optional[Callable] = None) -> Future:
        """
        Asynchronously reset the Pixer device
        
        Args:
            callback: Optional callback function to call with results
            
        Returns:
            Future: Future object for the operation
        """
        def task():
            result = self._reset_device_sync()
            if callback:
                callback(result)
            return result
            
        return self.executor.submit(task)
    
    def _reset_device_sync(self) -> Dict[str, Any]:
        """
        Synchronously reset the Pixer device
        
        Returns:
            dict: Reset operation result
        """
        result = {
            'success': False,
            'timestamp': time.time(),
            'error': None
        }
        
        try:
            with PixerClient(self.host, self.port) as client:
                client.connect()
                success = client.reset_device()
                result['success'] = success
                
                if not success:
                    result['error'] = "Failed to send reset command"
                    
        except Exception as e:
            result['error'] = str(e)
            logger.error(f"Error resetting device: {e}")
            
        return result
    
    def upload_image_async(self, image_data: bytes, 
                          progress_callback: Optional[Callable] = None,
                          completion_callback: Optional[Callable] = None) -> Future:
        """
        Asynchronously upload image to Pixer device
        
        Args:
            image_data: Raw image data to process and upload
            progress_callback: Optional callback for progress updates
            completion_callback: Optional callback for completion
            
        Returns:
            Future: Future object for the operation
        """
        def task():
            result = self._upload_image_sync(image_data, progress_callback)
            if completion_callback:
                completion_callback(result)
            return result
            
        return self.executor.submit(task)
    
    def _upload_image_sync(self, image_data: bytes, 
                          progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """
        Synchronously process and upload image to Pixer device
        
        Args:
            image_data: Raw image data to process and upload
            progress_callback: Optional callback for progress updates
            
        Returns:
            dict: Upload operation result
        """
        result = {
            'success': False,
            'timestamp': time.time(),
            'image_info': {},
            'upload_info': {},
            'error': None,
            'stage': 'starting'
        }
        
        try:
            # Stage 1: Validate image
            if progress_callback:
                progress_callback({'stage': 'validating', 'progress': 10})
            result['stage'] = 'validating'
            
            image_info = self.image_processor.validate_image_data(image_data)
            result['image_info'] = image_info
            
            if not image_info['valid']:
                result['error'] = f"Invalid image: {image_info.get('error', 'Unknown error')}"
                return result
            
            # Stage 2: Process image
            if progress_callback:
                progress_callback({'stage': 'processing', 'progress': 30})
            result['stage'] = 'processing'
            
            processed_data = self.image_processor.process_image_data(image_data)
            if not processed_data:
                result['error'] = "Failed to process image"
                return result
            
            # Stage 3: Connect to device
            if progress_callback:
                progress_callback({'stage': 'connecting', 'progress': 50})
            result['stage'] = 'connecting'
            
            with PixerClient(self.host, self.port) as client:
                client.connect()
                
                # Stage 4: Upload data
                if progress_callback:
                    progress_callback({'stage': 'uploading', 'progress': 70})
                result['stage'] = 'uploading'
                
                upload_result = client.upload_image_data(processed_data)
                result['upload_info'] = upload_result
                
                if upload_result['success']:
                    result['success'] = True
                    if progress_callback:
                        progress_callback({'stage': 'complete', 'progress': 100})
                    result['stage'] = 'complete'
                else:
                    result['error'] = upload_result.get('error', 'Upload failed')
                    
        except ImageProcessingError as e:
            result['error'] = f"Image processing error: {e}"
            logger.error(f"Image processing error: {e}")
        except PixerConnectionError as e:
            result['error'] = f"Connection error: {e}"
            logger.error(f"Connection error: {e}")
        except Exception as e:
            result['error'] = f"Unexpected error: {e}"
            logger.error(f"Unexpected error during upload: {e}")
            
        return result
    
    def upload_image_file_async(self, file_path: str,
                               progress_callback: Optional[Callable] = None,
                               completion_callback: Optional[Callable] = None) -> Future:
        """
        Asynchronously upload image file to Pixer device
        
        Args:
            file_path: Path to image file
            progress_callback: Optional callback for progress updates
            completion_callback: Optional callback for completion
            
        Returns:
            Future: Future object for the operation
        """
        def task():
            result = self._upload_image_file_sync(file_path, progress_callback)
            if completion_callback:
                completion_callback(result)
            return result
            
        return self.executor.submit(task)
    
    def _upload_image_file_sync(self, file_path: str,
                               progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """
        Synchronously process and upload image file to Pixer device
        
        Args:
            file_path: Path to image file
            progress_callback: Optional callback for progress updates
            
        Returns:
            dict: Upload operation result
        """
        try:
            with open(file_path, 'rb') as f:
                image_data = f.read()
            return self._upload_image_sync(image_data, progress_callback)
        except FileNotFoundError:
            return {
                'success': False,
                'timestamp': time.time(),
                'error': f"File not found: {file_path}",
                'stage': 'error'
            }
        except Exception as e:
            return {
                'success': False,
                'timestamp': time.time(),
                'error': f"Error reading file: {e}",
                'stage': 'error'
            }
    
    def get_device_status(self) -> Dict[str, Any]:
        """
        Get current device status (uses cache if available)
        
        Returns:
            dict: Device status information
        """
        cached_info = self.get_cached_device_info()
        if cached_info:
            return {
                'success': True,
                'device_info': cached_info,
                'cached': True,
                'cache_age': time.time() - self._cache_timestamp
            }
        else:
            return {
                'success': False,
                'device_info': {},
                'cached': False,
                'error': 'No cached data available'
            }
    
    def shutdown(self):
        """Shutdown the service and cleanup resources"""
        self.executor.shutdown(wait=True)
        logger.debug("PixerService shutdown complete")
