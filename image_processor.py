import logging
from PIL import Image
from typing import Optional, Tuple, Dict, Any
import io

logger = logging.getLogger(__name__)

class ImageProcessingError(Exception):
    """Custom exception for image processing errors"""
    pass

class PixerImageProcessor:
    """
    Image processor for Pixer E-Ink photo frame.
    Handles image conversion to the required 4-bit grayscale packed format.
    """
    
    # Pixer device display specifications
    DEFAULT_WIDTH = 1872
    DEFAULT_HEIGHT = 1404
    HEADER_STRING = "#file#000801314144imagebin"
    
    def __init__(self, target_width: int = DEFAULT_WIDTH, target_height: int = DEFAULT_HEIGHT):
        self.target_width = target_width
        self.target_height = target_height
        
    def process_image_file(self, file_path: str) -> Optional[bytes]:
        """
        Process an image file for Pixer device
        
        Args:
            file_path: Path to the image file
            
        Returns:
            bytes: Processed image data ready for upload, or None if failed
        """
        try:
            with Image.open(file_path) as img:
                return self._process_image(img)
        except FileNotFoundError:
            logger.error(f"Image file not found: {file_path}")
            return None
        except Exception as e:
            logger.error(f"Error processing image file {file_path}: {e}")
            return None
    
    def process_image_data(self, image_data: bytes) -> Optional[bytes]:
        """
        Process image data from bytes (e.g., uploaded file)
        
        Args:
            image_data: Raw image data as bytes
            
        Returns:
            bytes: Processed image data ready for upload, or None if failed
        """
        try:
            with Image.open(io.BytesIO(image_data)) as img:
                return self._process_image(img)
        except Exception as e:
            logger.error(f"Error processing image data: {e}")
            return None
    
    def _process_image(self, img: Image.Image) -> bytes:
        """
        Internal method to process PIL Image object
        
        Args:
            img: PIL Image object
            
        Returns:
            bytes: Processed image data ready for upload
            
        Raises:
            ImageProcessingError: If processing fails
        """
        try:
            # Auto-rotate portrait images to landscape
            if img.size[1] > img.size[0]:  # height > width
                img = img.transpose(Image.Transpose.ROTATE_90)
                logger.debug("Rotated portrait image to landscape")
            
            # Calculate scaling to fit target dimensions while maintaining aspect ratio
            img_ratio = img.width / img.height
            target_ratio = self.target_width / self.target_height
            
            if img_ratio >= target_ratio:
                # Image is wider than target ratio - fit to height
                new_height = self.target_height
                new_width = int(img.width * (new_height / img.height))
            else:
                # Image is taller than target ratio - fit to width
                new_width = self.target_width
                new_height = int(img.height * (new_width / img.width))
            
            # Resize image with high-quality resampling
            img = img.resize((new_width, new_height), Image.LANCZOS)
            logger.debug(f"Resized image to {new_width}x{new_height}")
            
            # Center crop to exact target dimensions
            left = (new_width - self.target_width) / 2
            top = (new_height - self.target_height) / 2
            right = left + self.target_width
            bottom = top + self.target_height
            
            img = img.crop((left, top, right, bottom))
            logger.debug(f"Cropped image to {self.target_width}x{self.target_height}")
            
            # Convert to grayscale
            grayscale_img = img.convert('L')
            pixels = list(grayscale_img.getdata())
            
            # Pack pixels into 4-bit format (2 pixels per byte)
            packed_data = self._pack_pixels_4bit(pixels)
            
            # Add Pixer protocol header
            header_bytes = bytes.fromhex(self.HEADER_STRING.encode('utf-8').hex())
            combined_data = header_bytes + packed_data
            
            logger.debug(f"Successfully processed image: {len(combined_data)} bytes total")
            return combined_data
            
        except Exception as e:
            raise ImageProcessingError(f"Failed to process image: {e}")
    
    def _pack_pixels_4bit(self, pixels: list) -> bytearray:
        """
        Pack 8-bit grayscale pixels into 4-bit format (2 pixels per byte)
        
        Args:
            pixels: List of 8-bit grayscale pixel values (0-255)
            
        Returns:
            bytearray: Packed 4-bit pixel data
        """
        packed_data = bytearray()
        
        for i in range(0, len(pixels), 2):
            # Convert 8-bit to 4-bit by right-shifting 4 bits
            pixel1 = pixels[i] >> 4
            
            if i + 1 < len(pixels):
                pixel2 = pixels[i + 1] >> 4
            else:
                pixel2 = 0  # Pad with 0 if odd number of pixels
            
            # Pack two 4-bit pixels into one byte
            packed_byte = (pixel2 << 4) | pixel1
            packed_data.append(packed_byte)
        
        return packed_data
    
    def get_image_info(self, file_path: str) -> Dict[str, Any]:
        """
        Get information about an image file without processing it
        
        Args:
            file_path: Path to the image file
            
        Returns:
            dict: Image information including dimensions, format, etc.
        """
        info = {
            'valid': False,
            'width': None,
            'height': None,
            'format': None,
            'mode': None,
            'size_bytes': None,
            'error': None
        }
        
        try:
            with Image.open(file_path) as img:
                info.update({
                    'valid': True,
                    'width': img.width,
                    'height': img.height,
                    'format': img.format,
                    'mode': img.mode,
                })
                
            # Get file size
            import os
            info['size_bytes'] = os.path.getsize(file_path)
            
        except FileNotFoundError:
            info['error'] = "File not found"
        except Exception as e:
            info['error'] = str(e)
            
        return info
    
    def validate_image_data(self, image_data: bytes) -> Dict[str, Any]:
        """
        Validate image data from bytes
        
        Args:
            image_data: Raw image data as bytes
            
        Returns:
            dict: Validation result with image info
        """
        info = {
            'valid': False,
            'width': None,
            'height': None,
            'format': None,
            'mode': None,
            'size_bytes': len(image_data),
            'error': None
        }
        
        try:
            with Image.open(io.BytesIO(image_data)) as img:
                info.update({
                    'valid': True,
                    'width': img.width,
                    'height': img.height,
                    'format': img.format,
                    'mode': img.mode,
                })
        except Exception as e:
            info['error'] = str(e)
            
        return info
    
    @classmethod
    def get_supported_formats(cls) -> list:
        """
        Get list of supported image formats
        
        Returns:
            list: Supported image format extensions
        """
        return ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp']
    
    def calculate_processed_size(self) -> int:
        """
        Calculate the size of processed image data
        
        Returns:
            int: Size in bytes of processed image data
        """
        # Each pixel is 4 bits, so 2 pixels per byte
        pixel_data_size = (self.target_width * self.target_height) // 2
        header_size = len(bytes.fromhex(self.HEADER_STRING.encode('utf-8').hex()))
        return header_size + pixel_data_size
