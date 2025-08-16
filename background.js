// Background service worker for PagePouch Chrome extension
// 백그라운드 서비스 워커 - 확장 프로그램의 핵심 로직 처리

// Import screenshot service
importScripts('utils/screenshot.js');

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
        console.log('PagePouch lifecycle event:', details.reason);
        
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
            this.handleError('installation_error', error);
        }
    }

    /**
     * Handle first installation
     * 최초 설치 처리
     */
    async handleFirstInstall(details) {
        console.log('Welcome to PagePouch!');
        
        // Initialize default settings
        await this.initializeDefaultSettings();
        
        // Set up storage structure
        await this.setupStorageStructure();
        
        // Show welcome notification
        await this.showWelcomeNotification();
        
        // Initialize background tasks
        this.initializeBackgroundTasks();
    }

    /**
     * Handle extension update
     * 확장 프로그램 업데이트 처리
     */
    async handleUpdate(details) {
        const previousVersion = details.previousVersion;
        const currentVersion = chrome.runtime.getManifest().version;
        
        console.log(`PagePouch updated from ${previousVersion} to ${currentVersion}`);
        
        // Migrate data if needed
        await this.migrateData(previousVersion, currentVersion);
        
        // Update settings schema if needed
        await this.updateSettingsSchema(previousVersion, currentVersion);
        
        // Clear old caches
        await this.clearOldCaches();
        
        // Show update notification
        await this.showUpdateNotification(previousVersion, currentVersion);
    }

    /**
     * Handle Chrome browser update
     * Chrome 브라우저 업데이트 처리
     */
    async handleChromeUpdate(details) {
        console.log('Chrome browser updated, checking compatibility');
        
        // Check for breaking changes
        await this.checkCompatibility();
        
        // Update any browser-specific settings
        await this.updateBrowserSettings();
    }

    /**
     * Handle shared module update
     * 공유 모듈 업데이트 처리
     */
    async handleSharedModuleUpdate(details) {
        console.log('Shared module updated');
        
        // Reload any shared dependencies
        await this.reloadSharedDependencies();
    }

    /**
     * Handle extension startup
     * 확장 프로그램 시작 처리
     */
    async handleStartup() {
        console.log('PagePouch starting up');
        
        try {
            // Restore state from storage
            await this.restoreState();
            
            // Initialize background services
            await this.initializeServices();
            
            // Start health monitoring
            this.startHealthMonitoring();
            
            // Resume any pending operations
            await this.resumePendingOperations();
            
        } catch (error) {
            console.error('Error during startup:', error);
            this.handleError('startup_error', error);
        }
    }

    /**
     * Handle extension suspend
     * 확장 프로그램 일시 중단 처리
     */
    async handleSuspend() {
        console.log('PagePouch suspending');
        
        this.suspendCount++;
        
        try {
            // Save current state
            await this.saveState();
            
            // Stop background tasks
            this.stopBackgroundTasks();
            
            // Clear intervals
            this.clearIntervals();
            
            // Save metrics
            await this.saveLifecycleMetrics();
            
        } catch (error) {
            console.error('Error during suspend:', error);
        }
    }

    /**
     * Handle suspend cancellation
     * 일시 중단 취소 처리
     */
    async handleSuspendCanceled() {
        console.log('PagePouch suspend canceled');
        
        try {
            // Restart background tasks
            this.initializeBackgroundTasks();
            
            // Resume health monitoring
            this.startHealthMonitoring();
            
        } catch (error) {
            console.error('Error resuming from suspend:', error);
        }
    }

    /**
     * Handle unhandled promise rejections
     * 처리되지 않은 Promise 거부 처리
     */
    handleUnhandledRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);
        this.handleError('unhandled_rejection', event.reason);
    }

    /**
     * Handle uncaught errors
     * 처리되지 않은 오류 처리
     */
    handleUncaughtError(event) {
        console.error('Uncaught error:', event.error);
        this.handleError('uncaught_error', event.error);
    }

    /**
     * Initialize default settings
     * 기본 설정 초기화
     */
    async initializeDefaultSettings() {
        const defaultSettings = {
            version: '1.0.0',
            theme: 'auto',
            language: 'en',
            autoSave: false,
            aiSummaries: false,
            notifications: true,
            privacy: {
                privateBrowsing: false,
                analytics: true
            },
            performance: {
                concurrentSaves: 3,
                cacheDuration: 30,
                preloadContent: false
            }
        };

        try {
            await chrome.storage.sync.set({ settings: defaultSettings });
            console.log('Default settings initialized');
        } catch (error) {
            console.error('Error initializing settings:', error);
            // Fallback to local storage
            await chrome.storage.local.set({ settings: defaultSettings });
        }
    }

    /**
     * Setup storage structure
     * 저장소 구조 설정
     */
    async setupStorageStructure() {
        const storageStructure = {
            pages: [],
            tags: [],
            collections: [],
            statistics: {
                totalPages: 0,
                totalTags: 0,
                lastSync: null
            }
        };

        try {
            await chrome.storage.local.set(storageStructure);
            console.log('Storage structure initialized');
        } catch (error) {
            console.error('Error setting up storage:', error);
        }
    }

    /**
     * Show welcome notification
     * 환영 알림 표시
     */
    async showWelcomeNotification() {
        try {
            await chrome.notifications.create({
                type: 'basic',
                iconUrl: 'assets/icon48.svg',
                title: 'Welcome to PagePouch!',
                message: 'Your intelligent page saving companion is ready to use.'
            });
        } catch (error) {
            console.log('Could not show welcome notification:', error);
        }
    }

    /**
     * Show update notification
     * 업데이트 알림 표시
     */
    async showUpdateNotification(previousVersion, currentVersion) {
        try {
            await chrome.notifications.create({
                type: 'basic',
                iconUrl: 'assets/icon48.svg',
                title: 'PagePouch Updated!',
                message: `Updated from ${previousVersion} to ${currentVersion}. Check out the new features!`
            });
        } catch (error) {
            console.log('Could not show update notification:', error);
        }
    }

    /**
     * Initialize background tasks
     * 백그라운드 작업 초기화
     */
    initializeBackgroundTasks() {
        // Set up periodic cleanup
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, 24 * 60 * 60 * 1000); // Daily cleanup
        
        console.log('Background tasks initialized');
    }

    /**
     * Stop background tasks
     * 백그라운드 작업 중지
     */
    stopBackgroundTasks() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        console.log('Background tasks stopped');
    }

    /**
     * Clear intervals
     * 인터벌 정리
     */
    clearIntervals() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Initialize health monitoring
     * 상태 모니터링 초기화
     */
    initializeHealthMonitoring() {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 5 * 60 * 1000); // Every 5 minutes
        
        console.log('Health monitoring initialized');
    }

    /**
     * Start health monitoring
     * 상태 모니터링 시작
     */
    startHealthMonitoring() {
        if (!this.healthCheckInterval) {
            this.initializeHealthMonitoring();
        }
    }

    /**
     * Perform health check
     * 상태 확인 수행
     */
    async performHealthCheck() {
        try {
            // Check storage health
            await this.checkStorageHealth();
            
            // Check memory usage
            this.checkMemoryUsage();
            
            // Check for errors
            this.checkErrorRates();
            
        } catch (error) {
            console.error('Health check failed:', error);
        }
    }

    /**
     * Check storage health
     * 저장소 상태 확인
     */
    async checkStorageHealth() {
        try {
            const result = await chrome.storage.local.get(null);
            const size = JSON.stringify(result).length;
            
            if (size > 5 * 1024 * 1024) { // 5MB limit
                console.warn('Storage size is large:', size);
                await this.performStorageCleanup();
            }
        } catch (error) {
            console.error('Storage health check failed:', error);
        }
    }

    /**
     * Check memory usage
     * 메모리 사용량 확인
     */
    checkMemoryUsage() {
        if (performance.memory) {
            const memoryInfo = performance.memory;
            this.metrics.memoryUsage.push({
                timestamp: Date.now(),
                used: memoryInfo.usedJSHeapSize,
                total: memoryInfo.totalJSHeapSize,
                limit: memoryInfo.jsHeapSizeLimit
            });
            
            // Keep only last 100 entries
            if (this.metrics.memoryUsage.length > 100) {
                this.metrics.memoryUsage.shift();
            }
        }
    }

    /**
     * Check error rates
     * 오류율 확인
     */
    checkErrorRates() {
        const errorRate = this.errorCount / (Date.now() - this.startTime) * 1000;
        
        if (errorRate > 0.1) { // More than 0.1 errors per second
            console.warn('High error rate detected:', errorRate);
            this.triggerRecovery('high_error_rate');
        }
    }

    /**
     * Perform cleanup
     * 정리 작업 수행
     */
    async performCleanup() {
        try {
            // Clean old metrics
            this.cleanOldMetrics();
            
            // Clean old cache entries
            await this.cleanOldCache();
            
            // Clean old notifications
            await this.cleanOldNotifications();
            
            console.log('Cleanup completed');
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }

    /**
     * Clean old metrics
     * 오래된 메트릭 정리
     */
    cleanOldMetrics() {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        
        this.metrics.memoryUsage = this.metrics.memoryUsage.filter(
            entry => entry.timestamp > oneWeekAgo
        );
        
        // Clean old performance marks
        for (const [key, timestamp] of this.metrics.performanceMarks) {
            if (timestamp < oneWeekAgo) {
                this.metrics.performanceMarks.delete(key);
            }
        }
    }

    /**
     * Clean old cache
     * 오래된 캐시 정리
     */
    async cleanOldCache() {
        try {
            const result = await chrome.storage.local.get('cache');
            if (result.cache) {
                const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
                const cleanedCache = {};
                
                for (const [key, value] of Object.entries(result.cache)) {
                    if (value.timestamp > oneDayAgo) {
                        cleanedCache[key] = value;
                    }
                }
                
                await chrome.storage.local.set({ cache: cleanedCache });
            }
        } catch (error) {
            console.error('Cache cleanup failed:', error);
        }
    }

    /**
     * Clean old notifications
     * 오래된 알림 정리
     */
    async cleanOldNotifications() {
        try {
            const notifications = await chrome.notifications.getAll();
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            
            for (const [id, notification] of Object.entries(notifications)) {
                if (notification.timestamp && notification.timestamp < oneHourAgo) {
                    await chrome.notifications.clear(id);
                }
            }
        } catch (error) {
            console.error('Notification cleanup failed:', error);
        }
    }

    /**
     * Handle errors
     * 오류 처리
     */
    handleError(type, error) {
        this.errorCount++;
        
        console.error(`PagePouch Error (${type}):`, error);
        
        // Record error metrics
        this.metrics.errorCounts[type] = (this.metrics.errorCounts[type] || 0) + 1;
        
        // Trigger recovery if needed
        if (this.recoveryAttempts < this.maxRecoveryAttempts) {
            this.triggerRecovery(type);
        }
    }

    /**
     * Trigger recovery
     * 복구 트리거
     */
    async triggerRecovery(errorType) {
        this.recoveryAttempts++;
        
        const recoveryStrategy = this.recoveryStrategies.get(errorType);
        if (recoveryStrategy) {
            try {
                await recoveryStrategy();
                console.log(`Recovery successful for ${errorType}`);
            } catch (error) {
                console.error(`Recovery failed for ${errorType}:`, error);
            }
        }
    }

    /**
     * Recovery strategies
     * 복구 전략들
     */
    async recoverFromStorageError() {
        console.log('Attempting storage recovery...');
        // Try to reinitialize storage
        await this.setupStorageStructure();
    }

    async recoverFromAPIError() {
        console.log('Attempting API recovery...');
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    async recoverFromMemoryError() {
        console.log('Attempting memory recovery...');
        // Clear caches and metrics
        this.metrics.memoryUsage = [];
        this.metrics.performanceMarks.clear();
    }

    async recoverFromNetworkError() {
        console.log('Attempting network recovery...');
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    /**
     * Save lifecycle metrics
     * 생명주기 메트릭 저장
     */
    async saveLifecycleMetrics() {
        try {
            const metrics = {
                startTime: this.startTime,
                installTime: this.installTime,
                lastUpdateTime: this.lastUpdateTime,
                suspendCount: this.suspendCount,
                errorCount: this.errorCount,
                recoveryAttempts: this.recoveryAttempts,
                metrics: this.metrics
            };
            
            await chrome.storage.local.set({ lifecycleMetrics: metrics });
        } catch (error) {
            console.error('Error saving lifecycle metrics:', error);
        }
    }

    /**
     * Restore state
     * 상태 복원
     */
    async restoreState() {
        try {
            const result = await chrome.storage.local.get(['lifecycleMetrics', 'settings']);
            
            if (result.lifecycleMetrics) {
                this.installTime = result.lifecycleMetrics.installTime;
                this.lastUpdateTime = result.lifecycleMetrics.lastUpdateTime;
                this.suspendCount = result.lifecycleMetrics.suspendCount;
                this.errorCount = result.lifecycleMetrics.errorCount;
                this.recoveryAttempts = result.lifecycleMetrics.recoveryAttempts;
            }
            
            console.log('State restored');
        } catch (error) {
            console.error('Error restoring state:', error);
        }
    }

    /**
     * Save state
     * 상태 저장
     */
    async saveState() {
        try {
            this.lastUpdateTime = Date.now();
            await this.saveLifecycleMetrics();
            console.log('State saved');
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    /**
     * Initialize services
     * 서비스 초기화
     */
    async initializeServices() {
        // Initialize any background services here
        console.log('Services initialized');
    }

    /**
     * Resume pending operations
     * 대기 중인 작업 재개
     */
    async resumePendingOperations() {
        // Resume any pending operations here
        console.log('Pending operations resumed');
    }

    /**
     * Migrate data
     * 데이터 마이그레이션
     */
    async migrateData(previousVersion, currentVersion) {
        console.log(`Migrating data from ${previousVersion} to ${currentVersion}`);
        // Add migration logic here
    }

    /**
     * Update settings schema
     * 설정 스키마 업데이트
     */
    async updateSettingsSchema(previousVersion, currentVersion) {
        console.log(`Updating settings schema from ${previousVersion} to ${currentVersion}`);
        // Add schema update logic here
    }

    /**
     * Clear old caches
     * 오래된 캐시 정리
     */
    async clearOldCaches() {
        console.log('Clearing old caches');
        // Add cache clearing logic here
    }

    /**
     * Check compatibility
     * 호환성 확인
     */
    async checkCompatibility() {
        console.log('Checking compatibility');
        // Add compatibility check logic here
    }

    /**
     * Update browser settings
     * 브라우저 설정 업데이트
     */
    async updateBrowserSettings() {
        console.log('Updating browser settings');
        // Add browser settings update logic here
    }

    /**
     * Reload shared dependencies
     * 공유 의존성 재로드
     */
    async reloadSharedDependencies() {
        console.log('Reloading shared dependencies');
        // Add dependency reload logic here
    }

    /**
     * Perform storage cleanup
     * 저장소 정리 수행
     */
    async performStorageCleanup() {
        console.log('Performing storage cleanup');
        // Add storage cleanup logic here
    }
}

// Initialize lifecycle manager
const lifecycleManager = new ExtensionLifecycleManager();

// Event listeners
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

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    console.log('Message type:', message.type || message.action);
    console.log('Message data:', message.data);
    
    // Handle different message types (support both 'type' and 'action' fields)
    const messageType = message.type || message.action;
    
    switch (messageType) {
        case 'SAVE_PAGE':
        case 'savePage':
            handleSavePage(message.data || message, sendResponse);
            return true; // Keep message channel open for async response
            
        case 'GET_PAGES':
        case 'getPages':
            handleGetPages(sendResponse);
            return true;
            
        case 'DELETE_PAGE':
        case 'deletePage':
            handleDeletePage(message.data, sendResponse);
            return true;
            
        case 'UPDATE_PAGE':
        case 'updatePage':
            handleUpdatePage(message.data, sendResponse);
            return true;
            
        case 'UPDATE_SETTINGS':
        case 'updateSettings':
            handleUpdateSettings(message.data, sendResponse);
            return true;
            
        case 'GET_SETTINGS':
        case 'getSettings':
            handleGetSettings(sendResponse);
            return true;
            
        case 'EXTRACT_PAGE_INFO':
        case 'extractPageInfo':
            handleExtractPageInfo(sendResponse);
            return true;
            
        case 'TEST_API_KEY':
        case 'testAPIKey':
            handleTestAPIKey(message.data, sendResponse);
            return true;
            
        case 'GET_STORAGE_INFO':
        case 'getStorageInfo':
            handleGetStorageInfo(sendResponse);
            return true;
            
        case 'EXPORT_DATA':
        case 'exportData':
            handleExportData(sendResponse);
            return true;
            
        case 'IMPORT_DATA':
        case 'importData':
            handleImportData(message.data, sendResponse);
            return true;
            
        case 'CLEAR_CACHE':
        case 'clearCache':
            handleClearCache(sendResponse);
            return true;
            
        case 'CLEAR_ALL':
        case 'clearAll':
            handleClearAll(sendResponse);
            return true;
            
        case 'RESET_EXTENSION':
        case 'resetExtension':
            handleResetExtension(sendResponse);
            return true;
            
        case 'RESTORE_PAGE':
        case 'restorePage':
            handleRestorePage(message.data, sendResponse);
            return true;
            
        default:
            console.log('Unknown message type:', messageType);
            sendResponse({ success: false, error: 'Unknown message type' });
    }
});

// Handle save page request
async function handleSavePage(pageData, sendResponse) {
    try {
        console.log('Saving page:', pageData);
        
        // Get current pages
        const result = await chrome.storage.local.get('pages');
        const pages = result.pages || [];
        
        // Capture thumbnail
        let thumbnail = '';
        try {
            // Check if we have the necessary permissions
            if (!chrome.tabs || !chrome.tabs.captureVisibleTab) {
                console.warn('Screenshot capture API not available');
                thumbnail = '';
            } else {
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id) {
                console.log('Attempting to capture thumbnail for tab:', tab.id, tab.url, 'status:', tab.status);
                
                // Check if we can capture this tab
                if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://') || tab.url.startsWith('file://')) {
                    console.warn('Cannot capture screenshot from restricted URL:', tab.url);
                    thumbnail = '';
                } else {
                    // Check tab status before capture
                    if (tab.status !== 'complete') {
                        console.log('Tab not ready, waiting for completion...');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                    // Re-check tab after waiting
                    const [updatedTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!updatedTab || updatedTab.id !== tab.id) {
                        throw new Error('Tab changed during capture preparation');
                    }
                    
                    const screenshotService = new ScreenshotService();
                    
                    // Try simplified capture first
                    try {
                        console.log('Attempting direct capture...');
                        const dataUrl = await chrome.tabs.captureVisibleTab(updatedTab.windowId, {
                            format: 'png'
                        });
                        
                        if (dataUrl) {
                            thumbnail = dataUrl;
                            console.log('Direct capture successful, size:', Math.round(thumbnail.length / 1024), 'KB');
                        } else {
                            throw new Error('No data from direct capture');
                        }
                    } catch (directError) {
                        console.warn('Direct capture failed, trying service:', directError.message);
                        
                        // Fallback to service-based capture
                        const captureResult = await screenshotService.captureTab(updatedTab.id, {
                            quality: 80,
                            thumbnailWidth: 400,
                            thumbnailHeight: 300
                        });
                        
                        if (captureResult.success) {
                            thumbnail = captureResult.dataUrl;
                            console.log('Service capture successful, size:', Math.round(thumbnail.length / 1024), 'KB');
                        } else {
                            console.warn('Service capture failed:', captureResult.error);
                            thumbnail = captureResult.fallback || '';
                        }
                    }
                }
            } else {
                console.warn('No active tab found for thumbnail capture');
            }
            } // end else block for API check
        } catch (error) {
            console.error('Error capturing thumbnail:', {
                name: error.name,
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            
            // Create a simple fallback thumbnail
            try {
                const screenshotService = new ScreenshotService();
                thumbnail = screenshotService.createDefaultThumbnail({
                    thumbnailWidth: 400,
                    thumbnailHeight: 300
                });
                console.log('Fallback thumbnail created successfully');
            } catch (fallbackError) {
                console.error('Failed to create fallback thumbnail:', fallbackError);
                thumbnail = '';
            }
        }

        // Create new page object
        const newPage = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
            url: pageData.url,
            title: pageData.title,
            savedAt: Date.now(),
            isFavorite: false,
            tags: [],
            summary: '',
            thumbnail: thumbnail,
            domain: new URL(pageData.url).hostname
        };
        
        // Add to pages array
        pages.unshift(newPage);
        
        // Save back to storage
        await chrome.storage.local.set({ pages });
        
        console.log('Page saved successfully:', newPage.id);
        sendResponse({ 
            success: true, 
            message: 'Page saved successfully',
            data: newPage
        });
    } catch (error) {
        console.error('Error saving page:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle get pages request
async function handleGetPages(sendResponse) {
    try {
        const result = await chrome.storage.local.get('pages');
        const pages = result.pages || [];
        
        sendResponse({ success: true, data: pages });
    } catch (error) {
        console.error('Error getting pages:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle delete page request
async function handleDeletePage(data, sendResponse) {
    try {
        // Handle both direct pageId and data object
        const pageId = typeof data === 'string' ? data : data?.id;
        const permanent = data?.permanent || false;
        
        console.log('Deleting page:', pageId, 'permanent:', permanent);
        
        if (!pageId) {
            throw new Error('Page ID is required');
        }
        
        // Get current pages
        const result = await chrome.storage.local.get('pages');
        const pages = result.pages || [];
        
        // Find and remove the page
        const pageIndex = pages.findIndex(page => page.id === pageId);
        if (pageIndex === -1) {
            throw new Error('Page not found');
        }
        
        // Store the deleted page for potential restoration
        const deletedPage = pages[pageIndex];
        
        // Remove from pages array
        pages.splice(pageIndex, 1);
        
        // Save back to storage
        await chrome.storage.local.set({ pages });
        
        console.log('Page deleted successfully:', pageId);
        sendResponse({ 
            success: true, 
            message: 'Page deleted successfully',
            deletedPage: deletedPage
        });
    } catch (error) {
        console.error('Error deleting page:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle restore page request
async function handleRestorePage(pageData, sendResponse) {
    try {
        console.log('Restoring page:', pageData);
        
        if (!pageData || !pageData.id) {
            throw new Error('Page data is required');
        }
        
        // Get current pages
        const result = await chrome.storage.local.get('pages');
        const pages = result.pages || [];
        
        // Check if page already exists
        const existingPageIndex = pages.findIndex(page => page.id === pageData.id);
        if (existingPageIndex !== -1) {
            throw new Error('Page already exists');
        }
        
        // Add the restored page
        pages.push(pageData);
        
        // Save back to storage
        await chrome.storage.local.set({ pages });
        
        console.log('Page restored successfully:', pageData.id);
        sendResponse({ 
            success: true, 
            message: 'Page restored successfully'
        });
    } catch (error) {
        console.error('Error restoring page:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle update page request
async function handleUpdatePage(pageData, sendResponse) {
    try {
        console.log('Updating page:', pageData);
        
        // Get current pages
        const result = await chrome.storage.local.get('pages');
        const pages = result.pages || [];
        
        // Find and update the page
        const pageIndex = pages.findIndex(page => page.id === pageData.id);
        if (pageIndex === -1) {
            throw new Error('Page not found');
        }
        
        // Update the page with new data
        pages[pageIndex] = { ...pages[pageIndex], ...pageData };
        
        // Save back to storage
        await chrome.storage.local.set({ pages });
        
        sendResponse({ success: true, message: 'Page updated successfully' });
    } catch (error) {
        console.error('Error updating page:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle update settings request
async function handleUpdateSettings(settings, sendResponse) {
    try {
        await chrome.storage.sync.set({ settings });
        console.log('Settings updated:', settings);
        
        sendResponse({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle get settings request
async function handleGetSettings(sendResponse) {
    try {
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings || {};
        
        sendResponse({ success: true, data: settings });
    } catch (error) {
        console.error('Error getting settings:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle extract page info request
async function handleExtractPageInfo(sendResponse) {
    try {
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error('No active tab found');
        }
        
        // Send message to content script to extract page info
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'getPageInfo'
        });
        
        if (response && response.success) {
            sendResponse({ success: true, data: response.data });
        } else {
            throw new Error(response?.error || 'Failed to extract page info');
        }
        
    } catch (error) {
        console.error('Error extracting page info:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle test API key request
async function handleTestAPIKey(data, sendResponse) {
    try {
        const { apiKey, provider } = data;
        
        if (!apiKey || !provider) {
            throw new Error('API key and provider are required');
        }
        
        console.log(`Testing ${provider} API key...`);
        
        let testResult = false;
        let errorMessage = '';
        
        try {
            switch (provider) {
                case 'openai':
                    testResult = await testOpenAIKey(apiKey);
                    break;
                case 'anthropic':
                    testResult = await testAnthropicKey(apiKey);
                    break;
                case 'gemini':
                    testResult = await testGeminiKey(apiKey);
                    break;
                default:
                    throw new Error('Unsupported AI provider');
            }
        } catch (apiError) {
            console.error(`${provider} API test error:`, apiError);
            errorMessage = apiError.message || 'Network error occurred';
            testResult = false;
        }
        
        if (testResult) {
            sendResponse({ 
                success: true, 
                message: 'API connection successful!'
            });
        } else {
            sendResponse({ 
                success: false, 
                error: errorMessage || 'API test failed - please check your API key'
            });
        }
        
    } catch (error) {
        console.error('Error testing API key:', error);
        sendResponse({ 
            success: false, 
            error: error.message
        });
    }
}

// Test OpenAI API key
async function testOpenAIKey(apiKey) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            console.log('OpenAI API test successful');
            return true;
        } else {
            const errorText = await response.text();
            console.error('OpenAI API test failed:', response.status, errorText);
            throw new Error(`API test failed: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('OpenAI API test failed:', error);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout - please check your internet connection');
        }
        throw error;
    }
}

// Test Anthropic API key
async function testAnthropicKey(apiKey) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 5,
                messages: [
                    {
                        role: 'user',
                        content: 'Hi'
                    }
                ]
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            console.log('Anthropic API test successful');
            return true;
        } else {
            const errorText = await response.text();
            console.error('Anthropic API test failed:', response.status, errorText);
            throw new Error(`API test failed: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Anthropic API test failed:', error);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout - please check your internet connection');
        }
        throw error;
    }
}

// Test Google Gemini API key
async function testGeminiKey(apiKey) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // First try to list models to validate API key
        const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            console.log('Gemini API test successful - found models:', modelsData.models?.length || 0);
            return true;
        } else {
            const errorText = await modelsResponse.text();
            console.error('Gemini API test failed:', modelsResponse.status, errorText);
            
            // Parse error message if possible
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error && errorData.error.message) {
                    throw new Error(`API test failed: ${errorData.error.message}`);
                }
            } catch (parseError) {
                // If parsing fails, use the status text
            }
            
            throw new Error(`API test failed: ${modelsResponse.status} ${modelsResponse.statusText}`);
        }
    } catch (error) {
        console.error('Gemini API test failed:', error);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout - please check your internet connection');
        }
        throw error;
    }
}

// Handle get storage info request
async function handleGetStorageInfo(sendResponse) {
    try {
        // Get all storage data
        const result = await chrome.storage.local.get(null);
        const jsonString = JSON.stringify(result);
        const storageUsed = new Blob([jsonString]).size;
        
        // Get page count
        const pages = result.pages || [];
        const pageCount = pages.length;
        
        // Storage quota (Chrome extension limit is usually around 5MB for local storage)
        const storageQuota = 5 * 1024 * 1024; // 5MB
        
        sendResponse({
            success: true,
            data: {
                pageCount,
                storageUsed,
                storageQuota
            }
        });
        
    } catch (error) {
        console.error('Error getting storage info:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle export data request
async function handleExportData(sendResponse) {
    try {
        // Get all data from storage
        const localData = await chrome.storage.local.get(null);
        const syncData = await chrome.storage.sync.get(null);
        
        const exportData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            local: localData,
            sync: syncData
        };
        
        sendResponse({
            success: true,
            data: exportData
        });
        
    } catch (error) {
        console.error('Error exporting data:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle import data request
async function handleImportData(importData, sendResponse) {
    try {
        if (!importData || !importData.local) {
            throw new Error('Invalid import data format');
        }
        
        // Restore local storage data
        if (importData.local) {
            await chrome.storage.local.clear();
            await chrome.storage.local.set(importData.local);
        }
        
        // Restore sync storage data
        if (importData.sync) {
            await chrome.storage.sync.clear();
            await chrome.storage.sync.set(importData.sync);
        }
        
        sendResponse({
            success: true,
            message: 'Data imported successfully'
        });
        
    } catch (error) {
        console.error('Error importing data:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle clear cache request
async function handleClearCache(sendResponse) {
    try {
        // Remove cache-related data
        const result = await chrome.storage.local.get(null);
        const keysToRemove = Object.keys(result).filter(key => 
            key.includes('cache') || key.includes('temp')
        );
        
        if (keysToRemove.length > 0) {
            await chrome.storage.local.remove(keysToRemove);
        }
        
        sendResponse({
            success: true,
            message: 'Cache cleared successfully'
        });
        
    } catch (error) {
        console.error('Error clearing cache:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle clear all data request
async function handleClearAll(sendResponse) {
    try {
        // Clear all storage
        await chrome.storage.local.clear();
        await chrome.storage.sync.clear();
        
        // Reinitialize default settings
        await lifecycleManager.initializeDefaultSettings();
        await lifecycleManager.setupStorageStructure();
        
        sendResponse({
            success: true,
            message: 'All data cleared successfully'
        });
        
    } catch (error) {
        console.error('Error clearing all data:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle reset extension request
async function handleResetExtension(sendResponse) {
    try {
        // Clear all data
        await handleClearAll(() => {});
        
        // Reset lifecycle manager
        lifecycleManager.errorCount = 0;
        lifecycleManager.recoveryAttempts = 0;
        lifecycleManager.suspendCount = 0;
        
        sendResponse({
            success: true,
            message: 'Extension reset successfully'
        });
        
    } catch (error) {
        console.error('Error resetting extension:', error);
        sendResponse({ success: false, error: error.message });
    }
}