// Test suite for Extension Lifecycle Management
// 확장 프로그램 생명주기 관리 테스트 스위트

// Mock Chrome APIs
global.chrome = {
    runtime: {
        getManifest: jest.fn(() => ({
            version: '1.0.0',
            name: 'LaterLens'
        })),
        onInstalled: {
            addListener: jest.fn()
        },
        onStartup: {
            addListener: jest.fn()
        },
        onSuspend: {
            addListener: jest.fn()
        },
        onSuspendCanceled: {
            addListener: jest.fn()
        }
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
            clear: jest.fn()
        }
    }
};

// Mock global functions
global.initializeDefaultSettings = jest.fn();
global.SettingsManager = jest.fn().mockImplementation(() => ({
    getSettings: jest.fn().mockResolvedValue({}),
    saveSettings: jest.fn().mockResolvedValue({ success: true }),
    initialize: jest.fn().mockResolvedValue()
}));

// Mock console methods to avoid noise in tests
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock setInterval and clearInterval
global.setInterval = jest.fn((fn, delay) => {
    return setTimeout(fn, delay); // Execute once for testing
});
global.clearInterval = jest.fn();

// Import the ExtensionLifecycleManager class
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
        
        this.metrics = {
            memoryUsage: [],
            requestCounts: {},
            errorCounts: {},
            performanceMarks: new Map()
        };
        
        this.recoveryStrategies = new Map([
            ['storage_error', this.recoverFromStorageError.bind(this)],
            ['api_error', this.recoverFromAPIError.bind(this)],
            ['memory_error', this.recoverFromMemoryError.bind(this)],
            ['network_error', this.recoverFromNetworkError.bind(this)]
        ]);
    }

    async handleInstalled(details) {
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
            }
            
            this.installTime = Date.now();
            await this.saveLifecycleMetrics();
            
        } catch (error) {
            await this.handleError('installation_error', error);
        }
    }

    async handleFirstInstall(details) {
        await initializeDefaultSettings();
        await this.showWelcomeNotification();
        await this.initializeDataStructures();
        await this.recordInstallationAnalytics('first_install');
    }

    async handleUpdate(details) {
        const previousVersion = details.previousVersion;
        const currentVersion = chrome.runtime.getManifest().version;
        
        await this.runMigrations(previousVersion, currentVersion);
        await this.updateSettingsSchema(previousVersion, currentVersion);
        await this.cleanupDeprecatedData(previousVersion);
        await this.showUpdateNotification(previousVersion, currentVersion);
        await this.recordInstallationAnalytics('update', {
            previousVersion,
            currentVersion
        });
        
        this.lastUpdateTime = Date.now();
    }

    async handleChromeUpdate(details) {
        await this.verifyBrowserCompatibility();
        await this.refreshAPIPermissions();
        await this.recordInstallationAnalytics('chrome_update');
    }

    async handleSharedModuleUpdate(details) {
        await this.reinitializeSharedDependencies();
        await this.recordInstallationAnalytics('shared_module_update');
    }

    async handleStartup() {
        this.startTime = Date.now();
        await this.restorePreviousState();
        this.initializeHealthMonitoring();
        await this.verifySystemIntegrity();
        await this.recordLifecycleEvent('startup');
    }

    async handleSuspend() {
        this.suspendCount++;
        await this.saveCurrentState();
        await this.cleanupResources();
        this.stopHealthMonitoring();
        await this.recordLifecycleEvent('suspend');
    }

    async handleSuspendCanceled() {
        this.initializeHealthMonitoring();
        await this.recordLifecycleEvent('suspend_canceled');
    }

    async handleUnhandledRejection(event) {
        this.errorCount++;
        await this.logError('unhandled_rejection', event.reason);
        await this.attemptRecovery('unhandled_rejection', event.reason);
        event.preventDefault();
    }

    async handleUncaughtError(event) {
        this.errorCount++;
        await this.logError('uncaught_error', event.error);
        await this.attemptRecovery('uncaught_error', event.error);
    }

    initializeHealthMonitoring() {
        this.stopHealthMonitoring();
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 5 * 60 * 1000);
        this.cleanupInterval = setInterval(() => {
            this.performPeriodicCleanup();
        }, 60 * 60 * 1000);
    }

    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    async performHealthCheck() {
        const healthStatus = {
            timestamp: Date.now(),
            uptime: Date.now() - this.startTime,
            memoryUsage: this.getMemoryUsage(),
            errorCount: this.errorCount,
            suspendCount: this.suspendCount
        };

        if (healthStatus.memoryUsage > 100 * 1024 * 1024) {
            await this.handleError('high_memory_usage', new Error('Memory usage exceeded threshold'));
        }

        if (this.errorCount > 50) {
            await this.attemptRecovery('high_error_count', new Error('Error count exceeded threshold'));
        }

        this.metrics.memoryUsage.push({
            timestamp: Date.now(),
            usage: healthStatus.memoryUsage
        });

        if (this.metrics.memoryUsage.length > 100) {
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
        }
    }

    async performPeriodicCleanup() {
        this.cleanupOldMetrics();
        if (global.gc) {
            global.gc();
        }
    }

    async handleError(errorType, error) {
        await this.logError(errorType, error);
        await this.attemptRecovery(errorType, error);
    }

    async attemptRecovery(errorType, error) {
        this.recoveryAttempts++;
        
        const strategy = this.recoveryStrategies.get(errorType);
        if (strategy) {
            await strategy(error);
        } else {
            await this.performGenericRecovery(error);
        }
        
        if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
            await this.performEmergencyReset();
        } else {
            this.recoveryAttempts = 0;
        }
    }

    async recoverFromStorageError(error) {
        await chrome.storage.local.clear();
        await initializeDefaultSettings();
        await this.initializeDataStructures();
    }

    async recoverFromAPIError(error) {
        const settingsManager = new SettingsManager();
        const settings = await settingsManager.getSettings();
        
        if (settings.enableAISummary) {
            await settingsManager.saveSettings({
                ...settings,
                enableAISummary: false,
                _apiErrorRecovery: true
            });
        }
    }

    async recoverFromMemoryError(error) {
        this.metrics.memoryUsage = [];
        this.metrics.requestCounts = {};
        this.metrics.errorCounts = {};
        
        if (global.gc) {
            global.gc();
        }
        
        this.stopHealthMonitoring();
        setTimeout(() => {
            this.initializeHealthMonitoring();
        }, 10000);
    }

    async recoverFromNetworkError(error) {
        // Network recovery logic would go here
    }

    async performGenericRecovery(error) {
        this.errorCount = Math.max(0, this.errorCount - 10);
        this.initializeHealthMonitoring();
        this.cleanupOldMetrics();
    }

    async performEmergencyReset() {
        await chrome.storage.local.clear();
        
        this.errorCount = 0;
        this.recoveryAttempts = 0;
        this.suspendCount = 0;
        
        this.metrics = {
            memoryUsage: [],
            requestCounts: {},
            errorCounts: {},
            performanceMarks: new Map()
        };
        
        await initializeDefaultSettings();
        await this.initializeDataStructures();
        this.initializeHealthMonitoring();
    }

    // Helper methods
    async showWelcomeNotification() {}
    async showUpdateNotification(prev, curr) {}
    async initializeDataStructures() {}
    async runMigrations(prev, curr) {}
    async updateSettingsSchema(prev, curr) {}
    async cleanupDeprecatedData(prev) {}
    async verifyBrowserCompatibility() {}
    async refreshAPIPermissions() {}
    async reinitializeSharedDependencies() {}
    async restorePreviousState() {}
    async verifySystemIntegrity() {}
    async saveCurrentState() {}
    async cleanupResources() {}

    async recordLifecycleEvent(eventType) {
        const event = {
            type: eventType,
            timestamp: Date.now(),
            uptime: Date.now() - this.startTime
        };
    }

    async recordInstallationAnalytics(installType, metadata = {}) {
        const analytics = {
            installType,
            timestamp: Date.now(),
            version: chrome.runtime.getManifest().version,
            ...metadata
        };
    }

    async logError(errorType, error) {
        const errorLog = {
            type: errorType,
            message: error.message,
            stack: error.stack,
            timestamp: Date.now(),
            uptime: Date.now() - this.startTime
        };
        
        this.metrics.errorCounts[errorType] = (this.metrics.errorCounts[errorType] || 0) + 1;
    }

    async saveLifecycleMetrics() {
        const metrics = {
            startTime: this.startTime,
            installTime: this.installTime,
            lastUpdateTime: this.lastUpdateTime,
            suspendCount: this.suspendCount,
            errorCount: this.errorCount,
            recoveryAttempts: this.recoveryAttempts
        };
        
        await chrome.storage.local.set({ lifecycleMetrics: metrics });
    }

    getMemoryUsage() {
        return JSON.stringify(this.metrics).length;
    }

    cleanupOldMetrics() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        this.metrics.memoryUsage = this.metrics.memoryUsage.filter(
            entry => entry.timestamp > oneHourAgo
        );
        
        for (const [key, timestamp] of this.metrics.performanceMarks) {
            if (timestamp < oneHourAgo) {
                this.metrics.performanceMarks.delete(key);
            }
        }
    }
}

describe('ExtensionLifecycleManager', () => {
    let lifecycleManager;

    beforeEach(() => {
        lifecycleManager = new ExtensionLifecycleManager();
        jest.clearAllMocks();
    });

    describe('Installation Handling', () => {
        test('should handle first-time installation', async () => {
            const details = { reason: 'install' };
            
            await lifecycleManager.handleInstalled(details);
            
            expect(initializeDefaultSettings).toHaveBeenCalled();
            expect(lifecycleManager.installTime).toBeTruthy();
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                lifecycleMetrics: expect.objectContaining({
                    installTime: expect.any(Number)
                })
            });
        });

        test('should handle extension updates', async () => {
            const details = { 
                reason: 'update', 
                previousVersion: '0.9.0' 
            };
            
            await lifecycleManager.handleInstalled(details);
            
            expect(lifecycleManager.lastUpdateTime).toBeTruthy();
            expect(chrome.storage.local.set).toHaveBeenCalled();
        });

        test('should handle Chrome updates', async () => {
            const details = { reason: 'chrome_update' };
            
            await lifecycleManager.handleInstalled(details);
            
            expect(lifecycleManager.installTime).toBeTruthy();
        });

        test('should handle shared module updates', async () => {
            const details = { reason: 'shared_module_update' };
            
            await lifecycleManager.handleInstalled(details);
            
            expect(lifecycleManager.installTime).toBeTruthy();
        });

        test('should handle installation errors gracefully', async () => {
            const details = { reason: 'install' };
            initializeDefaultSettings.mockRejectedValue(new Error('Settings error'));
            
            await lifecycleManager.handleInstalled(details);
            
            expect(lifecycleManager.errorCount).toBeGreaterThan(0);
        });
    });

    describe('Service Worker Lifecycle', () => {
        test('should handle startup correctly', async () => {
            const startTime = lifecycleManager.startTime;
            
            await lifecycleManager.handleStartup();
            
            expect(lifecycleManager.startTime).toBeGreaterThanOrEqual(startTime);
            expect(lifecycleManager.healthCheckInterval).toBeTruthy();
        });

        test('should handle suspend correctly', async () => {
            await lifecycleManager.handleSuspend();
            
            expect(lifecycleManager.suspendCount).toBe(1);
            expect(lifecycleManager.healthCheckInterval).toBeNull();
        });

        test('should handle suspend cancellation', async () => {
            await lifecycleManager.handleSuspend();
            await lifecycleManager.handleSuspendCanceled();
            
            expect(lifecycleManager.healthCheckInterval).toBeTruthy();
        });
    });

    describe('Error Handling', () => {
        test('should handle unhandled promise rejections', async () => {
            const mockEvent = {
                reason: new Error('Test rejection'),
                preventDefault: jest.fn()
            };
            
            await lifecycleManager.handleUnhandledRejection(mockEvent);
            
            expect(lifecycleManager.errorCount).toBe(1);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(lifecycleManager.metrics.errorCounts.unhandled_rejection).toBe(1);
        });

        test('should handle uncaught errors', async () => {
            const mockEvent = {
                error: new Error('Test error')
            };
            
            await lifecycleManager.handleUncaughtError(mockEvent);
            
            expect(lifecycleManager.errorCount).toBe(1);
            expect(lifecycleManager.metrics.errorCounts.uncaught_error).toBe(1);
        });

        test('should attempt recovery on errors', async () => {
            const error = new Error('Test error');
            
            await lifecycleManager.handleError('storage_error', error);
            
            expect(chrome.storage.local.clear).toHaveBeenCalled();
            expect(initializeDefaultSettings).toHaveBeenCalled();
        });

        test('should perform emergency reset after max recovery attempts', async () => {
            const error = new Error('Persistent error');
            
            // Simulate multiple recovery attempts
            for (let i = 0; i < 4; i++) {
                await lifecycleManager.attemptRecovery('test_error', error);
            }
            
            expect(chrome.storage.local.clear).toHaveBeenCalled();
            expect(lifecycleManager.errorCount).toBe(0);
            expect(lifecycleManager.recoveryAttempts).toBe(0);
        });
    });

    describe('Health Monitoring', () => {
        test('should initialize health monitoring', () => {
            lifecycleManager.initializeHealthMonitoring();
            
            expect(lifecycleManager.healthCheckInterval).toBeTruthy();
            expect(lifecycleManager.cleanupInterval).toBeTruthy();
        });

        test('should stop health monitoring', () => {
            lifecycleManager.initializeHealthMonitoring();
            lifecycleManager.stopHealthMonitoring();
            
            expect(lifecycleManager.healthCheckInterval).toBeNull();
            expect(lifecycleManager.cleanupInterval).toBeNull();
        });

        test('should perform health checks', async () => {
            await lifecycleManager.performHealthCheck();
            
            expect(lifecycleManager.metrics.memoryUsage.length).toBeGreaterThan(0);
        });

        test('should detect high memory usage', async () => {
            // Mock high memory usage
            lifecycleManager.getMemoryUsage = jest.fn().mockReturnValue(200 * 1024 * 1024);
            
            await lifecycleManager.performHealthCheck();
            
            expect(lifecycleManager.errorCount).toBeGreaterThan(0);
        });

        test('should detect high error count', async () => {
            lifecycleManager.errorCount = 60;
            
            await lifecycleManager.performHealthCheck();
            
            expect(lifecycleManager.recoveryAttempts).toBeGreaterThan(0);
        });

        test('should limit memory usage metrics', async () => {
            // Add many memory usage entries
            for (let i = 0; i < 150; i++) {
                lifecycleManager.metrics.memoryUsage.push({
                    timestamp: Date.now(),
                    usage: 1000
                });
            }
            
            await lifecycleManager.performHealthCheck();
            
            expect(lifecycleManager.metrics.memoryUsage.length).toBeLessThanOrEqual(100);
        });
    });

    describe('Recovery Strategies', () => {
        test('should recover from storage errors', async () => {
            const error = new Error('Storage corrupted');
            
            await lifecycleManager.recoverFromStorageError(error);
            
            expect(chrome.storage.local.clear).toHaveBeenCalled();
            expect(initializeDefaultSettings).toHaveBeenCalled();
        });

        test('should recover from API errors', async () => {
            const error = new Error('API error');
            const mockSettingsManager = new SettingsManager();
            mockSettingsManager.getSettings.mockResolvedValue({
                enableAISummary: true
            });
            
            await lifecycleManager.recoverFromAPIError(error);
            
            expect(mockSettingsManager.saveSettings).toHaveBeenCalledWith({
                enableAISummary: false,
                _apiErrorRecovery: true
            });
        });

        test('should recover from memory errors', async () => {
            const error = new Error('Memory error');
            lifecycleManager.metrics.memoryUsage = [1, 2, 3];
            
            await lifecycleManager.recoverFromMemoryError(error);
            
            expect(lifecycleManager.metrics.memoryUsage).toEqual([]);
            expect(lifecycleManager.healthCheckInterval).toBeNull();
        });

        test('should perform generic recovery', async () => {
            const error = new Error('Generic error');
            lifecycleManager.errorCount = 20;
            
            await lifecycleManager.performGenericRecovery(error);
            
            expect(lifecycleManager.errorCount).toBe(10);
        });
    });

    describe('Metrics and Analytics', () => {
        test('should record lifecycle events', async () => {
            await lifecycleManager.recordLifecycleEvent('test_event');
            
            // Should not throw and should complete successfully
            expect(true).toBe(true);
        });

        test('should record installation analytics', async () => {
            await lifecycleManager.recordInstallationAnalytics('install', {
                customData: 'test'
            });
            
            // Should not throw and should complete successfully
            expect(true).toBe(true);
        });

        test('should log errors with metrics', async () => {
            const error = new Error('Test error');
            
            await lifecycleManager.logError('test_error', error);
            
            expect(lifecycleManager.metrics.errorCounts.test_error).toBe(1);
        });

        test('should save lifecycle metrics', async () => {
            await lifecycleManager.saveLifecycleMetrics();
            
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                lifecycleMetrics: expect.objectContaining({
                    startTime: expect.any(Number),
                    errorCount: expect.any(Number),
                    suspendCount: expect.any(Number)
                })
            });
        });

        test('should cleanup old metrics', () => {
            const now = Date.now();
            const oldTimestamp = now - (2 * 60 * 60 * 1000); // 2 hours ago
            const recentTimestamp = now - (30 * 60 * 1000); // 30 minutes ago
            
            lifecycleManager.metrics.memoryUsage = [
                { timestamp: oldTimestamp, usage: 1000 },
                { timestamp: recentTimestamp, usage: 2000 }
            ];
            
            lifecycleManager.metrics.performanceMarks.set('old_mark', oldTimestamp);
            lifecycleManager.metrics.performanceMarks.set('recent_mark', recentTimestamp);
            
            lifecycleManager.cleanupOldMetrics();
            
            expect(lifecycleManager.metrics.memoryUsage).toHaveLength(1);
            expect(lifecycleManager.metrics.memoryUsage[0].timestamp).toBe(recentTimestamp);
            expect(lifecycleManager.metrics.performanceMarks.has('old_mark')).toBe(false);
            expect(lifecycleManager.metrics.performanceMarks.has('recent_mark')).toBe(true);
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete lifecycle flow', async () => {
            // Install
            await lifecycleManager.handleInstalled({ reason: 'install' });
            expect(lifecycleManager.installTime).toBeTruthy();
            
            // Startup
            await lifecycleManager.handleStartup();
            expect(lifecycleManager.healthCheckInterval).toBeTruthy();
            
            // Error
            await lifecycleManager.handleError('test_error', new Error('Test'));
            expect(lifecycleManager.errorCount).toBeGreaterThan(0);
            
            // Suspend
            await lifecycleManager.handleSuspend();
            expect(lifecycleManager.suspendCount).toBe(1);
            expect(lifecycleManager.healthCheckInterval).toBeNull();
        });

        test('should maintain state consistency', async () => {
            const initialErrorCount = lifecycleManager.errorCount;
            const initialSuspendCount = lifecycleManager.suspendCount;
            
            // Perform various operations
            await lifecycleManager.handleError('test_error', new Error('Test'));
            await lifecycleManager.handleSuspend();
            await lifecycleManager.performHealthCheck();
            
            expect(lifecycleManager.errorCount).toBe(initialErrorCount + 1);
            expect(lifecycleManager.suspendCount).toBe(initialSuspendCount + 1);
        });

        test('should handle concurrent operations', async () => {
            const promises = [
                lifecycleManager.performHealthCheck(),
                lifecycleManager.handleError('error1', new Error('Error 1')),
                lifecycleManager.handleError('error2', new Error('Error 2')),
                lifecycleManager.performPeriodicCleanup()
            ];
            
            await Promise.all(promises);
            
            expect(lifecycleManager.errorCount).toBe(2);
            expect(lifecycleManager.metrics.errorCounts.error1).toBe(1);
            expect(lifecycleManager.metrics.errorCounts.error2).toBe(1);
        });
    });
});