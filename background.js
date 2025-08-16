// Background service worker for LaterLens Chrome extension
// 백그라운드 서비스 워커 - 확장 프로그램의 핵심 로직 처리

// Import utility functions
importScripts('utils/models.js', 'utils/helpers.js', 'utils/storage.js', 'utils/settings.js', 'utils/screenshot.js', 'utils/content-extractor.js', 'utils/ai-summary.js');

// Enhanced Extension Lifecycle Management
// 향상된 확장 프로그램 생명주기 관리
const lifecycleManager = new ExtensionLifecycleManager();

chrome.runtime.onInstalled.addListener((details) => {
    lifecycleManager.handleInstalled(details);
});

chrome.runtime.onStartup.addListener(() => {
    lifecycleManager.handleStartup();
});

chrome.runtime.onSuspend.addListener(() => {
    lifecycleManager.handleSuspend();
});

chrome.runtime.onSuspendCanceled.addListener(() => {
    lifecycleManager.handleSuspendCanceled();
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    lifecycleManager.handleUnhandledRejection(event);
});

// Handle uncaught errors
self.addEventListener('error', (event) => {
    lifecycleManager.handleUncaughtError(event);
});

/**
 * Extension Lifecycle Manager class
 * 확장 프로그램 생명주기 관리 클래스
 */
class ExtensionLifecycleManager {
    constructor() {
        this.startTime = Date.now();
        this.installTime = null;
        this.lastUpdateTime = null;
        this.suspendCount = 0;
        this.errorCount = 0;
        this.recoveryAttempts = 0;
        this.maxRecoveryAttempts = 3;
        this.healthCheckInterval = null;
        this.cleanupInterval = null;
        
        // Performance metrics
        this.metrics = {
            memoryUsage: [],
            requestCounts: {},
            errorCounts: {},
            performanceMarks: new Map()
        };
        
        // Recovery strategies
        this.recoveryStrategies = new Map([
            ['storage_error', this.recoverFromStorageError.bind(this)],
            ['api_error', this.recoverFromAPIError.bind(this)],
            ['memory_error', this.recoverFromMemoryError.bind(this)],
            ['network_error', this.recoverFromNetworkError.bind(this)]
        ]);
        
        this.initializeHealthMonitoring();
    }

    /**
     * Handle extension installation events
     * 확장 프로그램 설치 이벤트 처리
     */
    async handleInstalled(details) {
        console.log('LaterLens lifecycle event:', details.reason);
        
        try {
            switch (details.reason) {
                case 'install':
                    await this.handleFirstInstall(details);
                    break;
                case 'update':
                    await this.handleUpdate(details);
                    break;
                case 'chrome_update':
                    await this.handleChromeUpdate(details);
                    break;
                case 'shared_module_update':
                    await this.handleSharedModuleUpdate(details);
                    break;
                default:
                    console.log('Unknown install reason:', details.reason);
            }
            
            // Record installation time
            this.installTime = Date.now();
            await this.saveLifecycleMetrics();
            
        } catch (error) {
            console.error('Error handling installation:', error);
            await this.handleError('installation_error', error);
        }
    }

    /**
     * Handle first-time installation
     * 최초 설치 처리
     */
    async handleFirstInstall(details) {
        console.log('First-time installation detected');
        
        try {
            // Initialize default settings
            await initializeDefaultSettings();
            
            // Create welcome notification
            await this.showWelcomeNotification();
            
            // Set up initial data structures
            await this.initializeDataStructures();
            
            // Record installation analytics
            await this.recordInstallationAnalytics('first_install');
            
            console.log('First-time installation completed successfully');
            
        } catch (error) {
            console.error('First-time installation failed:', error);
            throw error;
        }
    }

    /**
     * Handle extension updates
     * 확장 프로그램 업데이트 처리
     */
    async handleUpdate(details) {
        console.log('Extension update detected:', {
            previousVersion: details.previousVersion,
            currentVersion: chrome.runtime.getManifest().version
        });
        
        try {
            const previousVersion = details.previousVersion;
            const currentVersion = chrome.runtime.getManifest().version;
            
            // Run migration scripts if needed
            await this.runMigrations(previousVersion, currentVersion);
            
            // Update settings schema if needed
            await this.updateSettingsSchema(previousVersion, currentVersion);
            
            // Clean up deprecated data
            await this.cleanupDeprecatedData(previousVersion);
            
            // Show update notification
            await this.showUpdateNotification(previousVersion, currentVersion);
            
            // Record update analytics
            await this.recordInstallationAnalytics('update', {
                previousVersion,
                currentVersion
            });
            
            this.lastUpdateTime = Date.now();
            console.log('Extension update completed successfully');
            
        } catch (error) {
            console.error('Extension update failed:', error);
            await this.handleError('update_error', error);
        }
    }

    /**
     * Handle Chrome browser updates
     * Chrome 브라우저 업데이트 처리
     */
    async handleChromeUpdate(details) {
        console.log('Chrome update detected');
        
        try {
            // Verify compatibility
            await this.verifyBrowserCompatibility();
            
            // Refresh API permissions if needed
            await this.refreshAPIPermissions();
            
            // Record Chrome update
            await this.recordInstallationAnalytics('chrome_update');
            
        } catch (error) {
            console.error('Chrome update handling failed:', error);
            await this.handleError('chrome_update_error', error);
        }
    }

    /**
     * Handle shared module updates
     * 공유 모듈 업데이트 처리
     */
    async handleSharedModuleUpdate(details) {
        console.log('Shared module update detected');
        
        try {
            // Reinitialize shared dependencies
            await this.reinitializeSharedDependencies();
            
            // Record shared module update
            await this.recordInstallationAnalytics('shared_module_update');
            
        } catch (error) {
            console.error('Shared module update handling failed:', error);
            await this.handleError('shared_module_update_error', error);
        }
    }

    /**
     * Handle service worker startup
     * 서비스 워커 시작 처리
     */
    async handleStartup() {
        console.log('Service worker startup');
        
        try {
            this.startTime = Date.now();
            
            // Restore previous state if available
            await this.restorePreviousState();
            
            // Initialize health monitoring
            this.initializeHealthMonitoring();
            
            // Verify system integrity
            await this.verifySystemIntegrity();
            
            // Record startup
            await this.recordLifecycleEvent('startup');
            
            console.log('Service worker startup completed');
            
        } catch (error) {
            console.error('Service worker startup failed:', error);
            await this.handleError('startup_error', error);
        }
    }

    /**
     * Handle service worker suspend
     * 서비스 워커 일시 중단 처리
     */
    async handleSuspend() {
        console.log('Service worker suspending');
        
        try {
            this.suspendCount++;
            
            // Save current state
            await this.saveCurrentState();
            
            // Clean up resources
            await this.cleanupResources();
            
            // Stop health monitoring
            this.stopHealthMonitoring();
            
            // Record suspend event
            await this.recordLifecycleEvent('suspend');
            
            console.log('Service worker suspend completed');
            
        } catch (error) {
            console.error('Service worker suspend failed:', error);
            // Don't throw error during suspend to avoid blocking
        }
    }

    /**
     * Handle service worker suspend cancellation
     * 서비스 워커 일시 중단 취소 처리
     */
    async handleSuspendCanceled() {
        console.log('Service worker suspend canceled');
        
        try {
            // Restore health monitoring
            this.initializeHealthMonitoring();
            
            // Record suspend cancellation
            await this.recordLifecycleEvent('suspend_canceled');
            
        } catch (error) {
            console.error('Suspend cancellation handling failed:', error);
        }
    }

    /**
     * Handle unhandled promise rejections
     * 처리되지 않은 Promise 거부 처리
     */
    async handleUnhandledRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);
        
        this.errorCount++;
        
        try {
            // Log the error
            await this.logError('unhandled_rejection', event.reason);
            
            // Attempt recovery
            await this.attemptRecovery('unhandled_rejection', event.reason);
            
            // Prevent default handling
            event.preventDefault();
            
        } catch (recoveryError) {
            console.error('Recovery from unhandled rejection failed:', recoveryError);
        }
    }

    /**
     * Handle uncaught errors
     * 포착되지 않은 오류 처리
     */
    async handleUncaughtError(event) {
        console.error('Uncaught error:', event.error);
        
        this.errorCount++;
        
        try {
            // Log the error
            await this.logError('uncaught_error', event.error);
            
            // Attempt recovery
            await this.attemptRecovery('uncaught_error', event.error);
            
        } catch (recoveryError) {
            console.error('Recovery from uncaught error failed:', recoveryError);
        }
    }

    /**
     * Initialize health monitoring
     * 상태 모니터링 초기화
     */
    initializeHealthMonitoring() {
        // Clear existing intervals
        this.stopHealthMonitoring();
        
        // Health check every 5 minutes
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 5 * 60 * 1000);
        
        // Cleanup every hour
        this.cleanupInterval = setInterval(() => {
            this.performPeriodicCleanup();
        }, 60 * 60 * 1000);
        
        console.log('Health monitoring initialized');
    }

    /**
     * Stop health monitoring
     * 상태 모니터링 중지
     */
    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        console.log('Health monitoring stopped');
    }

    /**
     * Perform health check
     * 상태 확인 수행
     */
    async performHealthCheck() {
        try {
            const healthStatus = {
                timestamp: Date.now(),
                uptime: Date.now() - this.startTime,
                memoryUsage: this.getMemoryUsage(),
                errorCount: this.errorCount,
                suspendCount: this.suspendCount,
                activeRequests: messageRouter?.getActiveRequestStats?.() || { total: 0 }
            };
            
            // Check for memory leaks
            if (healthStatus.memoryUsage > 100 * 1024 * 1024) { // 100MB
                console.warn('High memory usage detected:', healthStatus.memoryUsage);
                await this.handleError('high_memory_usage', new Error('Memory usage exceeded threshold'));
            }
            
            // Check for excessive errors
            if (this.errorCount > 50) {
                console.warn('High error count detected:', this.errorCount);
                await this.attemptRecovery('high_error_count', new Error('Error count exceeded threshold'));
            }
            
            // Record health metrics
            this.metrics.memoryUsage.push({
                timestamp: Date.now(),
                usage: healthStatus.memoryUsage
            });
            
            // Keep only last 100 memory readings
            if (this.metrics.memoryUsage.length > 100) {
                this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
            }
            
            console.log('Health check completed:', healthStatus);
            
        } catch (error) {
            console.error('Health check failed:', error);
        }
    }

    /**
     * Perform periodic cleanup
     * 주기적 정리 수행
     */
    async performPeriodicCleanup() {
        try {
            console.log('Performing periodic cleanup');
            
            // Clean up old metrics
            this.cleanupOldMetrics();
            
            // Clean up message router rate limits
            if (messageRouter?.cleanupRateLimits) {
                messageRouter.cleanupRateLimits();
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            console.log('Periodic cleanup completed');
            
        } catch (error) {
            console.error('Periodic cleanup failed:', error);
        }
    }

    /**
     * Handle errors with recovery mechanisms
     * 복구 메커니즘을 통한 오류 처리
     */
    async handleError(errorType, error) {
        console.error(`Handling error type: ${errorType}`, error);
        
        try {
            // Log the error
            await this.logError(errorType, error);
            
            // Attempt recovery
            await this.attemptRecovery(errorType, error);
            
        } catch (recoveryError) {
            console.error('Error recovery failed:', recoveryError);
            
            // If recovery fails multiple times, reset the extension
            if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
                await this.performEmergencyReset();
            }
        }
    }

    /**
     * Attempt error recovery
     * 오류 복구 시도
     */
    async attemptRecovery(errorType, error) {
        this.recoveryAttempts++;
        
        console.log(`Attempting recovery for ${errorType} (attempt ${this.recoveryAttempts})`);
        
        // Try specific recovery strategy
        const strategy = this.recoveryStrategies.get(errorType);
        if (strategy) {
            await strategy(error);
        } else {
            // Generic recovery
            await this.performGenericRecovery(error);
        }
        
        // Reset recovery attempts on successful recovery
        this.recoveryAttempts = 0;
        
        console.log(`Recovery successful for ${errorType}`);
    }

    /**
     * Recovery strategies for different error types
     * 다양한 오류 유형에 대한 복구 전략
     */
    async recoverFromStorageError(error) {
        console.log('Recovering from storage error');
        
        try {
            // Clear corrupted storage
            await chrome.storage.local.clear();
            
            // Reinitialize default settings
            await initializeDefaultSettings();
            
            // Reinitialize data structures
            await this.initializeDataStructures();
            
        } catch (recoveryError) {
            throw new Error(`Storage recovery failed: ${recoveryError.message}`);
        }
    }

    async recoverFromAPIError(error) {
        console.log('Recovering from API error');
        
        try {
            // Reset API configurations
            const settingsManager = new SettingsManager();
            const settings = await settingsManager.getSettings();
            
            // Disable AI features temporarily if API errors persist
            if (settings.enableAISummary) {
                await settingsManager.saveSettings({
                    ...settings,
                    enableAISummary: false,
                    _apiErrorRecovery: true
                });
            }
            
        } catch (recoveryError) {
            throw new Error(`API recovery failed: ${recoveryError.message}`);
        }
    }

    async recoverFromMemoryError(error) {
        console.log('Recovering from memory error');
        
        try {
            // Clear caches
            this.metrics.memoryUsage = [];
            this.metrics.requestCounts = {};
            this.metrics.errorCounts = {};
            
            // Force garbage collection
            if (global.gc) {
                global.gc();
            }
            
            // Restart health monitoring with longer intervals
            this.stopHealthMonitoring();
            setTimeout(() => {
                this.initializeHealthMonitoring();
            }, 10000);
            
        } catch (recoveryError) {
            throw new Error(`Memory recovery failed: ${recoveryError.message}`);
        }
    }

    async recoverFromNetworkError(error) {
        console.log('Recovering from network error');
        
        try {
            // Implement exponential backoff for network requests
            // This would be handled by individual services
            
            // Log network status
            console.log('Network recovery - checking connectivity');
            
        } catch (recoveryError) {
            throw new Error(`Network recovery failed: ${recoveryError.message}`);
        }
    }

    async performGenericRecovery(error) {
        console.log('Performing generic recovery');
        
        try {
            // Reset error counters
            this.errorCount = Math.max(0, this.errorCount - 10);
            
            // Restart health monitoring
            this.initializeHealthMonitoring();
            
            // Clear old metrics
            this.cleanupOldMetrics();
            
        } catch (recoveryError) {
            throw new Error(`Generic recovery failed: ${recoveryError.message}`);
        }
    }

    /**
     * Perform emergency reset
     * 비상 재설정 수행
     */
    async performEmergencyReset() {
        console.warn('Performing emergency reset due to repeated recovery failures');
        
        try {
            // Clear all storage
            await chrome.storage.local.clear();
            
            // Reset all counters
            this.errorCount = 0;
            this.recoveryAttempts = 0;
            this.suspendCount = 0;
            
            // Clear metrics
            this.metrics = {
                memoryUsage: [],
                requestCounts: {},
                errorCounts: {},
                performanceMarks: new Map()
            };
            
            // Reinitialize everything
            await initializeDefaultSettings();
            await this.initializeDataStructures();
            this.initializeHealthMonitoring();
            
            console.log('Emergency reset completed');
            
        } catch (resetError) {
            console.error('Emergency reset failed:', resetError);
            // At this point, the extension is in a critical state
        }
    }

    // Helper methods
    async showWelcomeNotification() {
        // Implementation would depend on notification system
        console.log('Welcome to LaterLens!');
    }

    async showUpdateNotification(previousVersion, currentVersion) {
        console.log(`LaterLens updated from ${previousVersion} to ${currentVersion}`);
    }

    async initializeDataStructures() {
        // Initialize any required data structures
        console.log('Data structures initialized');
    }

    async runMigrations(previousVersion, currentVersion) {
        console.log(`Running migrations from ${previousVersion} to ${currentVersion}`);
        // Migration logic would go here
    }

    async updateSettingsSchema(previousVersion, currentVersion) {
        console.log('Updating settings schema if needed');
        // Schema update logic would go here
    }

    async cleanupDeprecatedData(previousVersion) {
        console.log('Cleaning up deprecated data');
        // Cleanup logic would go here
    }

    async verifyBrowserCompatibility() {
        console.log('Verifying browser compatibility');
        // Compatibility check logic would go here
    }

    async refreshAPIPermissions() {
        console.log('Refreshing API permissions');
        // Permission refresh logic would go here
    }

    async reinitializeSharedDependencies() {
        console.log('Reinitializing shared dependencies');
        // Dependency reinitialization logic would go here
    }

    async restorePreviousState() {
        console.log('Restoring previous state');
        // State restoration logic would go here
    }

    async verifySystemIntegrity() {
        console.log('Verifying system integrity');
        // Integrity check logic would go here
    }

    async saveCurrentState() {
        console.log('Saving current state');
        // State saving logic would go here
    }

    async cleanupResources() {
        console.log('Cleaning up resources');
        // Resource cleanup logic would go here
    }

    async recordLifecycleEvent(eventType) {
        try {
            const event = {
                type: eventType,
                timestamp: Date.now(),
                uptime: Date.now() - this.startTime
            };
            
            console.log('Lifecycle event recorded:', event);
            
        } catch (error) {
            console.error('Failed to record lifecycle event:', error);
        }
    }

    async recordInstallationAnalytics(installType, metadata = {}) {
        try {
            const analytics = {
                installType,
                timestamp: Date.now(),
                version: chrome.runtime.getManifest().version,
                ...metadata
            };
            
            console.log('Installation analytics recorded:', analytics);
            
        } catch (error) {
            console.error('Failed to record installation analytics:', error);
        }
    }

    async logError(errorType, error) {
        try {
            const errorLog = {
                type: errorType,
                message: error.message,
                stack: error.stack,
                timestamp: Date.now(),
                uptime: Date.now() - this.startTime
            };
            
            console.error('Error logged:', errorLog);
            
            // Update error counts
            this.metrics.errorCounts[errorType] = (this.metrics.errorCounts[errorType] || 0) + 1;
            
        } catch (loggingError) {
            console.error('Failed to log error:', loggingError);
        }
    }

    async saveLifecycleMetrics() {
        try {
            const metrics = {
                startTime: this.startTime,
                installTime: this.installTime,
                lastUpdateTime: this.lastUpdateTime,
                suspendCount: this.suspendCount,
                errorCount: this.errorCount,
                recoveryAttempts: this.recoveryAttempts
            };
            
            await chrome.storage.local.set({ lifecycleMetrics: metrics });
            
        } catch (error) {
            console.error('Failed to save lifecycle metrics:', error);
        }
    }

    getMemoryUsage() {
        // Approximate memory usage calculation
        return JSON.stringify(this.metrics).length + 
               JSON.stringify(messageRouter || {}).length;
    }

    cleanupOldMetrics() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        // Clean up old memory usage data
        this.metrics.memoryUsage = this.metrics.memoryUsage.filter(
            entry => entry.timestamp > oneHourAgo
        );
        
        // Clean up old performance marks
        for (const [key, timestamp] of this.metrics.performanceMarks) {
            if (timestamp < oneHourAgo) {
                this.metrics.performanceMarks.delete(key);
            }
        }
    }
}

// Enhanced message router for handling popup and content script communications
// 팝업 및 콘텐츠 스크립트 통신을 위한 향상된 메시지 라우터
const messageRouter = new MessageRouter();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    messageRouter.handleMessage(message, sender, sendResponse);
    return true; // Indicate we'll send a response asynchronously
});

/**
 * Message Router class for handling all extension communications
 * 모든 확장 프로그램 통신을 처리하는 메시지 라우터 클래스
 */
class MessageRouter {
    constructor() {
        this.handlers = new Map();
        this.middleware = [];
        this.requestId = 0;
        this.activeRequests = new Map();
        
        // Register all message handlers
        this.registerHandlers();
        
        // Setup middleware
        this.setupMiddleware();
    }

    /**
     * Register all message handlers
     * 모든 메시지 핸들러 등록
     */
    registerHandlers() {
        // Page management handlers
        this.register('savePage', this.handleSavePage.bind(this));
        this.register('getPages', this.handleGetPages.bind(this));
        this.register('deletePage', this.handleDeletePage.bind(this));
        this.register('updatePage', this.handleUpdatePage.bind(this));
        this.register('restorePage', this.handleRestorePage.bind(this));
        this.register('emptyTrash', this.handleEmptyTrash.bind(this));
        this.register('searchPages', this.handleSearchPages.bind(this));
        this.register('clearAll', this.handleClearAll.bind(this));
        
        // Settings handlers
        this.register('getSettings', this.handleGetSettings.bind(this));
        this.register('saveSettings', this.handleSaveSettings.bind(this));
        this.register('testAPIKey', this.handleTestAPIKey.bind(this));
        
        // Storage handlers
        this.register('getStorageInfo', this.handleGetStorageInfo.bind(this));
        
        // Screenshot handlers
        this.register('captureScreenshot', this.handleCaptureScreenshot.bind(this));
        this.register('optimizeImage', this.handleOptimizeImage.bind(this));
        
        // Content extraction handlers
        this.register('extractContent', this.handleExtractContent.bind(this));
        
        // AI summary handlers
        this.register('testAIConnection', this.handleTestAIConnection.bind(this));
        this.register('generateSummary', this.handleGenerateSummary.bind(this));
        this.register('testSummaryWorkflows', this.handleTestSummaryWorkflows.bind(this));
        this.register('validateSummaryWorkflow', this.handleValidateSummaryWorkflow.bind(this));
        
        // System handlers
        this.register('ping', this.handlePing.bind(this));
        this.register('getSystemInfo', this.handleGetSystemInfo.bind(this));
    }

    /**
     * Setup middleware for request processing
     * 요청 처리를 위한 미들웨어 설정
     */
    setupMiddleware() {
        // Request logging middleware
        this.use(async (message, sender, next) => {
            const requestId = ++this.requestId;
            const startTime = Date.now();
            
            console.log(`[${requestId}] Incoming message:`, {
                action: message.action,
                sender: sender.tab ? `tab:${sender.tab.id}` : 'extension',
                timestamp: new Date().toISOString()
            });
            
            this.activeRequests.set(requestId, {
                action: message.action,
                startTime,
                sender
            });
            
            try {
                const result = await next();
                const duration = Date.now() - startTime;
                
                console.log(`[${requestId}] Request completed:`, {
                    action: message.action,
                    duration: `${duration}ms`,
                    success: result.success !== false
                });
                
                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                
                console.error(`[${requestId}] Request failed:`, {
                    action: message.action,
                    duration: `${duration}ms`,
                    error: error.message
                });
                
                throw error;
            } finally {
                this.activeRequests.delete(requestId);
            }
        });
        
        // Rate limiting middleware
        this.use(async (message, sender, next) => {
            const rateLimitKey = `${message.action}:${sender.tab?.id || 'extension'}`;
            const now = Date.now();
            
            // Simple rate limiting (max 10 requests per second per action per tab)
            if (!this.rateLimits) this.rateLimits = new Map();
            
            const limit = this.rateLimits.get(rateLimitKey) || [];
            const recentRequests = limit.filter(time => now - time < 1000);
            
            if (recentRequests.length >= 10) {
                throw new Error('Rate limit exceeded');
            }
            
            recentRequests.push(now);
            this.rateLimits.set(rateLimitKey, recentRequests);
            
            return await next();
        });
        
        // Validation middleware
        this.use(async (message, sender, next) => {
            if (!message.action) {
                throw new Error('Missing action in message');
            }
            
            if (!this.handlers.has(message.action)) {
                throw new Error(`Unknown action: ${message.action}`);
            }
            
            return await next();
        });
    }

    /**
     * Register a message handler
     * 메시지 핸들러 등록
     */
    register(action, handler) {
        this.handlers.set(action, handler);
    }

    /**
     * Add middleware
     * 미들웨어 추가
     */
    use(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * Handle incoming message
     * 들어오는 메시지 처리
     */
    async handleMessage(message, sender, sendResponse) {
        try {
            const result = await this.processMessage(message, sender);
            sendResponse(result);
        } catch (error) {
            console.error('Message handling error:', error);
            sendResponse({
                success: false,
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Process message through middleware chain
     * 미들웨어 체인을 통한 메시지 처리
     */
    async processMessage(message, sender) {
        let index = 0;
        
        const next = async () => {
            if (index < this.middleware.length) {
                const middleware = this.middleware[index++];
                return await middleware(message, sender, next);
            } else {
                // Execute the actual handler
                const handler = this.handlers.get(message.action);
                return await handler(message, sender);
            }
        };
        
        return await next();
    }

    // Page management handlers
    async handleSavePage(message, sender) {
        const { data, tabId } = message;
        return await savePage(data, tabId || sender.tab?.id);
    }

    async handleGetPages(message, sender) {
        return await getPages();
    }

    async handleDeletePage(message, sender) {
        const { data } = message;
        return await deletePage(data.id);
    }

    async handleUpdatePage(message, sender) {
        const { data } = message;
        return await updatePage(data.id, data);
    }

    async handleRestorePage(message, sender) {
        const { data } = message;
        return await restorePage(data);
    }

    async handleEmptyTrash(message, sender) {
        const { data } = message;
        return await emptyTrash(data.pageIds);
    }

    async handleSearchPages(message, sender) {
        const { data } = message;
        return await searchPages(data.query);
    }

    async handleClearAll(message, sender) {
        return await clearAllPages();
            
    }

    // Settings handlers
    async handleGetSettings(message, sender) {
        return await getSettings();
    }

    async handleSaveSettings(message, sender) {
        const { data } = message;
        return await saveSettings(data);
    }

    async handleTestAPIKey(message, sender) {
        const { data } = message;
        return await testAPIKey(data.apiKey, data.provider);
    }

    // Storage handlers
    async handleGetStorageInfo(message, sender) {
        return await getStorageInfo();
    }

    // Screenshot handlers
    async handleCaptureScreenshot(message, sender) {
        const { data } = message;
        return await captureScreenshot(data.tabId, data.options);
    }

    async handleOptimizeImage(message, sender) {
        const { data } = message;
        return await optimizeImage(data.dataUrl, data.targetSize);
    }

    // Content extraction handlers
    async handleExtractContent(message, sender) {
        const { data, tabId } = message;
        return await extractContentForSummary(tabId || sender.tab?.id, data.options);
    }

    // AI summary handlers
    async handleTestAIConnection(message, sender) {
        const { data } = message;
        return await testAIConnection(data.provider, data.apiKey, data.options);
    }

    async handleGenerateSummary(message, sender) {
        const { data } = message;
        return await generateAISummaryDirect(data.content, data.options);
    }

    async handleTestSummaryWorkflows(message, sender) {
        const { data, tabId } = message;
        return await testSummaryWorkflows(tabId || data.tabId || sender.tab?.id);
    }

    async handleValidateSummaryWorkflow(message, sender) {
        const { data } = message;
        return await validateSummaryWorkflow(data.settings, data.content);
    }

    // System handlers
    async handlePing(message, sender) {
        return {
            success: true,
            pong: true,
            timestamp: Date.now(),
            version: chrome.runtime.getManifest().version
        };
    }

    async handleGetSystemInfo(message, sender) {
        const manifest = chrome.runtime.getManifest();
        const storageInfo = await getStorageInfo();
        
        return {
            success: true,
            data: {
                version: manifest.version,
                name: manifest.name,
                activeRequests: this.activeRequests.size,
                uptime: Date.now() - (this.startTime || Date.now()),
                storage: storageInfo.data,
                handlers: Array.from(this.handlers.keys()),
                middleware: this.middleware.length
            }
        };
    }

    /**
     * Get active request statistics
     * 활성 요청 통계 가져오기
     */
    getActiveRequestStats() {
        const stats = {
            total: this.activeRequests.size,
            byAction: {},
            byTab: {},
            oldestRequest: null
        };

        let oldestTime = Date.now();
        
        for (const [id, request] of this.activeRequests) {
            // By action
            stats.byAction[request.action] = (stats.byAction[request.action] || 0) + 1;
            
            // By tab
            const tabId = request.sender.tab?.id || 'extension';
            stats.byTab[tabId] = (stats.byTab[tabId] || 0) + 1;
            
            // Oldest request
            if (request.startTime < oldestTime) {
                oldestTime = request.startTime;
                stats.oldestRequest = {
                    id,
                    action: request.action,
                    duration: Date.now() - request.startTime
                };
            }
        }

        return stats;
    }

    /**
     * Clean up rate limits periodically
     * 주기적으로 속도 제한 정리
     */
    cleanupRateLimits() {
        if (!this.rateLimits) return;
        
        const now = Date.now();
        for (const [key, timestamps] of this.rateLimits) {
            const recent = timestamps.filter(time => now - time < 1000);
            if (recent.length === 0) {
                this.rateLimits.delete(key);
            } else {
                this.rateLimits.set(key, recent);
            }
        }
    }
}

async function initializeDefaultSettings() {
    try {
        const settingsManager = new SettingsManager();
        await settingsManager.initialize();
        console.log('Default settings initialized');
        
        // Initialize message router cleanup
        if (messageRouter) {
            messageRouter.startTime = Date.now();
            
            // Setup periodic cleanup
            setInterval(() => {
                messageRouter.cleanupRateLimits();
            }, 60000); // Clean up every minute
        }
        
    } catch (error) {
        console.error('Failed to initialize default settings:', error);
        throw error; // Re-throw to allow lifecycle manager to handle
    }
}

/**
 * Enhanced page saving orchestration combining all extraction services
 * 모든 추출 서비스를 결합한 향상된 페이지 저장 오케스트레이션
 */
async function savePage(pageData, tabId) {
    const orchestrator = new PageSaveOrchestrator();
    return await orchestrator.savePage(pageData, tabId);
}

/**
 * Page Save Orchestrator class for coordinating all extraction services
 * 모든 추출 서비스를 조정하는 페이지 저장 오케스트레이터 클래스
 */
class PageSaveOrchestrator {
    constructor() {
        this.steps = [
            { name: 'validateInput', handler: this.validateInput.bind(this) },
            { name: 'getTabInfo', handler: this.getTabInfo.bind(this) },
            { name: 'loadSettings', handler: this.loadSettings.bind(this) },
            { name: 'extractMetadata', handler: this.extractMetadata.bind(this) },
            { name: 'captureScreenshot', handler: this.captureScreenshot.bind(this) },
            { name: 'generateSummary', handler: this.generateSummary.bind(this) },
            { name: 'createPageObject', handler: this.createPageObject.bind(this) },
            { name: 'saveToStorage', handler: this.saveToStorage.bind(this) },
            { name: 'enforceStorageLimits', handler: this.enforceStorageLimits.bind(this) }
        ];
    }

    async savePage(pageData, tabId) {
        const context = {
            pageData,
            tabId,
            startTime: Date.now(),
            results: {},
            errors: []
        };

        try {
            console.log('Starting page save orchestration for tab:', tabId);
            
            // Execute all steps in sequence
            for (const step of this.steps) {
                try {
                    console.log(`Executing step: ${step.name}`);
                    const stepStartTime = Date.now();
                    
                    await step.handler(context);
                    
                    const stepDuration = Date.now() - stepStartTime;
                    console.log(`Step ${step.name} completed in ${stepDuration}ms`);
                    
                } catch (error) {
                    console.error(`Step ${step.name} failed:`, error);
                    context.errors.push({
                        step: step.name,
                        error: error.message,
                        timestamp: Date.now()
                    });
                    
                    // Some steps are critical, others can be skipped
                    if (this.isCriticalStep(step.name)) {
                        throw error;
                    }
                }
            }

            const totalDuration = Date.now() - context.startTime;
            console.log(`Page save orchestration completed in ${totalDuration}ms`);

            return {
                success: true,
                data: context.results.savedPage,
                metadata: {
                    duration: totalDuration,
                    steps: this.steps.map(s => s.name),
                    errors: context.errors,
                    timestamp: Date.now()
                }
            };

        } catch (error) {
            console.error('Page save orchestration failed:', error);
            
            return {
                success: false,
                error: error.message,
                metadata: {
                    duration: Date.now() - context.startTime,
                    failedAt: context.errors[context.errors.length - 1]?.step,
                    errors: context.errors,
                    timestamp: Date.now()
                }
            };
        }
    }

    async validateInput(context) {
        if (!context.tabId) {
            throw new Error('No tab ID provided');
        }
        
        if (typeof context.tabId !== 'number' || context.tabId < 0) {
            throw new Error('Invalid tab ID');
        }
    }

    async getTabInfo(context) {
        try {
            context.results.tab = await chrome.tabs.get(context.tabId);
            
            // Validate tab URL
            if (!context.results.tab.url || context.results.tab.url.startsWith('chrome://')) {
                throw new Error('Cannot save chrome:// pages');
            }
            
        } catch (error) {
            throw new Error(`Failed to get tab info: ${error.message}`);
        }
    }

    async loadSettings(context) {
        const settingsResponse = await getSettings();
        if (!settingsResponse.success) {
            throw new Error('Failed to load settings');
        }
        context.results.settings = settingsResponse.data;
    }

    async extractMetadata(context) {
        try {
            const [metadataResult] = await chrome.scripting.executeScript({
                target: { tabId: context.tabId },
                func: extractPageMetadata
            });
            
            context.results.metadata = metadataResult.result || {};
            
        } catch (error) {
            console.warn('Metadata extraction failed, using fallback:', error);
            context.results.metadata = {
                title: context.results.tab.title,
                description: '',
                ogImage: null
            };
        }
    }

    async captureScreenshot(context) {
        try {
            const screenshotService = new ScreenshotService();
            const screenshotResult = await screenshotService.captureTab(context.tabId, {
                format: 'jpeg',
                quality: context.results.settings.thumbnailQuality * 100 || 80,
                thumbnailWidth: 400,
                thumbnailHeight: 300
            });
            
            context.results.screenshot = screenshotResult.success ? 
                screenshotResult.dataUrl : 
                screenshotResult.fallback;
                
        } catch (error) {
            console.warn('Screenshot capture failed, using fallback:', error);
            context.results.screenshot = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0yMCAyMEgyMFYyMEgyMFoiIHN0cm9rZT0iIzZDNzU3RCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+';
        }
    }

    async generateSummary(context) {
        try {
            const summaryResult = await generateConditionalSummary(context.tabId, context.results.settings);
            context.results.summary = summaryResult.summary;
            context.results.summaryMetadata = summaryResult.metadata;
            
        } catch (error) {
            console.warn('Summary generation failed, using fallback:', error);
            context.results.summary = '요약 없음';
            context.results.summaryMetadata = {
                method: 'error',
                reason: 'Summary generation failed',
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    async createPageObject(context) {
        const { tab, metadata, screenshot, summary, summaryMetadata } = context.results;
        
        const pageData = {
            url: tab.url,
            title: tab.title || metadata.title || 'Untitled',
            summary: summary,
            thumbnail: screenshot,
            ogImage: metadata.ogImage,
            description: metadata.description,
            summaryMetadata: summaryMetadata
        };
        
        context.results.pageObject = new SavedPage(pageData);
    }

    async saveToStorage(context) {
        const storageService = new StorageService();
        const saveResult = await storageService.savePage(context.results.pageObject.toJSON());
        
        if (!saveResult.success) {
            throw new Error('Failed to save page to storage');
        }
        
        context.results.savedPage = context.results.pageObject.toJSON();
    }

    async enforceStorageLimits(context) {
        try {
            const storageService = new StorageService();
            const maxItems = context.results.settings.maxStorageItems || 1000;
            await storageService.enforceStorageLimit(maxItems);
            
        } catch (error) {
            console.warn('Storage limit enforcement failed:', error);
            // Non-critical error, don't fail the entire operation
        }
    }

    isCriticalStep(stepName) {
        const criticalSteps = [
            'validateInput',
            'getTabInfo',
            'loadSettings',
            'createPageObject',
            'saveToStorage'
        ];
        return criticalSteps.includes(stepName);
    }
}

async function getPages() {
    try {
        const storageService = new StorageService();
        const pages = await storageService.getPages();
        return { success: true, data: pages };
    } catch (error) {
        console.error('Error getting pages:', error);
        return { success: false, error: error.message };
    }
}

async function deletePage(pageId) {
    try {
        const storageService = new StorageService();
        await storageService.deletePage(pageId);
        return { success: true };
    } catch (error) {
        console.error('Error deleting page:', error);
        return { success: false, error: error.message };
    }
}

async function updatePage(pageId, updates) {
    try {
        const storageService = new StorageService();
        const result = await storageService.updatePage(pageId, updates);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error updating page:', error);
        return { success: false, error: error.message };
    }
}

async function restorePage(pageData) {
    try {
        const storageService = new StorageService();
        const result = await storageService.savePage(pageData);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error restoring page:', error);
        return { success: false, error: error.message };
    }
}

async function emptyTrash(pageIds) {
    try {
        if (!pageIds || pageIds.length === 0) {
            return { success: true, message: 'No pages to delete' };
        }

        const storageService = new StorageService();
        let deletedCount = 0;
        const errors = [];

        for (const pageId of pageIds) {
            try {
                await storageService.deletePage(pageId);
                deletedCount++;
            } catch (error) {
                errors.push({ pageId, error: error.message });
            }
        }

        return { 
            success: true, 
            deletedCount, 
            errors: errors.length > 0 ? errors : undefined 
        };
    } catch (error) {
        console.error('Error emptying trash:', error);
        return { success: false, error: error.message };
    }
}

async function searchPages(query) {
    try {
        const storageService = new StorageService();
        const pages = await storageService.searchPages(query);
        return { success: true, data: pages };
    } catch (error) {
        console.error('Error searching pages:', error);
        return { success: false, error: error.message };
    }
}

async function clearAllPages() {
    try {
        const storageService = new StorageService();
        await storageService.clearAll();
        return { success: true };
    } catch (error) {
        console.error('Error clearing pages:', error);
        return { success: false, error: error.message };
    }
}

async function getSettings() {
    try {
        const settingsManager = new SettingsManager();
        const settings = await settingsManager.getSettings();
        return { success: true, data: settings };
    } catch (error) {
        console.error('Error getting settings:', error);
        return { success: false, error: error.message };
    }
}

async function saveSettings(settings) {
    try {
        const settingsManager = new SettingsManager();
        const result = await settingsManager.saveSettings(settings);
        return { success: true, data: result.data };
    } catch (error) {
        console.error('Error saving settings:', error);
        return { success: false, error: error.message };
    }
}

async function testAPIKey(apiKey, provider) {
    try {
        // First validate the key format
        const settingsManager = new SettingsManager();
        const validation = settingsManager.validateAPIKey(apiKey, provider);
        
        if (!validation.isValid) {
            return { success: false, error: validation.error };
        }
        
        // Then test the actual API connection
        if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                return { success: true };
            } else {
                const error = await response.json();
                throw new Error(error.error?.message || 'API key validation failed');
            }
        } else {
            throw new Error('Unsupported API provider');
        }
    } catch (error) {
        console.error('Error testing API key:', error);
        return { success: false, error: error.message };
    }
}

async function getStorageInfo() {
    try {
        const storageService = new StorageService();
        const info = await storageService.getStorageInfo();
        return { success: true, data: info };
    } catch (error) {
        console.error('Error getting storage info:', error);
        return { success: false, error: error.message };
    }
}

async function generateAISummary(content, apiKey, provider) {
    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that creates concise summaries of web page content. Summarize the main points in 2-3 sentences, maximum 200 characters.'
                    },
                    {
                        role: 'user',
                        content: `Please summarize this web page content: ${content.substring(0, 3000)}`
                    }
                ],
                max_tokens: 100,
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate AI summary');
        }
        
        const data = await response.json();
        return data.choices[0]?.message?.content || '요약 없음';
    }
    
    throw new Error('Unsupported AI provider');
}

// generateUniqueId is now available from helpers.js

async function captureScreenshot(tabId, options = {}) {
    try {
        const screenshotService = new ScreenshotService();
        const result = await screenshotService.captureTab(tabId, options);
        
        return { success: true, data: result };
    } catch (error) {
        console.error('Error capturing screenshot:', error);
        return { success: false, error: error.message };
    }
}

async function optimizeImage(dataUrl, targetSizeKB = 100) {
    try {
        const screenshotService = new ScreenshotService();
        const optimizedImage = await screenshotService.optimizeForStorage(dataUrl, targetSizeKB);
        
        return { success: true, data: optimizedImage };
    } catch (error) {
        console.error('Error optimizing image:', error);
        return { success: false, error: error.message };
    }
}

// Functions to be injected into content scripts
function extractPageMetadata() {
    const metadata = {
        title: document.title,
        description: '',
        ogImage: null
    };
    
    // Get meta description
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
        metadata.description = descMeta.content;
    }
    
    // Get Open Graph image
    const ogImageMeta = document.querySelector('meta[property="og:image"]');
    if (ogImageMeta) {
        metadata.ogImage = ogImageMeta.content;
    }
    
    return metadata;
}

function extractPageContent() {
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style, nav, header, footer');
    scripts.forEach(el => el.remove());
    
    // Get main content
    const main = document.querySelector('main, article, .content, #content');
    if (main) {
        return main.textContent.trim();
    }
    
    // Fallback to body content
    return document.body.textContent.trim();
}

async function extractContentForSummary(tabId, options = {}) {
    try {
        // Execute content extraction in the tab
        const [result] = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: extractPageContentForAI,
            args: [options]
        });
        
        if (result && result.result) {
            return { success: true, data: result.result };
        } else {
            throw new Error('No content extracted');
        }
    } catch (error) {
        console.error('Error extracting content:', error);
        
        // Try fallback extraction
        try {
            const [fallbackResult] = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: extractBasicPageContent
            });
            
            return {
                success: true,
                data: fallbackResult.result,
                fallback: true
            };
        } catch (fallbackError) {
            return { success: false, error: error.message };
        }
    }
}

async function testAIConnection(provider, apiKey, options = {}) {
    try {
        const aiService = new AISummaryService();
        return await aiService.testConnection(provider, apiKey, options);
    } catch (error) {
        console.error('Error testing AI connection:', error);
        return { success: false, error: error.message };
    }
}

async function generateAISummaryDirect(content, options = {}) {
    try {
        const aiService = new AISummaryService();
        return await aiService.generateSummary(content, options);
    } catch (error) {
        console.error('Error generating AI summary:', error);
        return { 
            success: false, 
            error: error.message,
            fallback: '요약 생성 실패'
        };
    }
}

// Function to be injected into content script
function extractPageContentForAI(options = {}) {
    try {
        const extractor = new ContentExtractor();
        return extractor.extractFromCurrentPage(options);
    } catch (error) {
        console.error('Content extraction error:', error);
        return {
            success: false,
            error: error.message,
            fallback: extractBasicPageContent()
        };
    }
}

// Fallback content extraction function
function extractBasicPageContent() {
    try {
        let content = '';
        
        // Try to find main content
        const contentSelectors = [
            'main',
            'article', 
            '[role="main"]',
            '.content',
            '#content'
        ];
        
        let mainElement = null;
        for (const selector of contentSelectors) {
            mainElement = document.querySelector(selector);
            if (mainElement) break;
        }
        
        if (mainElement) {
            content = mainElement.textContent.trim();
        } else {
            // Fallback to body content with basic filtering
            const bodyClone = document.body.cloneNode(true);
            
            // Remove unwanted elements
            const unwantedSelectors = [
                'script', 'style', 'nav', 'header', 'footer', 'aside'
            ];
            
            unwantedSelectors.forEach(selector => {
                bodyClone.querySelectorAll(selector).forEach(el => el.remove());
            });
            
            content = bodyClone.textContent.trim();
        }
        
        // Clean and limit content
        content = content.replace(/\s+/g, ' ').trim();
        if (content.length > 5000) {
            content = content.substring(0, 5000) + '...';
        }
        
        return {
            success: true,
            content: content,
            metadata: {
                title: document.title,
                extractionMethod: 'basic',
                wordCount: content.split(/\s+/).length,
                extractedAt: Date.now()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            content: document.title || 'Content extraction failed'
        };
    }
}/**

 * Conditional AI summary generation workflow
 * 조건부 AI 요약 생성 워크플로우
 */
async function generateConditionalSummary(tabId, settings) {
    const defaultResult = {
        summary: '요약 없음',
        metadata: {
            method: 'disabled',
            reason: 'AI summary is disabled',
            timestamp: Date.now()
        }
    };

    try {
        // Check if AI summary is enabled
        if (!settings.enableAISummary) {
            return {
                ...defaultResult,
                metadata: {
                    ...defaultResult.metadata,
                    reason: 'AI summary feature is disabled in settings'
                }
            };
        }

        // Initialize AI service and check configuration
        const aiService = new AISummaryService();
        const isConfigured = await aiService.isConfigured();
        
        if (!isConfigured) {
            return {
                ...defaultResult,
                metadata: {
                    ...defaultResult.metadata,
                    method: 'unconfigured',
                    reason: 'AI service is not properly configured (missing API key or provider settings)'
                }
            };
        }

        // Extract page content for AI summarization
        console.log('Extracting content for AI summarization...');
        const contentResult = await extractContentForSummary(tabId, {
            maxLength: settings.maxContentLength || 6000,
            includeMetadata: true,
            removeBoilerplate: true,
            language: settings.preferredLanguage || 'auto'
        });

        if (!contentResult.success || !contentResult.data?.content) {
            return {
                ...defaultResult,
                metadata: {
                    ...defaultResult.metadata,
                    method: 'extraction_failed',
                    reason: 'Failed to extract content from page',
                    error: contentResult.error
                }
            };
        }

        // Check if content is suitable for summarization
        const content = contentResult.data.content;
        const wordCount = content.split(/\s+/).length;
        const minWords = settings.minWordsForSummary || 50;

        if (wordCount < minWords) {
            return {
                summary: '콘텐츠가 요약하기에 너무 짧습니다',
                metadata: {
                    method: 'content_too_short',
                    reason: `Content has only ${wordCount} words, minimum required: ${minWords}`,
                    wordCount: wordCount,
                    timestamp: Date.now()
                }
            };
        }

        // Generate AI summary
        console.log('Generating AI summary...');
        const summaryOptions = {
            maxLength: settings.summaryLength || 200,
            language: settings.preferredLanguage || 'auto',
            style: settings.summaryStyle || 'concise',
            includeKeyPoints: settings.includeKeyPoints !== false
        };

        const summaryResult = await aiService.generateSummary(content, summaryOptions);

        if (summaryResult.success) {
            console.log('AI summary generated successfully');
            return {
                summary: summaryResult.summary,
                metadata: {
                    method: 'ai_generated',
                    provider: summaryResult.provider,
                    reason: 'Successfully generated AI summary',
                    contentMetadata: contentResult.data.metadata,
                    summaryMetadata: summaryResult.metadata,
                    timestamp: Date.now()
                }
            };
        } else {
            // AI generation failed, use fallback
            console.warn('AI summary generation failed, using fallback:', summaryResult.error);
            const fallbackSummary = summaryResult.fallback || 
                                  aiService.generateFallbackSummary(content) || 
                                  '요약 생성 실패';
            
            return {
                summary: fallbackSummary,
                metadata: {
                    method: 'fallback',
                    reason: 'AI generation failed, using fallback summary',
                    error: summaryResult.error,
                    contentMetadata: contentResult.data.metadata,
                    timestamp: Date.now()
                }
            };
        }

    } catch (error) {
        console.error('Error in conditional summary generation:', error);
        
        // Try to generate a basic fallback summary
        try {
            const basicContentResult = await extractContentForSummary(tabId, { maxLength: 1000 });
            if (basicContentResult.success && basicContentResult.data?.content) {
                const aiService = new AISummaryService();
                const basicSummary = aiService.generateFallbackSummary(basicContentResult.data.content);
                
                return {
                    summary: basicSummary,
                    metadata: {
                        method: 'error_fallback',
                        reason: 'Error occurred during AI summary generation, using basic fallback',
                        error: error.message,
                        timestamp: Date.now()
                    }
                };
            }
        } catch (fallbackError) {
            console.error('Fallback summary generation also failed:', fallbackError);
        }

        return {
            ...defaultResult,
            metadata: {
                ...defaultResult.metadata,
                method: 'error',
                reason: 'Critical error during summary generation',
                error: error.message
            }
        };
    }
}

/**
 * Test AI-enabled and AI-disabled workflows
 * AI 활성화 및 비활성화 워크플로우 테스트
 */
async function testSummaryWorkflows(tabId) {
    const results = {
        aiEnabled: null,
        aiDisabled: null,
        unconfigured: null
    };

    try {
        // Test AI-enabled workflow
        const aiEnabledSettings = {
            enableAISummary: true,
            aiProvider: 'openai',
            apiKey: 'test-key',
            summaryLength: 150,
            preferredLanguage: 'auto'
        };
        
        results.aiEnabled = await generateConditionalSummary(tabId, aiEnabledSettings);

        // Test AI-disabled workflow
        const aiDisabledSettings = {
            enableAISummary: false
        };
        
        results.aiDisabled = await generateConditionalSummary(tabId, aiDisabledSettings);

        // Test unconfigured workflow
        const unconfiguredSettings = {
            enableAISummary: true,
            apiKey: '' // No API key
        };
        
        results.unconfigured = await generateConditionalSummary(tabId, unconfiguredSettings);

        return {
            success: true,
            results: results,
            timestamp: Date.now()
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            results: results
        };
    }
}

/**
 * Validate summary generation workflow
 * 요약 생성 워크플로우 검증
 */
async function validateSummaryWorkflow(settings, content) {
    const validation = {
        isValid: true,
        warnings: [],
        errors: [],
        recommendations: []
    };

    // Check AI settings
    if (settings.enableAISummary) {
        if (!settings.aiProvider) {
            validation.errors.push('AI provider not specified');
            validation.isValid = false;
        }

        if (!settings.apiKey && settings.aiProvider !== 'ollama') {
            validation.warnings.push('API key not configured - will use fallback summary');
        }

        if (settings.summaryLength && (settings.summaryLength < 50 || settings.summaryLength > 500)) {
            validation.warnings.push('Summary length should be between 50-500 characters for optimal results');
        }
    }

    // Check content suitability
    if (content) {
        const wordCount = content.split(/\s+/).length;
        
        if (wordCount < 20) {
            validation.warnings.push('Content is very short - summary may not be meaningful');
        }
        
        if (wordCount > 10000) {
            validation.warnings.push('Content is very long - may be truncated for AI processing');
        }

        // Check for non-text content indicators
        const codeBlockCount = (content.match(/```/g) || []).length / 2;
        if (codeBlockCount > 5) {
            validation.recommendations.push('Content appears to be code-heavy - consider adjusting summary style');
        }
    }

    // Performance recommendations
    if (settings.enableAISummary && settings.maxContentLength > 8000) {
        validation.recommendations.push('Consider reducing maxContentLength for faster processing');
    }

    return validation;
}