// Error handling utility for LaterLens Chrome extension
// 오류 처리 유틸리티 - 분류된 오류 처리 및 사용자 친화적 메시지

class ErrorHandler {
    constructor() {
        this.errorCategories = {
            NETWORK: 'network',
            STORAGE: 'storage',
            API: 'api',
            VALIDATION: 'validation',
            PERMISSION: 'permission',
            PARSING: 'parsing',
            SCREENSHOT: 'screenshot',
            CONTENT_EXTRACTION: 'content_extraction',
            AI_SUMMARY: 'ai_summary',
            UNKNOWN: 'unknown'
        };

        this.errorSeverity = {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        };

        this.init();
    }

    init() {
        // Set up global error handlers
        this.setupGlobalErrorHandlers();
    }

    /**
     * Set up global error handlers for unhandled errors
     * 처리되지 않은 오류에 대한 전역 오류 핸들러 설정
     */
    setupGlobalErrorHandlers() {
        // Handle unhandled promise rejections
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                console.error('Unhandled promise rejection:', event.reason);
                this.handleError(event.reason, this.errorCategories.UNKNOWN, this.errorSeverity.HIGH);
                event.preventDefault();
            });

            // Handle general JavaScript errors
            window.addEventListener('error', (event) => {
                console.error('Unhandled error:', event.error);
                this.handleError(event.error, this.errorCategories.UNKNOWN, this.errorSeverity.HIGH);
            });
        }
    }

    /**
     * Main error handling method
     * 주요 오류 처리 메서드
     * @param {Error|string} error - Error object or error message
     * @param {string} category - Error category
     * @param {string} severity - Error severity level
     * @param {Object} context - Additional context information
     * @returns {Object} Processed error information
     */
    handleError(error, category = this.errorCategories.UNKNOWN, severity = this.errorSeverity.MEDIUM, context = {}) {
        const processedError = this.processError(error, category, severity, context);
        
        // Log error for debugging
        this.logError(processedError);
        
        // Get user-friendly message
        const userMessage = this.getUserMessage(processedError);
        
        // Show user notification if appropriate
        if (this.shouldShowUserNotification(processedError)) {
            this.showUserNotification(userMessage, processedError.severity);
        }
        
        // Report error for analytics (if enabled)
        this.reportError(processedError);
        
        return {
            ...processedError,
            userMessage
        };
    }

    /**
     * Process raw error into structured format
     * 원시 오류를 구조화된 형식으로 처리
     * @param {Error|string} error - Raw error
     * @param {string} category - Error category
     * @param {string} severity - Error severity
     * @param {Object} context - Additional context
     * @returns {Object} Processed error object
     */
    processError(error, category, severity, context) {
        const timestamp = new Date().toISOString();
        const errorId = this.generateErrorId();
        
        let message, stack, name;
        
        if (error instanceof Error) {
            message = error.message;
            stack = error.stack;
            name = error.name;
        } else if (typeof error === 'string') {
            message = error;
            stack = null;
            name = 'StringError';
        } else {
            message = 'Unknown error occurred';
            stack = null;
            name = 'UnknownError';
        }

        return {
            id: errorId,
            timestamp,
            category,
            severity,
            name,
            message,
            stack,
            context,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
            url: typeof window !== 'undefined' ? window.location?.href : 'Unknown'
        };
    }

    /**
     * Generate unique error ID
     * 고유 오류 ID 생성
     * @returns {string} Unique error ID
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Log error for debugging purposes
     * 디버깅 목적으로 오류 로그
     * @param {Object} processedError - Processed error object
     */
    logError(processedError) {
        const logLevel = this.getLogLevel(processedError.severity);
        const logMessage = `[${processedError.category.toUpperCase()}] ${processedError.message}`;
        
        if (console[logLevel]) {
            console[logLevel](logMessage, {
                id: processedError.id,
                timestamp: processedError.timestamp,
                context: processedError.context,
                stack: processedError.stack
            });
        } else {
            console.error(logMessage, processedError);
        }
    }

    /**
     * Get appropriate console log level for error severity
     * 오류 심각도에 따른 적절한 콘솔 로그 레벨 가져오기
     * @param {string} severity - Error severity
     * @returns {string} Console log level
     */
    getLogLevel(severity) {
        switch (severity) {
            case this.errorSeverity.LOW:
                return 'info';
            case this.errorSeverity.MEDIUM:
                return 'warn';
            case this.errorSeverity.HIGH:
            case this.errorSeverity.CRITICAL:
                return 'error';
            default:
                return 'log';
        }
    }

    /**
     * Get user-friendly error message
     * 사용자 친화적 오류 메시지 가져오기
     * @param {Object} processedError - Processed error object
     * @returns {string} User-friendly message
     */
    getUserMessage(processedError) {
        const { category, severity, message, context } = processedError;
        
        // Get localized error messages if i18n is available
        if (typeof getLocalizedErrorMessage === 'function') {
            return getLocalizedErrorMessage(category, { message, ...context });
        }
        
        // Fallback to built-in messages
        return this.getBuiltInErrorMessage(category, severity, message, context);
    }

    /**
     * Get built-in error messages (fallback)
     * 내장 오류 메시지 가져오기 (폴백)
     * @param {string} category - Error category
     * @param {string} severity - Error severity
     * @param {string} originalMessage - Original error message
     * @param {Object} context - Error context
     * @returns {string} Built-in error message
     */
    getBuiltInErrorMessage(category, severity, originalMessage, context) {
        const isKorean = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'ko';
        
        const messages = {
            [this.errorCategories.NETWORK]: {
                en: 'Network connection failed. Please check your internet connection and try again.',
                ko: '네트워크 연결에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.'
            },
            [this.errorCategories.STORAGE]: {
                en: 'Failed to save data. Your storage might be full or corrupted.',
                ko: '데이터 저장에 실패했습니다. 저장소가 가득 찼거나 손상되었을 수 있습니다.'
            },
            [this.errorCategories.API]: {
                en: 'API request failed. Please check your API key and try again.',
                ko: 'API 요청에 실패했습니다. API 키를 확인하고 다시 시도해주세요.'
            },
            [this.errorCategories.VALIDATION]: {
                en: 'Invalid input provided. Please check your data and try again.',
                ko: '잘못된 입력입니다. 데이터를 확인하고 다시 시도해주세요.'
            },
            [this.errorCategories.PERMISSION]: {
                en: 'Permission denied. Please grant the required permissions.',
                ko: '권한이 거부되었습니다. 필요한 권한을 허용해주세요.'
            },
            [this.errorCategories.PARSING]: {
                en: 'Failed to process page content. The page format might not be supported.',
                ko: '페이지 콘텐츠 처리에 실패했습니다. 페이지 형식이 지원되지 않을 수 있습니다.'
            },
            [this.errorCategories.SCREENSHOT]: {
                en: 'Failed to capture page screenshot. Please try again.',
                ko: '페이지 스크린샷 캡처에 실패했습니다. 다시 시도해주세요.'
            },
            [this.errorCategories.CONTENT_EXTRACTION]: {
                en: 'Failed to extract page content. The page might be protected or empty.',
                ko: '페이지 콘텐츠 추출에 실패했습니다. 페이지가 보호되었거나 비어있을 수 있습니다.'
            },
            [this.errorCategories.AI_SUMMARY]: {
                en: 'Failed to generate AI summary. Please check your API configuration.',
                ko: 'AI 요약 생성에 실패했습니다. API 설정을 확인해주세요.'
            },
            [this.errorCategories.UNKNOWN]: {
                en: 'An unexpected error occurred. Please try again.',
                ko: '예상치 못한 오류가 발생했습니다. 다시 시도해주세요.'
            }
        };

        const categoryMessages = messages[category] || messages[this.errorCategories.UNKNOWN];
        return isKorean ? categoryMessages.ko : categoryMessages.en;
    }

    /**
     * Determine if user notification should be shown
     * 사용자 알림을 표시할지 결정
     * @param {Object} processedError - Processed error object
     * @returns {boolean} Whether to show notification
     */
    shouldShowUserNotification(processedError) {
        // Don't show notifications for low severity errors
        if (processedError.severity === this.errorSeverity.LOW) {
            return false;
        }
        
        // Don't show notifications for certain categories that are handled elsewhere
        const silentCategories = [this.errorCategories.VALIDATION];
        if (silentCategories.includes(processedError.category)) {
            return false;
        }
        
        return true;
    }

    /**
     * Show user notification
     * 사용자 알림 표시
     * @param {string} message - User message
     * @param {string} severity - Error severity
     */
    showUserNotification(message, severity) {
        // Try to use existing toast notification system
        if (typeof showToast === 'function') {
            const toastType = this.getToastType(severity);
            showToast(message, toastType);
            return;
        }
        
        // Fallback to browser notification or alert
        if (typeof chrome !== 'undefined' && chrome.notifications) {
            this.showChromeNotification(message, severity);
        } else if (typeof alert === 'function' && severity === this.errorSeverity.CRITICAL) {
            alert(message);
        }
    }

    /**
     * Get toast notification type based on severity
     * 심각도에 따른 토스트 알림 유형 가져오기
     * @param {string} severity - Error severity
     * @returns {string} Toast type
     */
    getToastType(severity) {
        switch (severity) {
            case this.errorSeverity.LOW:
                return 'info';
            case this.errorSeverity.MEDIUM:
                return 'warning';
            case this.errorSeverity.HIGH:
            case this.errorSeverity.CRITICAL:
                return 'error';
            default:
                return 'error';
        }
    }

    /**
     * Show Chrome extension notification
     * Chrome 확장 프로그램 알림 표시
     * @param {string} message - Notification message
     * @param {string} severity - Error severity
     */
    showChromeNotification(message, severity) {
        const notificationOptions = {
            type: 'basic',
            iconUrl: 'assets/icon48.png',
            title: 'LaterLens Error',
            message: message,
            priority: severity === this.errorSeverity.CRITICAL ? 2 : 1
        };

        chrome.notifications.create(notificationOptions, (notificationId) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to create notification:', chrome.runtime.lastError);
            }
        });
    }

    /**
     * Report error for analytics (if enabled)
     * 분석을 위한 오류 보고 (활성화된 경우)
     * @param {Object} processedError - Processed error object
     */
    reportError(processedError) {
        // Only report if analytics is enabled and user hasn't opted out
        if (this.shouldReportError()) {
            // Anonymize sensitive information
            const anonymizedError = this.anonymizeError(processedError);
            
            // Send to analytics service (implementation depends on chosen service)
            this.sendToAnalytics(anonymizedError);
        }
    }

    /**
     * Check if error should be reported to analytics
     * 오류를 분석 서비스에 보고할지 확인
     * @returns {boolean} Whether to report error
     */
    shouldReportError() {
        // Check user preferences (if settings are available)
        if (typeof chrome !== 'undefined' && chrome.storage) {
            // This would be async in real implementation
            return false; // Default to not reporting for privacy
        }
        
        return false; // Default to not reporting
    }

    /**
     * Anonymize error data for reporting
     * 보고를 위한 오류 데이터 익명화
     * @param {Object} processedError - Processed error object
     * @returns {Object} Anonymized error object
     */
    anonymizeError(processedError) {
        return {
            id: processedError.id,
            timestamp: processedError.timestamp,
            category: processedError.category,
            severity: processedError.severity,
            name: processedError.name,
            // Remove potentially sensitive information
            message: this.sanitizeMessage(processedError.message),
            // Remove stack trace for privacy
            stack: null,
            // Remove sensitive context
            context: this.sanitizeContext(processedError.context),
            // Keep general browser info
            userAgent: this.sanitizeUserAgent(processedError.userAgent),
            // Remove specific URL
            url: null
        };
    }

    /**
     * Sanitize error message for reporting
     * 보고를 위한 오류 메시지 정리
     * @param {string} message - Original message
     * @returns {string} Sanitized message
     */
    sanitizeMessage(message) {
        // Remove URLs, file paths, and other potentially sensitive info
        return message
            .replace(/https?:\/\/[^\s]+/g, '[URL]')
            .replace(/[a-zA-Z]:\\[^\s]+/g, '[PATH]')
            .replace(/\/[^\s]+/g, '[PATH]')
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    }

    /**
     * Sanitize context data for reporting
     * 보고를 위한 컨텍스트 데이터 정리
     * @param {Object} context - Original context
     * @returns {Object} Sanitized context
     */
    sanitizeContext(context) {
        const sanitized = {};
        
        // Only include non-sensitive context keys
        const allowedKeys = ['action', 'component', 'feature', 'step'];
        
        for (const key of allowedKeys) {
            if (context[key]) {
                sanitized[key] = context[key];
            }
        }
        
        return sanitized;
    }

    /**
     * Sanitize user agent for reporting
     * 보고를 위한 사용자 에이전트 정리
     * @param {string} userAgent - Original user agent
     * @returns {string} Sanitized user agent
     */
    sanitizeUserAgent(userAgent) {
        // Keep only browser and OS info, remove specific versions
        if (!userAgent || userAgent === 'Unknown') return 'Unknown';
        
        const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/);
        const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/);
        
        const browser = browserMatch ? browserMatch[0] : 'Unknown Browser';
        const os = osMatch ? osMatch[0] : 'Unknown OS';
        
        return `${browser} on ${os}`;
    }

    /**
     * Send error data to analytics service
     * 분석 서비스로 오류 데이터 전송
     * @param {Object} anonymizedError - Anonymized error object
     */
    sendToAnalytics(anonymizedError) {
        // This would integrate with your chosen analytics service
        // For now, just log that it would be sent
        console.log('Would send to analytics:', anonymizedError);
    }

    /**
     * Create specific error handlers for common scenarios
     * 일반적인 시나리오를 위한 특정 오류 핸들러 생성
     */
    
    /**
     * Handle network errors
     * 네트워크 오류 처리
     * @param {Error} error - Network error
     * @param {Object} context - Additional context
     * @returns {Object} Processed error
     */
    handleNetworkError(error, context = {}) {
        return this.handleError(error, this.errorCategories.NETWORK, this.errorSeverity.MEDIUM, {
            ...context,
            component: 'network'
        });
    }

    /**
     * Handle storage errors
     * 저장소 오류 처리
     * @param {Error} error - Storage error
     * @param {Object} context - Additional context
     * @returns {Object} Processed error
     */
    handleStorageError(error, context = {}) {
        return this.handleError(error, this.errorCategories.STORAGE, this.errorSeverity.HIGH, {
            ...context,
            component: 'storage'
        });
    }

    /**
     * Handle API errors
     * API 오류 처리
     * @param {Error} error - API error
     * @param {Object} context - Additional context
     * @returns {Object} Processed error
     */
    handleAPIError(error, context = {}) {
        return this.handleError(error, this.errorCategories.API, this.errorSeverity.MEDIUM, {
            ...context,
            component: 'api'
        });
    }

    /**
     * Handle validation errors
     * 검증 오류 처리
     * @param {Error|string} error - Validation error
     * @param {Object} context - Additional context
     * @returns {Object} Processed error
     */
    handleValidationError(error, context = {}) {
        return this.handleError(error, this.errorCategories.VALIDATION, this.errorSeverity.LOW, {
            ...context,
            component: 'validation'
        });
    }

    /**
     * Handle permission errors
     * 권한 오류 처리
     * @param {Error} error - Permission error
     * @param {Object} context - Additional context
     * @returns {Object} Processed error
     */
    handlePermissionError(error, context = {}) {
        return this.handleError(error, this.errorCategories.PERMISSION, this.errorSeverity.HIGH, {
            ...context,
            component: 'permissions'
        });
    }

    /**
     * Handle screenshot errors
     * 스크린샷 오류 처리
     * @param {Error} error - Screenshot error
     * @param {Object} context - Additional context
     * @returns {Object} Processed error
     */
    handleScreenshotError(error, context = {}) {
        return this.handleError(error, this.errorCategories.SCREENSHOT, this.errorSeverity.MEDIUM, {
            ...context,
            component: 'screenshot'
        });
    }

    /**
     * Handle content extraction errors
     * 콘텐츠 추출 오류 처리
     * @param {Error} error - Content extraction error
     * @param {Object} context - Additional context
     * @returns {Object} Processed error
     */
    handleContentExtractionError(error, context = {}) {
        return this.handleError(error, this.errorCategories.CONTENT_EXTRACTION, this.errorSeverity.MEDIUM, {
            ...context,
            component: 'content-extraction'
        });
    }

    /**
     * Handle AI summary errors
     * AI 요약 오류 처리
     * @param {Error} error - AI summary error
     * @param {Object} context - Additional context
     * @returns {Object} Processed error
     */
    handleAISummaryError(error, context = {}) {
        return this.handleError(error, this.errorCategories.AI_SUMMARY, this.errorSeverity.LOW, {
            ...context,
            component: 'ai-summary'
        });
    }
}

// Create global instance
const errorHandler = new ErrorHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorHandler, errorHandler };
}