// Loading states and progress indicators for LaterLens Chrome extension
// 로딩 상태 및 진행 표시기 - 사용자 피드백을 위한 시각적 인디케이터

class LoadingManager {
    constructor() {
        this.activeLoaders = new Map();
        this.loadingOverlays = new Map();
        this.progressBars = new Map();
        this.init();
    }

    init() {
        this.setupStyles();
    }

    /**
     * Setup CSS styles for loading indicators
     * 로딩 인디케이터를 위한 CSS 스타일 설정
     */
    setupStyles() {
        if (document.getElementById('loading-styles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'loading-styles';
        styles.textContent = `
            /* Loading Spinner */
            .loading-spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #3b82f6;
                border-radius: 50%;
                animation: loading-spin 1s linear infinite;
            }

            .loading-spinner.small {
                width: 16px;
                height: 16px;
                border-width: 1.5px;
            }

            .loading-spinner.large {
                width: 32px;
                height: 32px;
                border-width: 3px;
            }

            .loading-spinner.white {
                border-color: rgba(255, 255, 255, 0.3);
                border-top-color: white;
            }

            @keyframes loading-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Loading Dots */
            .loading-dots {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }

            .loading-dots .dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #3b82f6;
                animation: loading-dots 1.4s ease-in-out infinite both;
            }

            .loading-dots .dot:nth-child(1) { animation-delay: -0.32s; }
            .loading-dots .dot:nth-child(2) { animation-delay: -0.16s; }
            .loading-dots .dot:nth-child(3) { animation-delay: 0s; }

            @keyframes loading-dots {
                0%, 80%, 100% {
                    transform: scale(0);
                    opacity: 0.5;
                }
                40% {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            /* Loading Pulse */
            .loading-pulse {
                display: inline-block;
                width: 20px;
                height: 20px;
                background: #3b82f6;
                border-radius: 50%;
                animation: loading-pulse 1.5s ease-in-out infinite;
            }

            @keyframes loading-pulse {
                0% {
                    transform: scale(0);
                    opacity: 1;
                }
                100% {
                    transform: scale(1);
                    opacity: 0;
                }
            }

            /* Loading Skeleton */
            .loading-skeleton {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: loading-skeleton 1.5s infinite;
                border-radius: 4px;
            }

            @keyframes loading-skeleton {
                0% {
                    background-position: 200% 0;
                }
                100% {
                    background-position: -200% 0;
                }
            }

            .loading-skeleton.text {
                height: 1em;
                margin: 0.25em 0;
            }

            .loading-skeleton.title {
                height: 1.5em;
                width: 60%;
                margin: 0.5em 0;
            }

            .loading-skeleton.image {
                height: 200px;
                width: 100%;
            }

            .loading-skeleton.button {
                height: 2.5em;
                width: 100px;
                border-radius: 6px;
            }

            /* Loading Overlay */
            .loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                backdrop-filter: blur(2px);
                transition: opacity 0.3s ease;
            }

            .loading-overlay.dark {
                background: rgba(0, 0, 0, 0.7);
                color: white;
            }

            .loading-overlay-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                max-width: 300px;
                text-align: center;
            }

            .loading-overlay.dark .loading-overlay-content {
                background: #1f2937;
                color: white;
            }

            .loading-overlay-message {
                font-size: 14px;
                color: #6b7280;
                margin: 0;
            }

            .loading-overlay.dark .loading-overlay-message {
                color: #d1d5db;
            }

            /* Progress Bar */
            .progress-bar {
                width: 100%;
                height: 8px;
                background: #e5e7eb;
                border-radius: 4px;
                overflow: hidden;
                position: relative;
            }

            .progress-bar-fill {
                height: 100%;
                background: #3b82f6;
                border-radius: 4px;
                transition: width 0.3s ease;
                position: relative;
            }

            .progress-bar-fill.animated {
                background: linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6);
                background-size: 200% 100%;
                animation: progress-shimmer 2s infinite;
            }

            @keyframes progress-shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            .progress-bar.indeterminate .progress-bar-fill {
                width: 30% !important;
                animation: progress-indeterminate 2s infinite;
            }

            @keyframes progress-indeterminate {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(400%); }
            }

            .progress-text {
                font-size: 12px;
                color: #6b7280;
                margin-top: 4px;
                text-align: center;
            }

            /* Button Loading States */
            .btn.loading {
                position: relative;
                color: transparent !important;
                pointer-events: none;
            }

            .btn.loading::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 16px;
                height: 16px;
                border: 2px solid transparent;
                border-top: 2px solid currentColor;
                border-radius: 50%;
                animation: loading-spin 1s linear infinite;
                color: inherit;
            }

            .btn.loading.btn-primary::after {
                border-top-color: white;
            }

            .btn.loading.btn-secondary::after {
                border-top-color: #374151;
            }

            /* Input Loading States */
            .input-loading {
                position: relative;
            }

            .input-loading::after {
                content: '';
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                border: 2px solid #e5e7eb;
                border-top: 2px solid #3b82f6;
                border-radius: 50%;
                animation: loading-spin 1s linear infinite;
            }

            /* Card Loading States */
            .card.loading {
                pointer-events: none;
                opacity: 0.7;
            }

            .card.loading .card-content {
                position: relative;
            }

            .card.loading .card-content::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1;
            }

            /* Dark theme adjustments */
            @media (prefers-color-scheme: dark) {
                .loading-skeleton {
                    background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
                    background-size: 200% 100%;
                }

                .progress-bar {
                    background: #374151;
                }

                .progress-text {
                    color: #9ca3af;
                }

                .loading-overlay {
                    background: rgba(0, 0, 0, 0.8);
                }

                .loading-overlay-content {
                    background: #1f2937;
                    color: white;
                }

                .loading-overlay-message {
                    color: #d1d5db;
                }
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                .loading-overlay-content {
                    max-width: 90%;
                    padding: 16px;
                }

                .progress-bar {
                    height: 6px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Show loading spinner
     * 로딩 스피너 표시
     * @param {string|HTMLElement} target - Target element or selector
     * @param {Object} options - Loading options
     * @returns {string} Loader ID
     */
    showSpinner(target, options = {}) {
        const {
            size = 'normal', // small, normal, large
            color = 'blue', // blue, white
            replace = false // Replace element content
        } = options;

        const loaderId = this.generateLoaderId();
        const targetElement = this.getElement(target);
        
        if (!targetElement) {
            console.warn('Loading target element not found:', target);
            return null;
        }

        const spinner = document.createElement('div');
        spinner.className = `loading-spinner ${size} ${color}`;
        spinner.id = loaderId;

        if (replace) {
            const originalContent = targetElement.innerHTML;
            targetElement.innerHTML = '';
            targetElement.appendChild(spinner);
            
            this.activeLoaders.set(loaderId, {
                element: targetElement,
                originalContent,
                type: 'spinner',
                replace: true
            });
        } else {
            targetElement.appendChild(spinner);
            
            this.activeLoaders.set(loaderId, {
                element: targetElement,
                spinner,
                type: 'spinner',
                replace: false
            });
        }

        return loaderId;
    }

    /**
     * Show loading dots
     * 로딩 점 표시
     * @param {string|HTMLElement} target - Target element or selector
     * @param {Object} options - Loading options
     * @returns {string} Loader ID
     */
    showDots(target, options = {}) {
        const { replace = false } = options;
        const loaderId = this.generateLoaderId();
        const targetElement = this.getElement(target);
        
        if (!targetElement) {
            console.warn('Loading target element not found:', target);
            return null;
        }

        const dots = document.createElement('div');
        dots.className = 'loading-dots';
        dots.id = loaderId;
        dots.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

        if (replace) {
            const originalContent = targetElement.innerHTML;
            targetElement.innerHTML = '';
            targetElement.appendChild(dots);
            
            this.activeLoaders.set(loaderId, {
                element: targetElement,
                originalContent,
                type: 'dots',
                replace: true
            });
        } else {
            targetElement.appendChild(dots);
            
            this.activeLoaders.set(loaderId, {
                element: targetElement,
                dots,
                type: 'dots',
                replace: false
            });
        }

        return loaderId;
    }

    /**
     * Show loading overlay
     * 로딩 오버레이 표시
     * @param {string|HTMLElement} target - Target element or selector
     * @param {Object} options - Loading options
     * @returns {string} Loader ID
     */
    showOverlay(target, options = {}) {
        const {
            message = 'Loading...',
            spinner = true,
            dark = false
        } = options;

        const loaderId = this.generateLoaderId();
        const targetElement = this.getElement(target);
        
        if (!targetElement) {
            console.warn('Loading target element not found:', target);
            return null;
        }

        // Ensure target has relative positioning
        const originalPosition = targetElement.style.position;
        if (!originalPosition || originalPosition === 'static') {
            targetElement.style.position = 'relative';
        }

        const overlay = document.createElement('div');
        overlay.className = `loading-overlay ${dark ? 'dark' : ''}`;
        overlay.id = loaderId;

        const content = document.createElement('div');
        content.className = 'loading-overlay-content';

        if (spinner) {
            const spinnerEl = document.createElement('div');
            spinnerEl.className = `loading-spinner ${dark ? 'white' : ''}`;
            content.appendChild(spinnerEl);
        }

        if (message) {
            const messageEl = document.createElement('p');
            messageEl.className = 'loading-overlay-message';
            messageEl.textContent = message;
            content.appendChild(messageEl);
        }

        overlay.appendChild(content);
        targetElement.appendChild(overlay);

        this.loadingOverlays.set(loaderId, {
            element: targetElement,
            overlay,
            originalPosition
        });

        return loaderId;
    }

    /**
     * Show skeleton loading
     * 스켈레톤 로딩 표시
     * @param {string|HTMLElement} target - Target element or selector
     * @param {Object} options - Loading options
     * @returns {string} Loader ID
     */
    showSkeleton(target, options = {}) {
        const {
            type = 'text', // text, title, image, button
            lines = 3,
            replace = true
        } = options;

        const loaderId = this.generateLoaderId();
        const targetElement = this.getElement(target);
        
        if (!targetElement) {
            console.warn('Loading target element not found:', target);
            return null;
        }

        const skeleton = document.createElement('div');
        skeleton.id = loaderId;

        if (type === 'text') {
            for (let i = 0; i < lines; i++) {
                const line = document.createElement('div');
                line.className = 'loading-skeleton text';
                if (i === lines - 1) {
                    line.style.width = '60%'; // Last line shorter
                }
                skeleton.appendChild(line);
            }
        } else {
            const skeletonEl = document.createElement('div');
            skeletonEl.className = `loading-skeleton ${type}`;
            skeleton.appendChild(skeletonEl);
        }

        if (replace) {
            const originalContent = targetElement.innerHTML;
            targetElement.innerHTML = '';
            targetElement.appendChild(skeleton);
            
            this.activeLoaders.set(loaderId, {
                element: targetElement,
                originalContent,
                type: 'skeleton',
                replace: true
            });
        } else {
            targetElement.appendChild(skeleton);
            
            this.activeLoaders.set(loaderId, {
                element: targetElement,
                skeleton,
                type: 'skeleton',
                replace: false
            });
        }

        return loaderId;
    }

    /**
     * Show progress bar
     * 진행 표시줄 표시
     * @param {string|HTMLElement} target - Target element or selector
     * @param {Object} options - Progress options
     * @returns {string} Progress ID
     */
    showProgress(target, options = {}) {
        const {
            value = 0,
            max = 100,
            indeterminate = false,
            animated = false,
            showText = true,
            text = null
        } = options;

        const progressId = this.generateLoaderId();
        const targetElement = this.getElement(target);
        
        if (!targetElement) {
            console.warn('Progress target element not found:', target);
            return null;
        }

        const progressContainer = document.createElement('div');
        progressContainer.id = progressId;

        const progressBar = document.createElement('div');
        progressBar.className = `progress-bar ${indeterminate ? 'indeterminate' : ''}`;

        const progressFill = document.createElement('div');
        progressFill.className = `progress-bar-fill ${animated ? 'animated' : ''}`;
        
        if (!indeterminate) {
            const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
            progressFill.style.width = `${percentage}%`;
        }

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);

        if (showText) {
            const progressText = document.createElement('div');
            progressText.className = 'progress-text';
            
            if (text) {
                progressText.textContent = text;
            } else if (!indeterminate) {
                const percentage = Math.round((value / max) * 100);
                progressText.textContent = `${percentage}%`;
            } else {
                progressText.textContent = 'Loading...';
            }
            
            progressContainer.appendChild(progressText);
        }

        targetElement.appendChild(progressContainer);

        this.progressBars.set(progressId, {
            element: targetElement,
            container: progressContainer,
            bar: progressBar,
            fill: progressFill,
            text: progressContainer.querySelector('.progress-text'),
            value,
            max,
            indeterminate
        });

        return progressId;
    }

    /**
     * Update progress bar
     * 진행 표시줄 업데이트
     * @param {string} progressId - Progress ID
     * @param {Object} options - Update options
     */
    updateProgress(progressId, options = {}) {
        const progressData = this.progressBars.get(progressId);
        if (!progressData) return;

        const {
            value = progressData.value,
            max = progressData.max,
            text = null
        } = options;

        if (!progressData.indeterminate) {
            const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
            progressData.fill.style.width = `${percentage}%`;
            
            if (progressData.text && !text) {
                progressData.text.textContent = `${Math.round(percentage)}%`;
            }
        }

        if (text && progressData.text) {
            progressData.text.textContent = text;
        }

        progressData.value = value;
        progressData.max = max;
    }

    /**
     * Set button loading state
     * 버튼 로딩 상태 설정
     * @param {string|HTMLElement} button - Button element or selector
     * @param {boolean} loading - Loading state
     * @returns {string|null} Loader ID or null
     */
    setButtonLoading(button, loading = true) {
        const buttonElement = this.getElement(button);
        if (!buttonElement) {
            console.warn('Button element not found:', button);
            return null;
        }

        if (loading) {
            const loaderId = this.generateLoaderId();
            const originalText = buttonElement.textContent;
            const originalDisabled = buttonElement.disabled;
            
            buttonElement.classList.add('loading');
            buttonElement.disabled = true;
            
            this.activeLoaders.set(loaderId, {
                element: buttonElement,
                originalText,
                originalDisabled,
                type: 'button'
            });
            
            return loaderId;
        } else {
            // Find and remove loading state
            for (const [loaderId, loaderData] of this.activeLoaders.entries()) {
                if (loaderData.element === buttonElement && loaderData.type === 'button') {
                    this.hide(loaderId);
                    break;
                }
            }
            return null;
        }
    }

    /**
     * Set input loading state
     * 입력 필드 로딩 상태 설정
     * @param {string|HTMLElement} input - Input element or selector
     * @param {boolean} loading - Loading state
     * @returns {string|null} Loader ID or null
     */
    setInputLoading(input, loading = true) {
        const inputElement = this.getElement(input);
        if (!inputElement) {
            console.warn('Input element not found:', input);
            return null;
        }

        if (loading) {
            const loaderId = this.generateLoaderId();
            inputElement.classList.add('input-loading');
            
            this.activeLoaders.set(loaderId, {
                element: inputElement,
                type: 'input'
            });
            
            return loaderId;
        } else {
            // Find and remove loading state
            for (const [loaderId, loaderData] of this.activeLoaders.entries()) {
                if (loaderData.element === inputElement && loaderData.type === 'input') {
                    this.hide(loaderId);
                    break;
                }
            }
            return null;
        }
    }

    /**
     * Hide loading indicator
     * 로딩 인디케이터 숨기기
     * @param {string} loaderId - Loader ID
     */
    hide(loaderId) {
        // Check regular loaders
        const loaderData = this.activeLoaders.get(loaderId);
        if (loaderData) {
            this.hideLoader(loaderId, loaderData);
            return;
        }

        // Check overlays
        const overlayData = this.loadingOverlays.get(loaderId);
        if (overlayData) {
            this.hideOverlay(loaderId, overlayData);
            return;
        }

        // Check progress bars
        const progressData = this.progressBars.get(loaderId);
        if (progressData) {
            this.hideProgress(loaderId, progressData);
            return;
        }
    }

    /**
     * Hide regular loader
     * 일반 로더 숨기기
     * @param {string} loaderId - Loader ID
     * @param {Object} loaderData - Loader data
     */
    hideLoader(loaderId, loaderData) {
        const { element, type, replace, originalContent, originalText, originalDisabled } = loaderData;

        switch (type) {
            case 'spinner':
            case 'dots':
            case 'skeleton':
                if (replace && originalContent !== undefined) {
                    element.innerHTML = originalContent;
                } else {
                    const loaderElement = document.getElementById(loaderId);
                    if (loaderElement && loaderElement.parentNode) {
                        loaderElement.parentNode.removeChild(loaderElement);
                    }
                }
                break;

            case 'button':
                element.classList.remove('loading');
                element.disabled = originalDisabled;
                if (originalText) {
                    element.textContent = originalText;
                }
                break;

            case 'input':
                element.classList.remove('input-loading');
                break;
        }

        this.activeLoaders.delete(loaderId);
    }

    /**
     * Hide overlay
     * 오버레이 숨기기
     * @param {string} loaderId - Loader ID
     * @param {Object} overlayData - Overlay data
     */
    hideOverlay(loaderId, overlayData) {
        const { element, overlay, originalPosition } = overlayData;

        if (overlay && overlay.parentNode) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }

        // Restore original position if it was changed
        if (originalPosition) {
            element.style.position = originalPosition;
        } else {
            element.style.position = '';
        }

        this.loadingOverlays.delete(loaderId);
    }

    /**
     * Hide progress bar
     * 진행 표시줄 숨기기
     * @param {string} progressId - Progress ID
     * @param {Object} progressData - Progress data
     */
    hideProgress(progressId, progressData) {
        const { container } = progressData;

        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }

        this.progressBars.delete(progressId);
    }

    /**
     * Hide all loading indicators
     * 모든 로딩 인디케이터 숨기기
     */
    hideAll() {
        // Hide regular loaders
        const loaderIds = Array.from(this.activeLoaders.keys());
        loaderIds.forEach(loaderId => this.hide(loaderId));

        // Hide overlays
        const overlayIds = Array.from(this.loadingOverlays.keys());
        overlayIds.forEach(loaderId => this.hide(loaderId));

        // Hide progress bars
        const progressIds = Array.from(this.progressBars.keys());
        progressIds.forEach(loaderId => this.hide(loaderId));
    }

    /**
     * Get element from selector or element
     * 선택자 또는 요소에서 요소 가져오기
     * @param {string|HTMLElement} target - Target selector or element
     * @returns {HTMLElement|null} Element or null
     */
    getElement(target) {
        if (typeof target === 'string') {
            return document.querySelector(target);
        } else if (target instanceof HTMLElement) {
            return target;
        }
        return null;
    }

    /**
     * Generate unique loader ID
     * 고유 로더 ID 생성
     * @returns {string} Unique loader ID
     */
    generateLoaderId() {
        return `loader_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get active loader count
     * 활성 로더 수 가져오기
     * @returns {number} Number of active loaders
     */
    getActiveCount() {
        return this.activeLoaders.size + this.loadingOverlays.size + this.progressBars.size;
    }

    /**
     * Check if loader exists
     * 로더 존재 여부 확인
     * @param {string} loaderId - Loader ID
     * @returns {boolean} Whether loader exists
     */
    exists(loaderId) {
        return this.activeLoaders.has(loaderId) || 
               this.loadingOverlays.has(loaderId) || 
               this.progressBars.has(loaderId);
    }
}

// Create global instance
const loadingManager = new LoadingManager();

// Global convenience functions
function showSpinner(target, options) {
    return loadingManager.showSpinner(target, options);
}

function showDots(target, options) {
    return loadingManager.showDots(target, options);
}

function showOverlay(target, options) {
    return loadingManager.showOverlay(target, options);
}

function showSkeleton(target, options) {
    return loadingManager.showSkeleton(target, options);
}

function showProgress(target, options) {
    return loadingManager.showProgress(target, options);
}

function updateProgress(progressId, options) {
    return loadingManager.updateProgress(progressId, options);
}

function setButtonLoading(button, loading) {
    return loadingManager.setButtonLoading(button, loading);
}

function setInputLoading(input, loading) {
    return loadingManager.setInputLoading(input, loading);
}

function hideLoading(loaderId) {
    return loadingManager.hide(loaderId);
}

function hideAllLoading() {
    return loadingManager.hideAll();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        LoadingManager, 
        loadingManager,
        showSpinner,
        showDots,
        showOverlay,
        showSkeleton,
        showProgress,
        updateProgress,
        setButtonLoading,
        setInputLoading,
        hideLoading,
        hideAllLoading
    };
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.loadingManager = loadingManager;
    window.showSpinner = showSpinner;
    window.showDots = showDots;
    window.showOverlay = showOverlay;
    window.showSkeleton = showSkeleton;
    window.showProgress = showProgress;
    window.updateProgress = updateProgress;
    window.setButtonLoading = setButtonLoading;
    window.setInputLoading = setInputLoading;
    window.hideLoading = hideLoading;
    window.hideAllLoading = hideAllLoading;
}