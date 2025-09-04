import socket
import time
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class PixerConnectionError(Exception):
    """Custom exception for Pixer device connection errors"""
    pass

class PixerClient:
    """
    Client for communicating with Pixer E-Ink photo frame device.
    Handles TCP connection to device at 192.168.1.1:6000
    """
    
    def __init__(self, host: str = '192.168.1.1', port: int = 6000):
        self.host = host
        self.port = port
        self.socket = None
        self.input = None
        self.output = None
        self.is_connected = False

    def connect(self, max_attempts: int = 10, retry_delay: float = 2.0) -> bool:
        """
        Establish connection to Pixer device
        
        Args:
            max_attempts: Maximum number of connection attempts
            retry_delay: Delay between connection attempts in seconds
            
        Returns:
            bool: True if connection successful, False otherwise
            
        Raises:
            PixerConnectionError: If connection fails after all attempts
        """
        for attempt in range(max_attempts):
            try:
                self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.socket.settimeout(2)
                self.socket.connect((self.host, self.port))
                self.input = self.socket.makefile('rb')
                self.output = self.socket.makefile('wb')
                self.is_connected = True
                logger.debug(f"Connected to Pixer device at {self.host}:{self.port}")
                return True
            except Exception as e:
                logger.debug(f"Connection attempt {attempt + 1}/{max_attempts} failed: {e}")
                if self.socket:
                    self.socket.close()
                    self.socket = None
                if attempt < max_attempts - 1:
                    time.sleep(retry_delay)
        
        self.is_connected = False
        raise PixerConnectionError(f"Failed to connect to Pixer device after {max_attempts} attempts")

    def send_command(self, command: bytes, timeout_retries: int = 5) -> Optional[str]:
        """
        Send a command to the Pixer device and receive response
        
        Args:
            command: Command to send as bytes
            timeout_retries: Number of timeout retries
            
        Returns:
            str: Response from device, or None if failed
        """
        if not self.is_connected or not self.socket:
            raise PixerConnectionError("Not connected to device")
            
        try:
            self.output.write(command)
            self.output.flush()
            
            for retry in range(timeout_retries):
                try:
                    chunk = self.socket.recv(64)
                    if chunk:
                        response = chunk.decode().strip()
                        logger.debug(f"Command: {command}, Response: {response}")
                        return response
                except socket.timeout:
                    logger.debug(f"Timeout on retry {retry + 1}/{timeout_retries}")
                    
            logger.warning(f"No response received for command: {command}")
            return None
            
        except Exception as e:
            logger.error(f"Error sending command {command}: {e}")
            return None

    def test_connection(self) -> bool:
        """
        Test if device is responding correctly
        
        Returns:
            bool: True if device responds with expected message
        """
        try:
            response = self.send_command(b"#TEST#")
            return response == "Hello PC!"
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False

    def get_device_info(self) -> Dict[str, Any]:
        """
        Get comprehensive device information
        
        Returns:
            dict: Device information including versions and battery level
        """
        info = {
            'connected': False,
            'battery_level': None,
            'ble_version': None,
            'ite_version': None,
            'mcu_version': None,
            'error': None
        }
        
        try:
            if not self.test_connection():
                info['error'] = "Device not responding to test command"
                return info
                
            info['connected'] = True
            info['battery_level'] = self.send_command(b"batteryLevel")
            info['ble_version'] = self.send_command(b"bleVersion")
            info['ite_version'] = self.send_command(b"iteVersion")
            info['mcu_version'] = self.send_command(b"mcuVersion")
            
            # Convert battery level to integer if possible
            if info['battery_level']:
                try:
                    info['battery_level'] = int(info['battery_level'])
                except ValueError:
                    pass
                    
        except Exception as e:
            info['error'] = str(e)
            logger.error(f"Error getting device info: {e}")
            
        return info

    def reset_device(self) -> bool:
        """
        Send reset command to device
        
        Returns:
            bool: True if reset command sent successfully
        """
        try:
            if not self.test_connection():
                return False
                
            response = self.send_command(b"reset")
            logger.debug("Reset command sent to device")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting device: {e}")
            return False

    def upload_image_data(self, data: bytes, chunk_size: int = 4096) -> Dict[str, Any]:
        """
        Upload image data to the Pixer device
        
        Args:
            data: Image data to upload
            chunk_size: Size of chunks to send
            
        Returns:
            dict: Upload result with success status and progress info
        """
        result = {
            'success': False,
            'bytes_sent': 0,
            'total_bytes': len(data),
            'error': None
        }
        
        try:
            if not self.socket:
                raise PixerConnectionError("Not connected to device")
                
            self.socket.settimeout(10)
            offset = 0
            
            while offset < len(data):
                chunk = data[offset:offset + chunk_size]
                self.socket.sendall(chunk)
                offset += len(chunk)
                result['bytes_sent'] = offset
                
                # Log progress every 10%
                progress = (offset * 100) // len(data)
                if progress % 10 == 0:
                    logger.debug(f"Upload progress: {progress}%")
            
            # Send completion marker
            tail = "#MOVE#d"
            self.socket.sendall(tail.encode('utf-8'))
            
            result['success'] = True
            logger.debug(f"Successfully uploaded {len(data)} bytes")
            
        except Exception as e:
            result['error'] = str(e)
            logger.error(f"Error uploading image data: {e}")
            
        return result

    def close(self):
        """Close connection to device"""
        self.is_connected = False
        if self.socket:
            try:
                self.socket.close()
            except Exception as e:
                logger.debug(f"Error closing socket: {e}")
            finally:
                self.socket = None
                self.input = None
                self.output = None
        logger.debug("Connection closed")

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()
