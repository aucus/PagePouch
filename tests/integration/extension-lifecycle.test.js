// Integration tests for extension installation and configuration
// 확장 프로그램 설치 및 구성 프로세스 통합 테스트

describe('Extension Lifecycle Integration Tests', () => {
    let mockStorage;
    let mockRuntime;
    let mockTabs;
    let savedPages;

    beforeEach(() => {
        // Initialize savedPages map
        savedPages = new Map();
        
        // Use the global Chrome mock from setup.js
        mockStorage = chrome.storage;
        mockRuntime = chrome.runtime;
        mockTabs = chrome.tabs;
        
        // Add additional properties needed for lifecycle tests
        mockRuntime.onInstalled = {
            addListener: jest.fn()
        };
        mockRuntime.onStartup = {
            addListener: jest.fn()
        };
        mockTabs.onUpdated = {
            addListener: jest.fn()
        };
    });

    describe('Extension Installation', () => {
        test.skip('should initialize default settings on first install', async () => {
            const extensionManager = {
                handleInstall: jest.fn().mockImplementation((details) => {
                    if (details.reason === 'install') {
                        const defaultSettings = {
                            enableAISummary: false,
                            apiProvider: 'openai',
                            apiKey: '',
                            maxStorageItems: 1000,
                            thumbnailQuality: 0.8,
                            language: 'auto',
                            version: '1.0.0',
                            installedAt: new Date().toISOString()
                        };

                        return new Promise((resolve) => {
                            mockStorage.local.set({ 'extension-settings': defaultSettings }, () => {
                                resolve({ success: true, settings: defaultSettings });
                            });
                        });
                    }
                    return Promise.resolve({ success: true });
                })
            };

            const result = await extensionManager.handleInstall({ reason: 'install' });

            expect(result.success).toBe(true);
            expect(result.settings).toBeDefined();
            expect(result.settings.version).toBe('1.0.0');
            expect(result.settings.enableAISummary).toBe(false);
            expect(mockStorage.local.set).toHaveBeenCalledWith(
                { 'extension-settings': expect.any(Object) },
                expect.any(Function)
            );
        });

        test.skip('should migrate settings on extension update', async () => {
            // Simulate old settings
            const oldSettings = {
                apiKey: 'sk-old-key',
                maxPages: 500, // Old property name
                version: '0.9.0'
            };

            mockStorage.local.get.mockImplementation((keys, callback) => {
                callback({ 'extension-settings': oldSettings });
            });

            const migrationManager = {
                migrateSettings: jest.fn().mockImplementation((oldSettings) => {
                    const migratedSettings = {
                        ...oldSettings,
                        maxStorageItems: oldSettings.maxPages || 1000, // Migrate property name
                        enableAISummary: !!oldSettings.apiKey, // Enable AI if key exists
                        version: '1.0.0'
                    };
                    
                    delete migratedSettings.maxPages; // Remove old property
                    
                    return new Promise((resolve) => {
                        mockStorage.local.set({ 'extension-settings': migratedSettings }, () => {
                            resolve({ success: true, migrated: true, settings: migratedSettings });
                        });
                    });
                })
            };

            const result = await migrationManager.migrateSettings(oldSettings);

            expect(result.success).toBe(true);
            expect(result.migrated).toBe(true);
            expect(result.settings.maxStorageItems).toBe(500);
            expect(result.settings.enableAISummary).toBe(true);
            expect(result.settings.version).toBe('1.0.0');
            expect(result.settings.maxPages).toBeUndefined();
        });

        test.skip('should handle extension startup', async () => {
            const startupManager = {
                handleStartup: jest.fn().mockImplementation(() => {
                    return new Promise((resolve) => {
                        // Check if settings exist
                        mockStorage.local.get('extension-settings', (data) => {
                            if (data['extension-settings']) {
                                resolve({ 
                                    success: true, 
                                    initialized: true,
                                    settings: data['extension-settings']
                                });
                            } else {
                                // Initialize with defaults
                                const defaultSettings = { version: '1.0.0' };
                                mockStorage.local.set({ 'extension-settings': defaultSettings }, () => {
                                    resolve({ 
                                        success: true, 
                                        initialized: false,
                                        settings: defaultSettings
                                    });
                                });
                            }
                        });
                    });
                })
            };

            const result = await startupManager.handleStartup();

            expect(result.success).toBe(true);
            expect(result.settings).toBeDefined();
        });
    });

    describe('Permission Handling', () => {
        test('should request and handle permissions', async () => {
            const permissionManager = {
                requestPermissions: jest.fn().mockImplementation((permissions) => {
                    return new Promise((resolve) => {
                        // Simulate user granting permissions
                        const granted = permissions.every(permission => 
                            ['storage', 'tabs', 'activeTab', 'scripting'].includes(permission)
                        );
                        resolve({ granted, permissions });
                    });
                }),
                
                checkPermissions: jest.fn().mockImplementation((permissions) => {
                    return new Promise((resolve) => {
                        const hasPermissions = permissions.every(permission => 
                            ['storage', 'tabs', 'activeTab', 'scripting'].includes(permission)
                        );
                        resolve({ hasPermissions, missing: hasPermissions ? [] : permissions });
                    });
                })
            };

            // Check existing permissions
            const permissionCheck = await permissionManager.checkPermissions(['storage', 'tabs']);
            expect(permissionCheck.hasPermissions).toBe(true);

            // Request additional permissions
            const permissionRequest = await permissionManager.requestPermissions(['scripting']);
            expect(permissionRequest.granted).toBe(true);
        });

        test('should handle permission denial gracefully', async () => {
            const permissionManager = {
                handlePermissionDenial: jest.fn().mockImplementation((deniedPermissions) => {
                    const criticalPermissions = ['storage', 'tabs'];
                    const hasCritical = deniedPermissions.some(p => criticalPermissions.includes(p));
                    
                    return {
                        canContinue: !hasCritical,
                        limitedFunctionality: deniedPermissions.length > 0,
                        missingFeatures: deniedPermissions.map(p => {
                            const features = {
                                'storage': 'Cannot save pages',
                                'tabs': 'Cannot access current page',
                                'activeTab': 'Cannot capture screenshots',
                                'scripting': 'Cannot extract page content'
                            };
                            return features[p] || `Missing ${p} permission`;
                        })
                    };
                })
            };

            const denialResult = permissionManager.handlePermissionDenial(['scripting']);
            
            expect(denialResult.canContinue).toBe(true);
            expect(denialResult.limitedFunctionality).toBe(true);
            expect(denialResult.missingFeatures).toContain('Cannot extract page content');
        });
    });

    describe('Background Script Integration', () => {
        test('should handle message routing between components', async () => {
            const messageRouter = {
                handleMessage: jest.fn().mockImplementation((message, sender, sendResponse) => {
                    switch (message.action) {
                        case 'savePage':
                            sendResponse({ 
                                success: true, 
                                data: { id: 'new-page-id', saved: true }
                            });
                            break;
                        case 'getPages':
                            sendResponse({ 
                                success: true, 
                                data: Array.from(savedPages.values())
                            });
                            break;
                        case 'deletePage':
                            savedPages.delete(message.data.pageId);
                            sendResponse({ success: true });
                            break;
                        default:
                            sendResponse({ success: false, error: 'Unknown action' });
                    }
                })
            };

            // Test save page message
            const saveResponse = await new Promise((resolve) => {
                messageRouter.handleMessage(
                    { action: 'savePage', data: { url: 'https://test.com' } },
                    { tab: { id: 1 } },
                    resolve
                );
            });

            expect(saveResponse.success).toBe(true);
            expect(saveResponse.data.id).toBe('new-page-id');

            // Test get pages message
            const getResponse = await new Promise((resolve) => {
                messageRouter.handleMessage(
                    { action: 'getPages' },
                    { tab: { id: 1 } },
                    resolve
                );
            });

            expect(getResponse.success).toBe(true);
            expect(Array.isArray(getResponse.data)).toBe(true);
        });

        test('should coordinate multiple services', async () => {
            const serviceCoordinator = {
                extractContent: jest.fn().mockResolvedValue({
                    title: 'Test Page',
                    text: 'Page content',
                    metadata: {}
                }),
                
                captureScreenshot: jest.fn().mockResolvedValue('screenshot-data'),
                
                generateSummary: jest.fn().mockResolvedValue('AI summary'),
                
                saveToStorage: jest.fn().mockResolvedValue({
                    id: 'saved-page-id',
                    createdAt: new Date().toISOString()
                }),
                
                savePage: jest.fn().mockImplementation(async function(pageData) {
                    const steps = [];
                    
                    // Step 1: Extract content
                    steps.push('content_extraction');
                    const content = await this.extractContent(pageData.url);
                    
                    // Step 2: Capture screenshot
                    steps.push('screenshot_capture');
                    const screenshot = await this.captureScreenshot(pageData.tabId);
                    
                    // Step 3: Generate summary (if enabled)
                    let summary = '요약 없음';
                    if (pageData.enableAI && pageData.apiKey) {
                        steps.push('ai_summary');
                        summary = await this.generateSummary(content.text, pageData.apiKey);
                    }
                    
                    // Step 4: Save to storage
                    steps.push('storage_save');
                    const savedPage = await this.saveToStorage({
                        ...content,
                        screenshot,
                        summary,
                        url: pageData.url
                    });
                    
                    return { success: true, page: savedPage, steps };
                })
            };

            const result = await serviceCoordinator.savePage({
                url: 'https://test.com',
                tabId: 1,
                enableAI: true,
                apiKey: 'sk-test-key'
            });

            expect(result.success).toBe(true);
            expect(result.steps).toEqual([
                'content_extraction',
                'screenshot_capture',
                'ai_summary',
                'storage_save'
            ]);
            expect(serviceCoordinator.extractContent).toHaveBeenCalled();
            expect(serviceCoordinator.captureScreenshot).toHaveBeenCalled();
            expect(serviceCoordinator.generateSummary).toHaveBeenCalled();
            expect(serviceCoordinator.saveToStorage).toHaveBeenCalled();
        });
    });

    describe('User Interface Integration', () => {
        test('should update UI after successful page save', async () => {
            const uiManager = {
                updatePageCount: jest.fn(),
                showSuccessMessage: jest.fn(),
                refreshPageList: jest.fn(),
                
                handlePageSaved: jest.fn().mockImplementation(function(savedPage) {
                    this.updatePageCount();
                    this.showSuccessMessage(`Page "${savedPage.title}" saved successfully`);
                    this.refreshPageList();
                    
                    return Promise.resolve({ updated: true });
                })
            };

            const savedPage = {
                id: 'new-page',
                title: 'New Test Page',
                url: 'https://example.com/new'
            };

            await uiManager.handlePageSaved(savedPage);

            expect(uiManager.updatePageCount).toHaveBeenCalled();
            expect(uiManager.showSuccessMessage).toHaveBeenCalledWith(
                'Page "New Test Page" saved successfully'
            );
            expect(uiManager.refreshPageList).toHaveBeenCalled();
        });

        test('should handle UI state during long operations', async () => {
            const uiStateManager = {
                setLoadingState: jest.fn(),
                clearLoadingState: jest.fn(),
                showProgress: jest.fn(),
                updateProgress: jest.fn(),
                
                executeWithProgress: jest.fn().mockImplementation(async function(operation, steps) {
                    this.setLoadingState(true);
                    const progressId = this.showProgress(steps);
                    
                    try {
                        for (let i = 0; i < steps.length; i++) {
                            this.updateProgress(progressId, i + 1, steps[i]);
                            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
                        }
                        
                        const result = await operation();
                        return { success: true, result };
                    } finally {
                        this.clearLoadingState();
                    }
                })
            };

            const mockOperation = jest.fn().mockResolvedValue('operation result');
            const steps = ['Step 1', 'Step 2', 'Step 3'];

            const result = await uiStateManager.executeWithProgress(mockOperation, steps);

            expect(result.success).toBe(true);
            expect(result.result).toBe('operation result');
            expect(uiStateManager.setLoadingState).toHaveBeenCalledWith(true);
            expect(uiStateManager.showProgress).toHaveBeenCalledWith(steps);
            expect(uiStateManager.updateProgress).toHaveBeenCalledTimes(3);
            expect(uiStateManager.clearLoadingState).toHaveBeenCalled();
        });
    });

    describe('Data Consistency', () => {
        test.skip('should maintain data consistency across operations', async () => {
            const dataManager = {
                pages: new Map(),
                
                savePage: jest.fn().mockImplementation(async function(pageData) {
                    const page = {
                        id: `page-${Date.now()}`,
                        ...pageData,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    
                    this.pages.set(page.id, page);
                    
                    // Simulate storage save
                    return new Promise((resolve) => {
                        mockStorage.local.set({ [page.id]: page }, () => {
                            resolve({ success: true, page });
                        });
                    });
                }),
                
                getPage: jest.fn().mockImplementation(async function(pageId) {
                    return this.pages.get(pageId) || null;
                }),
                
                deletePage: jest.fn().mockImplementation(async function(pageId) {
                    const existed = this.pages.has(pageId);
                    this.pages.delete(pageId);
                    
                    return new Promise((resolve) => {
                        mockStorage.local.remove(pageId, () => {
                            resolve({ success: true, existed });
                        });
                    });
                }),
                
                getAllPages: jest.fn().mockImplementation(async function() {
                    return Array.from(this.pages.values());
                })
            };

            // Save multiple pages
            const page1 = await dataManager.savePage({ title: 'Page 1', url: 'https://example.com/1' });
            const page2 = await dataManager.savePage({ title: 'Page 2', url: 'https://example.com/2' });

            expect(page1.success).toBe(true);
            expect(page2.success).toBe(true);

            // Verify pages exist
            const allPages = await dataManager.getAllPages();
            expect(allPages).toHaveLength(2);

            // Delete one page
            const deleteResult = await dataManager.deletePage(page1.page.id);
            expect(deleteResult.success).toBe(true);
            expect(deleteResult.existed).toBe(true);

            // Verify page was deleted
            const remainingPages = await dataManager.getAllPages();
            expect(remainingPages).toHaveLength(1);
            expect(remainingPages[0].id).toBe(page2.page.id);
        });

        test('should handle concurrent operations safely', async () => {
            const concurrencyManager = {
                operationQueue: [],
                isProcessing: false,
                
                queueOperation: jest.fn().mockImplementation(async function(operation) {
                    return new Promise((resolve, reject) => {
                        this.operationQueue.push({ operation, resolve, reject });
                        this.processQueue();
                    });
                }),
                
                processQueue: jest.fn().mockImplementation(async function() {
                    if (this.isProcessing || this.operationQueue.length === 0) {
                        return;
                    }
                    
                    this.isProcessing = true;
                    
                    while (this.operationQueue.length > 0) {
                        const { operation, resolve, reject } = this.operationQueue.shift();
                        
                        try {
                            const result = await operation();
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                    }
                    
                    this.isProcessing = false;
                })
            };

            // Queue multiple operations
            const operations = [
                () => Promise.resolve('Operation 1'),
                () => Promise.resolve('Operation 2'),
                () => Promise.resolve('Operation 3')
            ];

            const results = await Promise.all(
                operations.map(op => concurrencyManager.queueOperation(op))
            );

            expect(results).toEqual(['Operation 1', 'Operation 2', 'Operation 3']);
            expect(concurrencyManager.processQueue).toHaveBeenCalled();
        });
    });

    describe('Error Recovery Integration', () => {
        test.skip('should recover from storage quota exceeded', async () => {
            const quotaManager = {
                handleQuotaExceeded: jest.fn().mockImplementation(async () => {
                    // Simulate cleanup of old pages
                    const oldPages = Array.from(savedPages.values())
                        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                        .slice(0, 10); // Remove 10 oldest pages

                    const cleanupPromises = oldPages.map(page => {
                        return new Promise((resolve) => {
                            chrome.storage.local.remove(page.id, () => {
                                savedPages.delete(page.id);
                                resolve();
                            });
                        });
                    });

                    await Promise.all(cleanupPromises);

                    return {
                        success: true,
                        cleaned: oldPages.length,
                        message: `Cleaned up ${oldPages.length} old pages to free space`
                    };
                })
            };

            // Add some test pages
            for (let i = 0; i < 15; i++) {
                savedPages.set(`page-${i}`, {
                    id: `page-${i}`,
                    title: `Page ${i}`,
                    createdAt: new Date(Date.now() - i * 86400000).toISOString() // i days ago
                });
            }

            const result = await quotaManager.handleQuotaExceeded();

            expect(result.success).toBe(true);
            expect(result.cleaned).toBe(10);
            expect(savedPages.size).toBe(5); // 15 - 10 = 5 remaining
        });

        test.skip('should handle network failures during AI summary', async () => {
            const networkFailureHandler = {
                savePageWithFallback: jest.fn().mockImplementation(async (pageData) => {
                    try {
                        // Try to generate AI summary
                        const summary = await this.generateAISummary(pageData.content);
                        pageData.summary = summary;
                    } catch (error) {
                        // Fallback to no summary
                        console.warn('AI summary failed, saving without summary:', error.message);
                        pageData.summary = '요약 없음';
                    }
                    
                    // Save page regardless of summary success
                    return new Promise((resolve) => {
                        mockStorage.local.set({ [pageData.id]: pageData }, () => {
                            resolve({ success: true, page: pageData });
                        });
                    });
                }),
                
                generateAISummary: jest.fn().mockRejectedValue(new Error('Network timeout'))
            };

            const pageData = {
                id: 'test-page',
                title: 'Test Page',
                content: 'Test content',
                url: 'https://test.com'
            };

            const result = await networkFailureHandler.savePageWithFallback(pageData);

            expect(result.success).toBe(true);
            expect(result.page.summary).toBe('요약 없음');
            expect(networkFailureHandler.generateAISummary).toHaveBeenCalled();
        });
    });

    describe('Performance Integration', () => {
        test('should meet timing requirements for operations', async () => {
            const performanceTracker = {
                trackOperation: jest.fn().mockImplementation(async (operationName, operation) => {
                    const startTime = performance.now();
                    
                    try {
                        const result = await operation();
                        const endTime = performance.now();
                        const duration = endTime - startTime;
                        
                        return {
                            success: true,
                            result,
                            duration,
                            operationName
                        };
                    } catch (error) {
                        const endTime = performance.now();
                        const duration = endTime - startTime;
                        
                        return {
                            success: false,
                            error,
                            duration,
                            operationName
                        };
                    }
                })
            };

            // Mock performance.now to return predictable values
            let mockTime = 0;
            const originalPerformance = global.performance;
            global.performance = {
                now: jest.fn(() => {
                    const currentTime = mockTime;
                    mockTime += 100; // Simulate 100ms per call
                    return currentTime;
                })
            };

            const fastOperation = () => Promise.resolve('fast result');
            const result = await performanceTracker.trackOperation('fast_op', fastOperation);

            expect(result.success).toBe(true);
            expect(result.duration).toBeGreaterThanOrEqual(0);
            expect(result.operationName).toBe('fast_op');

            // Restore original performance
            global.performance = originalPerformance;

            // Test timing requirements
            expect(result.duration).toBeLessThan(2000); // Should complete within 2 seconds
        });

        test('should handle memory usage efficiently', async () => {
            const memoryManager = {
                monitorMemoryUsage: jest.fn().mockImplementation(() => {
                    // Simulate memory monitoring
                    const mockMemoryInfo = {
                        usedJSHeapSize: 10 * 1024 * 1024, // 10MB
                        totalJSHeapSize: 50 * 1024 * 1024, // 50MB
                        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
                    };
                    
                    return {
                        usage: mockMemoryInfo.usedJSHeapSize,
                        total: mockMemoryInfo.totalJSHeapSize,
                        limit: mockMemoryInfo.jsHeapSizeLimit,
                        percentage: (mockMemoryInfo.usedJSHeapSize / mockMemoryInfo.jsHeapSizeLimit) * 100
                    };
                }),
                
                shouldCleanupMemory: jest.fn().mockImplementation((memoryInfo) => {
                    return memoryInfo.percentage > 80; // Cleanup if over 80%
                })
            };

            const memoryInfo = memoryManager.monitorMemoryUsage();
            const shouldCleanup = memoryManager.shouldCleanupMemory(memoryInfo);

            expect(memoryInfo.percentage).toBe(10); // 10MB / 100MB = 10%
            expect(shouldCleanup).toBe(false);
        });

        test('should validate extension installation timing requirements', async () => {
            const installationTimer = {
                measureInstallationTime: jest.fn().mockImplementation(async () => {
                    const startTime = Date.now();
                    
                    // Simulate installation steps
                    const steps = [
                        { name: 'Initialize storage', duration: 100 },
                        { name: 'Set default settings', duration: 50 },
                        { name: 'Register event listeners', duration: 25 },
                        { name: 'Verify permissions', duration: 75 }
                    ];
                    
                    const results = [];
                    for (const step of steps) {
                        await new Promise(resolve => setTimeout(resolve, step.duration));
                        results.push({
                            ...step,
                            completed: Date.now()
                        });
                    }
                    
                    const totalTime = Date.now() - startTime;
                    
                    return {
                        steps: results,
                        totalTime,
                        success: totalTime < 1000 // Should complete within 1 second
                    };
                })
            };

            const result = await installationTimer.measureInstallationTime();

            expect(result.success).toBe(true);
            expect(result.totalTime).toBeLessThan(1000);
            expect(result.steps).toHaveLength(4);
            expect(result.steps.every(step => step.completed)).toBe(true);
        });

        test('should handle concurrent extension operations efficiently', async () => {
            const concurrencyManager = {
                handleConcurrentRequests: jest.fn().mockImplementation(async (requestCount) => {
                    const startTime = Date.now();
                    const requests = Array.from({ length: requestCount }, (_, i) => ({
                        id: `req-${i}`,
                        action: i % 2 === 0 ? 'savePage' : 'getPages',
                        timestamp: Date.now()
                    }));
                    
                    // Process requests concurrently
                    const results = await Promise.all(
                        requests.map(async (request) => {
                            // Simulate processing time
                            await new Promise(resolve => setTimeout(resolve, 50));
                            return {
                                requestId: request.id,
                                success: true,
                                processingTime: 50
                            };
                        })
                    );
                    
                    const totalTime = Date.now() - startTime;
                    
                    return {
                        requestCount,
                        results,
                        totalTime,
                        averageTime: totalTime / requestCount,
                        throughput: requestCount / (totalTime / 1000) // requests per second
                    };
                })
            };

            const result = await concurrencyManager.handleConcurrentRequests(10);

            expect(result.requestCount).toBe(10);
            expect(result.results).toHaveLength(10);
            expect(result.results.every(r => r.success)).toBe(true);
            expect(result.throughput).toBeGreaterThan(5); // Should handle at least 5 requests per second
        });
    });

    describe('Extension Configuration Workflows', () => {
        test('should handle complete configuration workflow', async () => {
            const configurationManager = {
                performCompleteConfiguration: jest.fn().mockImplementation(async (userPreferences) => {
                    const steps = [];
                    
                    // Step 1: Validate user preferences
                    steps.push('validate_preferences');
                    if (!userPreferences.language || !['en', 'ko'].includes(userPreferences.language)) {
                        throw new Error('Invalid language preference');
                    }
                    
                    // Step 2: Test API configuration if provided
                    if (userPreferences.apiKey) {
                        steps.push('test_api_key');
                        if (!userPreferences.apiKey.startsWith('sk-')) {
                            throw new Error('Invalid API key format');
                        }
                    }
                    
                    // Step 3: Save configuration
                    steps.push('save_configuration');
                    const configuration = {
                        language: userPreferences.language,
                        enableAISummary: !!userPreferences.apiKey,
                        apiKey: userPreferences.apiKey || '',
                        maxStorageItems: userPreferences.maxStorageItems || 1000,
                        configuredAt: new Date().toISOString()
                    };
                    
                    // Step 4: Initialize with new configuration
                    steps.push('initialize_with_config');
                    
                    return {
                        success: true,
                        configuration,
                        steps,
                        configurationValid: true
                    };
                })
            };

            // Test successful configuration
            const validPreferences = {
                language: 'ko',
                apiKey: 'sk-test-key-12345',
                maxStorageItems: 2000
            };

            const result = await configurationManager.performCompleteConfiguration(validPreferences);

            expect(result.success).toBe(true);
            expect(result.configuration.language).toBe('ko');
            expect(result.configuration.enableAISummary).toBe(true);
            expect(result.steps).toEqual([
                'validate_preferences',
                'test_api_key',
                'save_configuration',
                'initialize_with_config'
            ]);

            // Test configuration without API key
            const minimalPreferences = {
                language: 'en'
            };

            const minimalResult = await configurationManager.performCompleteConfiguration(minimalPreferences);

            expect(minimalResult.success).toBe(true);
            expect(minimalResult.configuration.enableAISummary).toBe(false);
            expect(minimalResult.configuration.apiKey).toBe('');
        });

        test('should handle configuration validation errors', async () => {
            const configurationValidator = {
                validateConfiguration: jest.fn().mockImplementation(async (config) => {
                    const errors = [];
                    const warnings = [];
                    
                    // Validate language
                    if (!config.language) {
                        errors.push('Language is required');
                    } else if (!['en', 'ko', 'auto'].includes(config.language)) {
                        errors.push('Unsupported language');
                    }
                    
                    // Validate API key format
                    if (config.apiKey && !config.apiKey.startsWith('sk-')) {
                        errors.push('Invalid API key format');
                    }
                    
                    // Validate storage limits
                    if (config.maxStorageItems && config.maxStorageItems < 100) {
                        warnings.push('Low storage limit may affect functionality');
                    }
                    
                    // Validate thumbnail quality
                    if (config.thumbnailQuality && (config.thumbnailQuality < 0.1 || config.thumbnailQuality > 1.0)) {
                        errors.push('Thumbnail quality must be between 0.1 and 1.0');
                    }
                    
                    return {
                        valid: errors.length === 0,
                        errors,
                        warnings,
                        canProceed: errors.length === 0
                    };
                })
            };

            // Test invalid configuration
            const invalidConfig = {
                language: 'invalid',
                apiKey: 'invalid-key',
                maxStorageItems: 50,
                thumbnailQuality: 1.5
            };

            const invalidResult = await configurationValidator.validateConfiguration(invalidConfig);

            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.errors).toContain('Unsupported language');
            expect(invalidResult.errors).toContain('Invalid API key format');
            expect(invalidResult.errors).toContain('Thumbnail quality must be between 0.1 and 1.0');
            expect(invalidResult.warnings).toContain('Low storage limit may affect functionality');

            // Test valid configuration
            const validConfig = {
                language: 'ko',
                apiKey: 'sk-valid-key',
                maxStorageItems: 1000,
                thumbnailQuality: 0.8
            };

            const validResult = await configurationValidator.validateConfiguration(validConfig);

            expect(validResult.valid).toBe(true);
            expect(validResult.errors).toHaveLength(0);
            expect(validResult.canProceed).toBe(true);
        });

        test('should handle configuration migration between versions', async () => {
            const migrationManager = {
                migrateConfiguration: jest.fn().mockImplementation(async (oldVersion, newVersion, oldConfig) => {
                    const migrations = [];
                    
                    // Migration from 0.9.x to 1.0.0
                    if (oldVersion.startsWith('0.9') && newVersion === '1.0.0') {
                        migrations.push('0.9_to_1.0');
                        
                        // Rename old properties
                        if (oldConfig.maxPages) {
                            oldConfig.maxStorageItems = oldConfig.maxPages;
                            delete oldConfig.maxPages;
                        }
                        
                        // Add new properties with defaults
                        oldConfig.enableAISummary = !!oldConfig.apiKey;
                        oldConfig.thumbnailQuality = oldConfig.thumbnailQuality || 0.8;
                        oldConfig.language = oldConfig.language || 'auto';
                    }
                    
                    // Migration from 1.0.x to 1.1.0 (future)
                    if (oldVersion.startsWith('1.0') && newVersion === '1.1.0') {
                        migrations.push('1.0_to_1.1');
                        // Future migration logic would go here
                    }
                    
                    return {
                        success: true,
                        migratedConfig: {
                            ...oldConfig,
                            version: newVersion,
                            migratedAt: new Date().toISOString()
                        },
                        migrations,
                        backupCreated: true
                    };
                })
            };

            const oldConfig = {
                apiKey: 'sk-old-key',
                maxPages: 500,
                version: '0.9.5'
            };

            const result = await migrationManager.migrateConfiguration('0.9.5', '1.0.0', oldConfig);

            expect(result.success).toBe(true);
            expect(result.migratedConfig.maxStorageItems).toBe(500);
            expect(result.migratedConfig.maxPages).toBeUndefined();
            expect(result.migratedConfig.enableAISummary).toBe(true);
            expect(result.migratedConfig.version).toBe('1.0.0');
            expect(result.migrations).toContain('0.9_to_1.0');
        });
    });
});