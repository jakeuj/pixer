// Pixer Web Interface JavaScript

class PixerApp {
    constructor() {
        this.operationModal = null;
        this.operationPollingInterval = null;
        this.deviceStatusPollingInterval = null;
        this.init();
    }

    init() {
        // Initialize Bootstrap modal
        const modalElement = document.getElementById('operationModal');
        if (modalElement) {
            this.operationModal = new bootstrap.Modal(modalElement);
        }

        // Start device status polling
        this.startDeviceStatusPolling();

        // Setup event listeners
        this.setupEventListeners();

        console.log('Pixer Web Interface initialized');
    }

    setupEventListeners() {
        // Handle modal close events
        const modalElement = document.getElementById('operationModal');
        if (modalElement) {
            modalElement.addEventListener('hidden.bs.modal', () => {
                this.stopOperationPolling();
            });
        }

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopDeviceStatusPolling();
            } else {
                this.startDeviceStatusPolling();
            }
        });

        // Handle window beforeunload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    // Device Status Management
    startDeviceStatusPolling() {
        // Poll device status every 30 seconds
        this.deviceStatusPollingInterval = setInterval(() => {
            this.updateDeviceStatusIndicator();
        }, 30000);

        // Initial update
        this.updateDeviceStatusIndicator();
    }

    stopDeviceStatusPolling() {
        if (this.deviceStatusPollingInterval) {
            clearInterval(this.deviceStatusPollingInterval);
            this.deviceStatusPollingInterval = null;
        }
    }

    async updateDeviceStatusIndicator() {
        try {
            const response = await fetch('/api/device/status');
            const data = await response.json();
            
            const indicator = document.getElementById('device-status-indicator');
            const statusText = document.getElementById('device-status-text');
            
            if (indicator && statusText) {
                const icon = indicator.querySelector('i');
                
                if (data.success && data.device_info.connected) {
                    icon.className = 'fas fa-circle text-success me-1';
                    statusText.textContent = 'Connected';
                    
                    // Show battery level if available
                    if (data.device_info.battery_level) {
                        statusText.textContent = `Connected (${data.device_info.battery_level}%)`;
                    }
                } else {
                    icon.className = 'fas fa-circle text-danger me-1';
                    statusText.textContent = 'Disconnected';
                }
            }
        } catch (error) {
            console.warn('Failed to update device status:', error);
            
            const indicator = document.getElementById('device-status-indicator');
            const statusText = document.getElementById('device-status-text');
            
            if (indicator && statusText) {
                const icon = indicator.querySelector('i');
                icon.className = 'fas fa-circle text-secondary me-1';
                statusText.textContent = 'Unknown';
            }
        }
    }

    // Operation Modal Management
    showOperationModal(title, operationId) {
        if (!this.operationModal) return;

        // Update modal content
        document.getElementById('operation-title').textContent = title;
        document.getElementById('operation-progress').style.width = '0%';
        document.getElementById('operation-progress-text').textContent = '0%';
        document.getElementById('operation-stage').textContent = 'Starting...';
        document.getElementById('operation-result').style.display = 'none';
        document.getElementById('operation-close-btn').style.display = 'none';
        document.getElementById('operation-spinner').style.display = 'inline-block';

        // Reset progress bar
        const progressBar = document.getElementById('operation-progress');
        progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated';
        progressBar.style.width = '0%';

        // Show modal
        this.operationModal.show();

        // Start polling for operation status
        this.startOperationPolling(operationId);
    }

    hideOperationModal() {
        if (this.operationModal) {
            this.operationModal.hide();
        }
        this.stopOperationPolling();
    }

    startOperationPolling(operationId) {
        this.stopOperationPolling(); // Clear any existing polling

        this.operationPollingInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/operation/status');
                const data = await response.json();

                if (data.current_operation === operationId) {
                    this.updateOperationModal(data);
                } else if (data.current_operation === null) {
                    // Operation completed or cleared
                    this.stopOperationPolling();
                }
            } catch (error) {
                console.error('Failed to poll operation status:', error);
                this.stopOperationPolling();
            }
        }, 1000); // Poll every second
    }

    stopOperationPolling() {
        if (this.operationPollingInterval) {
            clearInterval(this.operationPollingInterval);
            this.operationPollingInterval = null;
        }
    }

    updateOperationModal(data) {
        // Update progress bar
        const progressBar = document.getElementById('operation-progress');
        const progressText = document.getElementById('operation-progress-text');
        const stageText = document.getElementById('operation-stage');
        const resultDiv = document.getElementById('operation-result');
        const closeBtn = document.getElementById('operation-close-btn');
        const spinner = document.getElementById('operation-spinner');

        if (progressBar && progressText) {
            progressBar.style.width = `${data.progress}%`;
            progressText.textContent = `${data.progress}%`;
        }

        if (stageText) {
            stageText.textContent = this.formatStage(data.stage);
        }

        // Handle completion
        if (data.stage === 'complete' && data.result) {
            this.handleOperationComplete(data);
            
            if (spinner) spinner.style.display = 'none';
            if (closeBtn) closeBtn.style.display = 'inline-block';
            if (progressBar) {
                progressBar.className = data.result.success ? 
                    'progress-bar bg-success' : 'progress-bar bg-danger';
            }
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('operationComplete', {
                detail: { operation: data.current_operation, result: data.result }
            }));
        }
    }

    handleOperationComplete(data) {
        const resultDiv = document.getElementById('operation-result');
        if (!resultDiv) return;

        let resultHtml = '';
        
        if (data.result.success) {
            resultHtml = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>Operation completed successfully!</strong>
                </div>
            `;
            
            // Add specific success messages
            if (data.current_operation === 'image_upload') {
                resultHtml += `
                    <div class="small text-muted">
                        Image uploaded and displayed on device.
                    </div>
                `;
            } else if (data.current_operation === 'device_check') {
                resultHtml += `
                    <div class="small text-muted">
                        Device status updated successfully.
                    </div>
                `;
            }
        } else {
            resultHtml = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Operation failed:</strong> ${data.result.error || 'Unknown error'}
                </div>
            `;
        }

        resultDiv.innerHTML = resultHtml;
        resultDiv.style.display = 'block';
    }

    formatStage(stage) {
        const stageMap = {
            'idle': 'Idle',
            'starting': 'Starting...',
            'validating': 'Validating image...',
            'processing': 'Processing image...',
            'connecting': 'Connecting to device...',
            'uploading': 'Uploading to device...',
            'checking': 'Checking device...',
            'resetting': 'Resetting device...',
            'complete': 'Complete'
        };
        
        return stageMap[stage] || stage;
    }

    // Utility Methods
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 1060; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    cleanup() {
        this.stopOperationPolling();
        this.stopDeviceStatusPolling();
    }
}

// Global functions for template use
function showOperationModal(title, operationId) {
    if (window.pixerApp) {
        window.pixerApp.showOperationModal(title, operationId);
    }
}

function hideOperationModal() {
    if (window.pixerApp) {
        window.pixerApp.hideOperationModal();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.pixerApp = new PixerApp();
});

// Handle drag and drop for file uploads
document.addEventListener('DOMContentLoaded', function() {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    fileInputs.forEach(input => {
        const dropZone = input.closest('.card-body') || input.parentElement;
        
        if (dropZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.add('dragover');
                }, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.remove('dragover');
                }, false);
            });
            
            dropZone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    input.files = files;
                    // Trigger change event
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, false);
        }
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
});
