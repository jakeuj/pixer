const net = require('net');
const { EventEmitter } = require('events');

class PixerClient extends EventEmitter {
    constructor(host = '192.168.1.1', port = 6000) {
        super();
        this.host = host;
        this.port = port;
        this.socket = null;
        this.isConnected = false;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 10;
            
            const tryConnect = () => {
                attempts++;
                console.log(`Connection attempt ${attempts}/${maxAttempts}`);
                
                this.socket = new net.Socket();
                this.socket.setTimeout(2000);
                
                this.socket.on('connect', () => {
                    console.log('Connected successfully');
                    this.isConnected = true;
                    resolve();
                });
                
                this.socket.on('error', (error) => {
                    console.log(`Connection attempt ${attempts} failed: ${error.message}`);
                    this.socket.destroy();
                    
                    if (attempts < maxAttempts) {
                        setTimeout(tryConnect, 2000);
                    } else {
                        this.isConnected = false;
                        reject(new Error(`Failed to connect after ${maxAttempts} attempts`));
                    }
                });
                
                this.socket.on('timeout', () => {
                    console.log(`Connection attempt ${attempts} timed out`);
                    this.socket.destroy();
                    
                    if (attempts < maxAttempts) {
                        setTimeout(tryConnect, 2000);
                    } else {
                        this.isConnected = false;
                        reject(new Error(`Connection timed out after ${maxAttempts} attempts`));
                    }
                });
                
                this.socket.connect(this.port, this.host);
            };
            
            tryConnect();
        });
    }

    async send(data) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.isConnected) {
                reject(new Error('Not connected to device'));
                return;
            }

            let responseReceived = false;
            let retries = 0;
            const maxRetries = 5;

            const handleResponse = (chunk) => {
                if (!responseReceived) {
                    responseReceived = true;
                    this.socket.removeListener('data', handleResponse);
                    resolve(chunk.toString());
                }
            };

            const handleTimeout = () => {
                retries++;
                console.log(`Timeout, retrying... ${retries}/${maxRetries}`);
                
                if (retries < maxRetries) {
                    this.socket.setTimeout(2000);
                } else {
                    this.socket.removeListener('data', handleResponse);
                    if (!responseReceived) {
                        reject(new Error('Response timeout after multiple retries'));
                    }
                }
            };

            this.socket.on('data', handleResponse);
            this.socket.on('timeout', handleTimeout);
            this.socket.setTimeout(2000);

            try {
                this.socket.write(data);
            } catch (error) {
                this.socket.removeListener('data', handleResponse);
                reject(new Error(`Error sending data: ${error.message}`));
            }
        });
    }

    async uploadImage(data, progressCallback) {
        return new Promise(async (resolve, reject) => {
            try {
                // Ensure we have a fresh connection for upload
                await this.connect();

                // Verify connection with test command
                const testResponse = await this.send(Buffer.from('#TEST#'));
                if (testResponse !== 'Hello PC!') {
                    throw new Error('Invalid test response from device');
                }

                this.socket.setTimeout(10000);
                const chunkSize = 4096;
                let offset = 0;

                const sendChunk = () => {
                    if (offset >= data.length) {
                        // Send the tail command
                        const tail = Buffer.from('#MOVE#d', 'utf-8');
                        this.socket.write(tail);
                        this.close();
                        resolve('Upload completed');
                        return;
                    }

                    const chunk = data.slice(offset, offset + chunkSize);
                    this.socket.write(chunk);
                    offset += chunk.length;

                    const progress = Math.floor((offset * 100) / data.length);
                    if (progressCallback) {
                        progressCallback(progress);
                    }

                    // Continue with next chunk
                    setImmediate(sendChunk);
                };

                sendChunk();

            } catch (error) {
                this.close();
                reject(new Error(`Error in upload: ${error.message}`));
            }
        });
    }

    async checkDevice() {
        try {
            await this.connect();
            
            const testResponse = await this.send(Buffer.from('#TEST#'));
            if (testResponse !== 'Hello PC!') {
                throw new Error('Invalid test response from device');
            }
            
            const bleVersion = await this.send(Buffer.from('bleVersion'));
            const iteVersion = await this.send(Buffer.from('iteVersion'));
            const mcuVersion = await this.send(Buffer.from('mcuVersion'));
            const batteryLevel = await this.send(Buffer.from('batteryLevel'));
            
            const deviceInfo = {
                bleVersion: bleVersion.trim(),
                iteVersion: iteVersion.trim(),
                mcuVersion: mcuVersion.trim(),
                batteryLevel: parseInt(batteryLevel.trim()) || 0
            };
            
            this.close();
            return deviceInfo;
            
        } catch (error) {
            this.close();
            throw error;
        }
    }

    async resetDevice() {
        try {
            await this.connect();
            
            const testResponse = await this.send(Buffer.from('#TEST#'));
            if (testResponse !== 'Hello PC!') {
                throw new Error('Invalid test response from device');
            }
            
            await this.send(Buffer.from('reset'));
            this.close();
            
        } catch (error) {
            this.close();
            throw error;
        }
    }

    close() {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.isConnected = false;
    }
}

module.exports = PixerClient;
