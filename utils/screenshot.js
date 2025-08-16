// Screenshot capture utility for LaterLens Chrome extension
// 스크린샷 캡처 유틸리티 - LaterLens 크롬 확장 프로그램

/**
 * Screenshot capture service for generating page thumbnails
 * 페이지 썸네일 생성을 위한 스크린샷 캡처 서비스
 */
class ScreenshotService {
    constructor() {
        this.defaultOptions = {
            format: 'png',
            quality: 80,
            maxWidth: 800,
            maxHeight: 600,
            thumbnailWidth: 400,
            thumbnailHeight: 300,
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 10000
        };
        
        // Canvas for image processing
        this.canvas = null;
        this.context = null;
        
        this.initializeCanvas();
    }

    /**
     * Initialize canvas for image processing
     * 이미지 처리를 위한 캔버스 초기화
     */
    initializeCanvas() {
        try {
            if (typeof document !== 'undefined') {
                this.canvas = document.createElement('canvas');
                this.context = this.canvas.getContext('2d');
            }
        } catch (error) {
            console.warn('Canvas not available for image processing:', error);
        }
    }

    /**
     * Capture screenshot of the current tab
     * 현재 탭의 스크린샷 캡처
     */
    async captureTab(tabId, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        
        try {
            // Get tab information
            const tab = await chrome.tabs.get(tabId);
            if (!tab) {
                throw new Error('Tab not found');
            }

            // Check if tab is capturable
            if (!this.isTabCapturable(tab)) {
                throw new Error('Tab cannot be captured (chrome://, extension://, or file:// URL)');
            }

            // Wait for tab to be ready
            await this.waitForTabReady(tabId, config.timeout);

            // Capture the visible area
            const dataUrl = await this.captureVisibleTab(tab.windowId, config);
            
            // Process the screenshot
            const processedImage = await this.processScreenshot(dataUrl, config);
            
            return {
                success: true,
                dataUrl: processedImage,
                originalDataUrl: dataUrl,
                metadata: {
                    tabId: tabId,
                    url: tab.url,
                    title: tab.title,
                    capturedAt: Date.now(),
                    format: config.format,
                    quality: config.quality,
                    dimensions: await this.getImageDimensions(processedImage)
                }
            };
        } catch (error) {
            console.error('Screenshot capture failed:', error);
            
            // Try fallback methods
            const fallbackResult = await this.tryFallbackCapture(tabId, config);
            if (fallbackResult) {
                return fallbackResult;
            }
            
            return {
                success: false,
                error: error.message,
                fallback: await this.generateFallbackThumbnail(tabId, config)
            };
        }
    }

    /**
     * Check if tab can be captured
     * 탭이 캡처 가능한지 확인
     */
    isTabCapturable(tab) {
        if (!tab.url) return false;
        
        const restrictedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'file:', 'about:'];
        return !restrictedProtocols.some(protocol => tab.url.startsWith(protocol));
    }

    /**
     * Wait for tab to be ready for capture
     * 탭이 캡처 준비가 될 때까지 대기
     */
    async waitForTabReady(tabId, timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                const tab = await chrome.tabs.get(tabId);
                
                if (tab.status === 'complete') {
                    // Additional wait for dynamic content
                    await this.delay(500);
                    return true;
                }
                
                await this.delay(100);
            } catch (error) {
                throw new Error('Tab became unavailable while waiting');
            }
        }
        
        throw new Error('Timeout waiting for tab to be ready');
    }

    /**
     * Capture visible tab area
     * 보이는 탭 영역 캡처
     */
    async captureVisibleTab(windowId, config) {
        const captureOptions = {
            format: config.format,
            quality: config.quality / 100 // Chrome expects 0-1 range
        };

        // Try with retry logic
        for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
            try {
                console.log(`Capture attempt ${attempt}, windowId:`, windowId, 'options:', captureOptions);
                
                // Check if we have the necessary permissions
                if (!chrome.tabs || !chrome.tabs.captureVisibleTab) {
                    throw new Error('chrome.tabs.captureVisibleTab API not available');
                }
                
                const dataUrl = await chrome.tabs.captureVisibleTab(windowId, captureOptions);
                
                if (!dataUrl) {
                    throw new Error('No data returned from capture');
                }
                
                console.log('Capture successful, data URL length:', dataUrl.length);
                return dataUrl;
            } catch (error) {
                console.warn(`Capture attempt ${attempt} failed:`, {
                    name: error.name,
                    message: error.message,
                    code: error.code
                });
                
                if (attempt === config.retryAttempts) {
                    throw error;
                }
                
                await this.delay(config.retryDelay);
            }
        }
    }

    /**
     * Process screenshot (resize, optimize)
     * 스크린샷 처리 (크기 조정, 최적화)
     */
    async processScreenshot(dataUrl, config) {
        try {
            if (!this.canvas || !this.context) {
                // Return original if canvas not available
                return dataUrl;
            }

            // Load image
            const img = await this.loadImage(dataUrl);
            
            // Calculate dimensions
            const dimensions = this.calculateThumbnailDimensions(
                img.width, 
                img.height, 
                config.thumbnailWidth, 
                config.thumbnailHeight
            );

            // Resize image
            this.canvas.width = dimensions.width;
            this.canvas.height = dimensions.height;

            // Clear canvas
            this.context.clearRect(0, 0, dimensions.width, dimensions.height);

            // Draw resized image
            this.context.drawImage(
                img, 
                0, 0, img.width, img.height,
                0, 0, dimensions.width, dimensions.height
            );

            // Apply image enhancements
            await this.enhanceImage(config);

            // Convert to data URL
            const quality = config.format === 'jpeg' ? config.quality / 100 : undefined;
            return this.canvas.toDataURL(`image/${config.format}`, quality);
        } catch (error) {
            console.warn('Image processing failed, returning original:', error);
            return dataUrl;
        }
    }

    /**
     * Load image from data URL
     * 데이터 URL에서 이미지 로드
     */
    loadImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
        });
    }

    /**
     * Calculate thumbnail dimensions maintaining aspect ratio
     * 종횡비를 유지하면서 썸네일 크기 계산
     */
    calculateThumbnailDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        const aspectRatio = originalWidth / originalHeight;
        
        let width = maxWidth;
        let height = maxHeight;
        
        if (aspectRatio > maxWidth / maxHeight) {
            // Image is wider
            height = maxWidth / aspectRatio;
        } else {
            // Image is taller
            width = maxHeight * aspectRatio;
        }
        
        return {
            width: Math.round(width),
            height: Math.round(height)
        };
    }

    /**
     * Enhance image quality
     * 이미지 품질 향상
     */
    async enhanceImage(config) {
        if (!this.context) return;
        
        try {
            // Get image data
            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;
            
            // Apply enhancements based on config
            if (config.sharpen) {
                this.applySharpenFilter(data, this.canvas.width, this.canvas.height);
            }
            
            if (config.brighten) {
                this.applyBrightnessFilter(data, config.brighten);
            }
            
            if (config.contrast) {
                this.applyContrastFilter(data, config.contrast);
            }
            
            // Put enhanced image data back
            this.context.putImageData(imageData, 0, 0);
        } catch (error) {
            console.warn('Image enhancement failed:', error);
        }
    }

    /**
     * Apply sharpen filter
     * 선명도 필터 적용
     */
    applySharpenFilter(data, width, height) {
        const sharpenKernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        
        this.applyConvolutionFilter(data, width, height, sharpenKernel);
    }

    /**
     * Apply brightness filter
     * 밝기 필터 적용
     */
    applyBrightnessFilter(data, brightness) {
        const factor = brightness / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * factor);     // Red
            data[i + 1] = Math.min(255, data[i + 1] * factor); // Green
            data[i + 2] = Math.min(255, data[i + 2] * factor); // Blue
            // Alpha channel (i + 3) remains unchanged
        }
    }

    /**
     * Apply contrast filter
     * 대비 필터 적용
     */
    applyContrastFilter(data, contrast) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
        }
    }

    /**
     * Apply convolution filter
     * 컨볼루션 필터 적용
     */
    applyConvolutionFilter(data, width, height, kernel) {
        const output = new Uint8ClampedArray(data);
        const kernelSize = Math.sqrt(kernel.length);
        const half = Math.floor(kernelSize / 2);
        
        for (let y = half; y < height - half; y++) {
            for (let x = half; x < width - half; x++) {
                let r = 0, g = 0, b = 0;
                
                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const px = x + kx - half;
                        const py = y + ky - half;
                        const idx = (py * width + px) * 4;
                        const weight = kernel[ky * kernelSize + kx];
                        
                        r += data[idx] * weight;
                        g += data[idx + 1] * weight;
                        b += data[idx + 2] * weight;
                    }
                }
                
                const idx = (y * width + x) * 4;
                output[idx] = Math.max(0, Math.min(255, r));
                output[idx + 1] = Math.max(0, Math.min(255, g));
                output[idx + 2] = Math.max(0, Math.min(255, b));
            }
        }
        
        data.set(output);
    }

    /**
     * Try fallback capture methods
     * 대체 캡처 방법 시도
     */
    async tryFallbackCapture(tabId, config) {
        try {
            // Try capturing with different format
            if (config.format === 'png') {
                const jpegConfig = { ...config, format: 'jpeg' };
                return await this.captureTab(tabId, jpegConfig);
            }
            
            // Try with lower quality
            if (config.quality > 50) {
                const lowerQualityConfig = { ...config, quality: 50 };
                return await this.captureTab(tabId, lowerQualityConfig);
            }
            
            return null;
        } catch (error) {
            console.warn('Fallback capture also failed:', error);
            return null;
        }
    }

    /**
     * Generate fallback thumbnail when capture fails
     * 캡처 실패 시 대체 썸네일 생성
     */
    async generateFallbackThumbnail(tabId, config) {
        try {
            const tab = await chrome.tabs.get(tabId);
            return this.createPlaceholderThumbnail(tab, config);
        } catch (error) {
            return this.createDefaultThumbnail(config);
        }
    }

    /**
     * Create placeholder thumbnail with page info
     * 페이지 정보가 포함된 플레이스홀더 썸네일 생성
     */
    createPlaceholderThumbnail(tab, config) {
        if (!this.canvas || !this.context) {
            return this.createDefaultThumbnail(config);
        }
        
        try {
            this.canvas.width = config.thumbnailWidth;
            this.canvas.height = config.thumbnailHeight;
            
            // Background
            this.context.fillStyle = '#f8f9fa';
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Border
            this.context.strokeStyle = '#e9ecef';
            this.context.lineWidth = 2;
            this.context.strokeRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Icon
            this.context.fillStyle = '#6c757d';
            this.context.font = '48px Arial';
            this.context.textAlign = 'center';
            this.context.textBaseline = 'middle';
            this.context.fillText('📄', this.canvas.width / 2, this.canvas.height / 2 - 20);
            
            // Domain text
            if (tab.url) {
                try {
                    const domain = new URL(tab.url).hostname;
                    this.context.font = '14px Arial';
                    this.context.fillStyle = '#495057';
                    this.context.fillText(domain, this.canvas.width / 2, this.canvas.height / 2 + 30);
                } catch (error) {
                    // Ignore URL parsing errors
                }
            }
            
            return this.canvas.toDataURL('image/png');
        } catch (error) {
            console.warn('Failed to create placeholder thumbnail:', error);
            return this.createDefaultThumbnail(config);
        }
    }

    /**
     * Create default thumbnail
     * 기본 썸네일 생성
     */
    createDefaultThumbnail(config) {
        // Return a simple data URL for a gray placeholder
        const width = config.thumbnailWidth;
        const height = config.thumbnailHeight;
        
        // Create a simple SVG placeholder
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f8f9fa" stroke="#e9ecef" stroke-width="2"/>
                <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="48" fill="#6c757d">📄</text>
            </svg>
        `;
        
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    /**
     * Get image dimensions from data URL
     * 데이터 URL에서 이미지 크기 가져오기
     */
    async getImageDimensions(dataUrl) {
        try {
            const img = await this.loadImage(dataUrl);
            return {
                width: img.width,
                height: img.height
            };
        } catch (error) {
            return {
                width: this.defaultOptions.thumbnailWidth,
                height: this.defaultOptions.thumbnailHeight
            };
        }
    }

    /**
     * Capture multiple tabs
     * 여러 탭 캡처
     */
    async captureMultipleTabs(tabIds, options = {}) {
        const results = [];
        const config = { ...this.defaultOptions, ...options };
        
        for (const tabId of tabIds) {
            try {
                const result = await this.captureTab(tabId, config);
                results.push({ tabId, ...result });
                
                // Add delay between captures to avoid overwhelming the system
                if (config.batchDelay) {
                    await this.delay(config.batchDelay);
                }
            } catch (error) {
                results.push({
                    tabId,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Optimize image for storage
     * 저장을 위한 이미지 최적화
     */
    async optimizeForStorage(dataUrl, targetSizeKB = 100) {
        try {
            let currentDataUrl = dataUrl;
            let currentSize = this.getDataUrlSizeKB(currentDataUrl);
            
            if (currentSize <= targetSizeKB) {
                return currentDataUrl;
            }
            
            // Try reducing quality
            for (let quality = 80; quality >= 20; quality -= 10) {
                const optimized = await this.processScreenshot(dataUrl, {
                    ...this.defaultOptions,
                    quality: quality,
                    format: 'jpeg'
                });
                
                const size = this.getDataUrlSizeKB(optimized);
                if (size <= targetSizeKB) {
                    return optimized;
                }
                
                currentDataUrl = optimized;
            }
            
            // Try reducing dimensions
            const img = await this.loadImage(currentDataUrl);
            const scaleFactor = Math.sqrt(targetSizeKB / currentSize);
            
            const newWidth = Math.round(img.width * scaleFactor);
            const newHeight = Math.round(img.height * scaleFactor);
            
            return await this.processScreenshot(dataUrl, {
                ...this.defaultOptions,
                thumbnailWidth: newWidth,
                thumbnailHeight: newHeight,
                quality: 60,
                format: 'jpeg'
            });
        } catch (error) {
            console.warn('Image optimization failed:', error);
            return dataUrl;
        }
    }

    /**
     * Get data URL size in KB
     * 데이터 URL 크기를 KB 단위로 가져오기
     */
    getDataUrlSizeKB(dataUrl) {
        // Remove data URL prefix and calculate base64 size
        const base64 = dataUrl.split(',')[1] || dataUrl;
        const sizeBytes = (base64.length * 3) / 4;
        return sizeBytes / 1024;
    }

    /**
     * Delay utility
     * 지연 유틸리티
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clean up resources
     * 리소스 정리
     */
    cleanup() {
        if (this.canvas) {
            this.canvas.width = 0;
            this.canvas.height = 0;
            this.canvas = null;
            this.context = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenshotService;
} else if (typeof window !== 'undefined') {
    window.ScreenshotService = ScreenshotService;
}