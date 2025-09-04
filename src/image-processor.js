const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class ImageProcessor {
    constructor(sourcePath) {
        this.sourcePath = sourcePath;
        this.targetWidth = 1872;
        this.targetHeight = 1404;
    }

    async convert() {
        try {
            if (!fs.existsSync(this.sourcePath)) {
                throw new Error(`File '${this.sourcePath}' not found`);
            }

            console.log(`Processing image: ${this.sourcePath}`);

            // Load and get metadata
            const image = sharp(this.sourcePath);
            const metadata = await image.metadata();
            
            console.log(`Original size: ${metadata.width}x${metadata.height}`);

            let processedImage = image;

            // Rotate if height > width (portrait to landscape)
            if (metadata.height > metadata.width) {
                console.log('Rotating image 90 degrees');
                processedImage = processedImage.rotate(90);
                // Update dimensions after rotation
                const rotatedWidth = metadata.height;
                const rotatedHeight = metadata.width;
                metadata.width = rotatedWidth;
                metadata.height = rotatedHeight;
            }

            // Calculate scaling to fit target dimensions while maintaining aspect ratio
            const imgRatio = metadata.width / metadata.height;
            const targetRatio = this.targetWidth / this.targetHeight;
            
            let newWidth, newHeight;
            
            if (imgRatio >= targetRatio) {
                newHeight = this.targetHeight;
                newWidth = Math.round(metadata.width * (newHeight / metadata.height));
            } else {
                newWidth = this.targetWidth;
                newHeight = Math.round(metadata.height * (newWidth / metadata.width));
            }

            console.log(`Resizing to: ${newWidth}x${newHeight}`);

            // Resize the image
            processedImage = processedImage.resize(newWidth, newHeight, {
                kernel: sharp.kernel.lanczos3
            });

            // Calculate crop coordinates to center the image
            const left = Math.round((newWidth - this.targetWidth) / 2);
            const top = Math.round((newHeight - this.targetHeight) / 2);

            console.log(`Cropping: left=${left}, top=${top}, width=${this.targetWidth}, height=${this.targetHeight}`);

            // Crop to exact target dimensions
            processedImage = processedImage.extract({
                left: Math.max(0, left),
                top: Math.max(0, top),
                width: this.targetWidth,
                height: this.targetHeight
            });

            // Convert to grayscale
            processedImage = processedImage.grayscale();

            // Get raw pixel data
            const { data, info } = await processedImage.raw().toBuffer({ resolveWithObject: true });
            
            console.log(`Final image info: ${info.width}x${info.height}, channels: ${info.channels}`);

            // Convert to 4-bit grayscale packed format
            const packedData = this.packPixelData(data);

            // Create header
            const headerString = '#file#000801314144imagebin';
            const headerBuffer = Buffer.from(headerString, 'utf-8');

            // Combine header and packed data
            const combinedData = Buffer.concat([headerBuffer, packedData]);

            console.log(`Successfully converted image '${this.sourcePath}', total size: ${combinedData.length} bytes`);
            
            return combinedData;

        } catch (error) {
            console.error(`Error processing image: ${error.message}`);
            throw new Error(`Error handling the image: ${error.message}`);
        }
    }

    packPixelData(pixelData) {
        const packedData = [];
        
        // Process pixels in pairs for 4-bit packing
        for (let i = 0; i < pixelData.length; i += 2) {
            // Convert 8-bit to 4-bit by right-shifting 4 bits
            const pixel1 = pixelData[i] >> 4;
            const pixel2 = i + 1 < pixelData.length ? pixelData[i + 1] >> 4 : 0;
            
            // Pack two 4-bit pixels into one byte
            // pixel2 in high nibble, pixel1 in low nibble
            const packedByte = (pixel2 << 4) | pixel1;
            packedData.push(packedByte);
        }
        
        return Buffer.from(packedData);
    }

    // Utility method to get image info without processing
    async getImageInfo() {
        try {
            const metadata = await sharp(this.sourcePath).metadata();
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: metadata.size
            };
        } catch (error) {
            throw new Error(`Error reading image info: ${error.message}`);
        }
    }

    // Static method to validate image file
    static async validateImageFile(filePath) {
        try {
            const metadata = await sharp(filePath).metadata();
            const supportedFormats = ['jpeg', 'png', 'bmp', 'gif', 'webp', 'tiff'];
            
            if (!supportedFormats.includes(metadata.format)) {
                throw new Error(`Unsupported image format: ${metadata.format}`);
            }
            
            return true;
        } catch (error) {
            throw new Error(`Invalid image file: ${error.message}`);
        }
    }
}

module.exports = ImageProcessor;
