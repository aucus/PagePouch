// Toast notification system for LaterLens Chrome extension
// 토스트 알림 시스템 - 사용자 친화적 알림 표시

class ToastManager {
    constructor() {
        this.toastContainer = null;
        this.activeToasts = new Map();
        this.maxToasts = 5;
        this.defaultDuration = 5000; // 5 seconds
        this.init();
    }

    init() {
        this.createToastContainer();
        this.setupStyles();
    }

    /**
     * Create toast container element
     * 토스트 컨테이너 요소 생성
     */
    createToastContainer() {
        // Check if container already exists
        this.toastContainer = document.getElementById('toast-container');
        
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toast-container';
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }
    }

    /**
     * Setup CSS styles for toast notifications
     * 토스트 알림을 위한 CSS 스타일 설정
     */
    setupStyles() {
        // Check if styles already exist
        if (document.getElementById('toast-styles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
            }

            .toast {
                background: #333;
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                gap: 8px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                pointer-events: auto;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                max-width: 100%;
                word-wrap: break-word;
            }

            .toast.show {
                transform: translateX(0);
                opacity: 1;
            }

            .toast.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .toast-icon {
                flex-shrink: 0;
                font-size: 16px;
                width: 20px;
                text-align: center;
            }

            .toast-message {
                flex: 1;
                margin-right: 8px;
            }

            .toast-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 0;
                font-size: 16px;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                opacity: 0.7;
                transition: opacity 0.2s;
                flex-shrink: 0;
            }

            .toast-close:hover {
                opacity: 1;
                background: rgba(255, 255, 255, 0.1);
            }

            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 0 0 8px 8px;
                transition: width linear;
            }

            /* Toast types */
            .toast.success {
                background: #10b981;
                border-left: 4px solid #059669;
            }

            .toast.error {
                background: #ef4444;
                border-left: 4px solid #dc2626;
            }

            .toast.warning {
                background: #f59e0b;
                border-left: 4px solid #d97706;
            }

            .toast.info {
                background: #3b82f6;
                border-left: 4px solid #2563eb;
            }

            /* Dark theme adjustments */
            @media (prefers-color-scheme: dark) {
                .toast {
                    background: #1f2937;
                    color: #f9fafb;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                }
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                .toast-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }

                .toast {
                    font-size: 13px;
                    padding: 10px 12px;
                }
            }

            /* Animation keyframes */
            @keyframes toast-slide-in {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes toast-slide-out {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Show toast notification
     * 토스트 알림 표시
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {Object} options - Additional options
     * @returns {string} Toast ID
     */
    show(message, type = 'info', options = {}) {
        const toastId = this.generateToastId();
        const duration = options.duration || this.defaultDuration;
        const showProgress = options.showProgress !== false;
        const closable = options.closable !== false;

        // Remove oldest toast if we have too many
        if (this.activeToasts.size >= this.maxToasts) {
            const oldestToastId = this.activeToasts.keys().next().value;
            this.hide(oldestToastId);
        }

        const toastElement = this.createToastElement(toastId, message, type, {
            showProgress,
            closable,
            duration
        });

        this.toastContainer.appendChild(toastElement);
        this.activeToasts.set(toastId, {
            element: toastElement,
            type,
            message,
            timestamp: Date.now()
        });

        // Trigger show animation
        requestAnimationFrame(() => {
            toastElement.classList.add('show');
        });

        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toastId);
            }, duration);
        }

        return toastId;
    }

    /**
     * Create toast element
     * 토스트 요소 생성
     * @param {string} toastId - Toast ID
     * @param {string} message - Toast message
     * @param {string} type - Toast type
     * @param {Object} options - Toast options
     * @returns {HTMLElement} Toast element
     */
    createToastElement(toastId, message, type, options) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        const icon = this.getTypeIcon(type);
        
        let html = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        if (options.closable) {
            html += `<button class="toast-close" title="Close" aria-label="Close notification">×</button>`;
        }

        if (options.showProgress && options.duration > 0) {
            html += `<div class="toast-progress"></div>`;
        }

        toast.innerHTML = html;

        // Add event listeners
        if (options.closable) {
            const closeButton = toast.querySelector('.toast-close');
            closeButton.addEventListener('click', () => {
                this.hide(toastId);
            });
        }

        // Add progress bar animation
        if (options.showProgress && options.duration > 0) {
            const progressBar = toast.querySelector('.toast-progress');
            if (progressBar) {
                requestAnimationFrame(() => {
                    progressBar.style.width = '100%';
                    progressBar.style.transitionDuration = `${options.duration}ms`;
                    
                    requestAnimationFrame(() => {
                        progressBar.style.width = '0%';
                    });
                });
            }
        }

        return toast;
    }

    /**
     * Get icon for toast type
     * 토스트 유형에 따른 아이콘 가져오기
     * @param {string} type - Toast type
     * @returns {string} Icon character
     */
    getTypeIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        return icons[type] || icons.info;
    }

    /**
     * Hide toast notification
     * 토스트 알림 숨기기
     * @param {string} toastId - Toast ID
     */
    hide(toastId) {
        const toastData = this.activeToasts.get(toastId);
        if (!toastData) return;

        const { element } = toastData;
        
        element.classList.remove('show');
        element.classList.add('hide');

        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.activeToasts.delete(toastId);
        }, 300);
    }

    /**
     * Hide all toast notifications
     * 모든 토스트 알림 숨기기
     */
    hideAll() {
        const toastIds = Array.from(this.activeToasts.keys());
        toastIds.forEach(toastId => this.hide(toastId));
    }

    /**
     * Generate unique toast ID
     * 고유 토스트 ID 생성
     * @returns {string} Unique toast ID
     */
    generateToastId() {
        return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Escape HTML characters in message
     * 메시지의 HTML 문자 이스케이프
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show success toast
     * 성공 토스트 표시
     * @param {string} message - Success message
     * @param {Object} options - Additional options
     * @returns {string} Toast ID
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Show error toast
     * 오류 토스트 표시
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     * @returns {string} Toast ID
     */
    error(message, options = {}) {
        return this.show(message, 'error', {
            duration: 7000, // Longer duration for errors
            ...options
        });
    }

    /**
     * Show warning toast
     * 경고 토스트 표시
     * @param {string} message - Warning message
     * @param {Object} options - Additional options
     * @returns {string} Toast ID
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', {
            duration: 6000, // Slightly longer for warnings
            ...options
        });
    }

    /**
     * Show info toast
     * 정보 토스트 표시
     * @param {string} message - Info message
     * @param {Object} options - Additional options
     * @returns {string} Toast ID
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Show loading toast
     * 로딩 토스트 표시
     * @param {string} message - Loading message
     * @param {Object} options - Additional options
     * @returns {string} Toast ID
     */
    loading(message, options = {}) {
        return this.show(message, 'info', {
            duration: 0, // Don't auto-hide loading toasts
            showProgress: false,
            ...options
        });
    }

    /**
     * Update existing toast message
     * 기존 토스트 메시지 업데이트
     * @param {string} toastId - Toast ID
     * @param {string} newMessage - New message
     * @param {string} newType - New type (optional)
     */
    update(toastId, newMessage, newType) {
        const toastData = this.activeToasts.get(toastId);
        if (!toastData) return;

        const { element } = toastData;
        const messageElement = element.querySelector('.toast-message');
        const iconElement = element.querySelector('.toast-icon');

        if (messageElement) {
            messageElement.textContent = newMessage;
        }

        if (newType && newType !== toastData.type) {
            element.className = element.className.replace(toastData.type, newType);
            if (iconElement) {
                iconElement.textContent = this.getTypeIcon(newType);
            }
            toastData.type = newType;
        }

        toastData.message = newMessage;
    }

    /**
     * Get active toast count
     * 활성 토스트 수 가져오기
     * @returns {number} Number of active toasts
     */
    getActiveCount() {
        return this.activeToasts.size;
    }

    /**
     * Check if toast exists
     * 토스트 존재 여부 확인
     * @param {string} toastId - Toast ID
     * @returns {boolean} Whether toast exists
     */
    exists(toastId) {
        return this.activeToasts.has(toastId);
    }
}

// Create global instance
const toastManager = new ToastManager();

// Global convenience functions
function showToast(message, type = 'info', options = {}) {
    return toastManager.show(message, type, options);
}

function hideToast(toastId) {
    return toastManager.hide(toastId);
}

function hideAllToasts() {
    return toastManager.hideAll();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ToastManager, 
        toastManager, 
        showToast, 
        hideToast, 
        hideAllToasts 
    };
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.showToast = showToast;
    window.hideToast = hideToast;
    window.hideAllToasts = hideAllToasts;
    window.toastManager = toastManager;
}