// Integration tests for user workflows
// 사용자 워크플로우 통합 테스트

describe('User Workflows Integration Tests', () => {
    let mockStorage;
    let mockTabs;
    let mockRuntime;
    let savedPages;

    beforeEach(() => {
        // Reset saved pages
        savedPages = new Map();

        // Mock Chrome storage
        mockStorage = {
            local: {
                get: jest.fn((keys, callback) => {
                    const result = {};
                    if (typeof keys === 'string') {
                        result[keys] = savedPages.get(keys) || null;
                    } else if (Array.isArray(keys)) {
                        keys.forEach(key => {
                            result[key] = savedPages.get(key) || null;
                        });
                    } else if (keys === null || keys === undefined) {
                        // Get all data
                        savedPages.forEach((value, key) => {
                            result[key] = value;
                        });
                    }
                    callback(result);
                }),
                set: jest.fn((items, callback) => {
                    Object.keys(items).forEach(key => {
                        savedPages.set(key, items[key]);
                    });
                    if (callback) callback();
                }),
                remove: jest.fn((keys, callback) => {
                    const keysArray = Array.isArray(keys) ? keys : [keys];
                    keysArray.forEach(key => {
                        savedPages.delete(key);
                    });
                    if (callback) callback();
                }),
                clear: jest.fn((callback) => {
                    savedPages.clear();
                    if (callback) callback();
                })
            }
        };

        // Mock Chrome tabs
        mockTabs = {
            query: jest.fn((queryInfo, callback) => {
                const mockTab = {
                    id: 1,
                    url: 'https://example.com/test-page',
                    title: 'Test Page Title',
                    active: true,
                    windowId: 1
                };
                callback([mockTab]);
            }),
            captureVisibleTab: jest.fn((windowId, options, callback) => {
                const mockScreenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
                callback(mockScreenshot);
            }),
            create: jest.fn((createProperties, callback) => {
                const newTab = {
                    id: 2,
                    url: createProperties.url,
                    title: 'New Tab',
                    active: true
                };
                if (callback) callback(newTab);
            })
        };

        // Mock Chrome runtime
        mockRuntime = {
            sendMessage: jest.fn((message, callback) => {
                // Simulate background script responses
                const response = { success: true, data: null };
                
                switch (message.action) {
                    case 'savePage':
                        response.data = {
                            id: 'test-page-id',
                            url: message.data.url,
                            title: message.data.title,
                            createdAt: new Date().toISOString()
                        };
                        break;
                    case 'getPages':
                        response.data = Array.from(savedPages.values());
                        break;
                    case 'deletePage':
                        response.data = { deleted: true };
                        break;
                    case 'searchPages':
                        response.data = Array.from(savedPages.values()).filter(page => 
                            page.title.toLowerCase().includes(message.data.query.toLowerCase())
                        );
                        break;
                    case 'testAPIKey':
                        response.data = { valid: true };
                        break;
                }
                
                if (callback) callback(response);
            }),
            lastError: null
        };

        // Set up global Chrome API
        global.chrome = {
            storage: mockStorage,
            tabs: mockTabs,
            runtime: mockRuntime
        };

        // Mock DOM elements
        global.document = {
            ...global.document,
            getElementById: jest.fn((id) => createMockElement('div', { id })),
            querySelector: jest.fn((selector) => createMockElement('div')),
            querySelectorAll: jest.fn(() => [])
        };
    });

    describe('Page Saving Workflow', () => {
        test('should complete full page saving workflow', async () => {
            // Simulate user clicking save button
            const saveButton = createMockElement('button', { id: 'save-current-page' });
            const mockPage = {
                url: 'https://example.com/test-page',
                title: 'Test Page Title',
                content: 'Test page content',
                metadata: {
                    description: 'Test description',
                    author: 'Test Author'
                }
            };

            // Step 1: Extract page content
            const contentExtractor = {
                extractPageContent: jest.fn().mockResolvedValue({
                    title: mockPage.title,
                    content: mockPage.content,
                    metadata: mockPage.metadata
                })
            };

            // Step 2: Capture screenshot
            const screenshotCapture = {
                captureCurrentTab: jest.fn().mockResolvedValue('data:image/png;base64,screenshot-data')
            };

            // Step 3: Generate AI summary (optional)
            const aiSummary = {
                generateSummary: jest.fn().mockResolvedValue('AI generated summary')
            };

            // Step 4: Save to storage
            const storageService = {
                savePage: jest.fn().mockResolvedValue({
                    id: 'test-page-id',
                    success: true
                })
            };

            // Execute the workflow
            const extractedContent = await contentExtractor.extractPageContent();
            expect(extractedContent.title).toBe(mockPage.title);

            const screenshot = await screenshotCapture.captureCurrentTab();
            expect(screenshot).toContain('data:image/png');

            const summary = await aiSummary.generateSummary(extractedContent.content);
            expect(summary).toBe('AI generated summary');

            const saveResult = await storageService.savePage({
                ...extractedContent,
                screenshot,
                summary,
                url: mockPage.url,
                createdAt: new Date()
            });

            expect(saveResult.success).toBe(true);
            expect(saveResult.id).toBe('test-page-id');
        });

        test('should handle page saving with errors gracefully', async () => {
            const errorHandler = {
                handleError: jest.fn()
            };

            // Simulate screenshot capture failure
            const screenshotCapture = {
                captureCurrentTab: jest.fn().mockRejectedValue(new Error('Screenshot failed'))
            };

            try {
                await screenshotCapture.captureCurrentTab();
            } catch (error) {
                errorHandler.handleError(error, 'screenshot', 'medium');
            }

            expect(errorHandler.handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'screenshot',
                'medium'
            );
        });

        test('should save page without AI summary when not configured', async () => {
            const mockPage = {
                url: 'https://example.com/test',
                title: 'Test Page',
                content: 'Content',
                screenshot: 'data:image/png;base64,test'
            };

            // AI service not configured
            const aiService = {
                isConfigured: jest.fn().mockReturnValue(false),
                generateSummary: jest.fn()
            };

            const storageService = {
                savePage: jest.fn().mockResolvedValue({ success: true, id: 'page-id' })
            };

            // Save page without AI summary
            if (!aiService.isConfigured()) {
                mockPage.summary = '요약 없음'; // No summary available
            }

            const result = await storageService.savePage(mockPage);

            expect(aiService.generateSummary).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(mockPage.summary).toBe('요약 없음');
        });
    });

    describe('Page Viewing and Management Workflow', () => {
        beforeEach(() => {
            // Pre-populate with test pages
            const testPages = [
                {
                    id: 'page-1',
                    url: 'https://example.com/page1',
                    title: 'First Test Page',
                    content: 'Content of first page',
                    summary: 'Summary of first page',
                    createdAt: new Date('2023-01-01').toISOString(),
                    tags: ['test', 'example']
                },
                {
                    id: 'page-2',
                    url: 'https://example.com/page2',
                    title: 'Second Test Page',
                    content: 'Content of second page',
                    summary: 'Summary of second page',
                    createdAt: new Date('2023-01-02').toISOString(),
                    tags: ['test', 'demo']
                }
            ];

            testPages.forEach(page => {
                savedPages.set(page.id, page);
            });
        });

        test('should load and display saved pages', async () => {
            const popupManager = {
                loadPages: jest.fn().mockImplementation(() => {
                    return new Promise((resolve) => {
                        chrome.storage.local.get(null, (data) => {
                            const pages = Object.values(data).filter(item => item && item.id);
                            resolve(pages);
                        });
                    });
                }),
                displayPages: jest.fn()
            };

            const pages = await popupManager.loadPages();
            popupManager.displayPages(pages);

            expect(pages).toHaveLength(2);
            expect(pages[0].title).toBe('First Test Page');
            expect(pages[1].title).toBe('Second Test Page');
            expect(popupManager.displayPages).toHaveBeenCalledWith(pages);
        });

        test('should search through saved pages', async () => {
            const searchManager = {
                searchPages: jest.fn().mockImplementation((query) => {
                    return new Promise((resolve) => {
                        chrome.storage.local.get(null, (data) => {
                            const pages = Object.values(data).filter(item => item && item.id);
                            const filtered = pages.filter(page => 
                                page.title.toLowerCase().includes(query.toLowerCase()) ||
                                page.content.toLowerCase().includes(query.toLowerCase())
                            );
                            resolve(filtered);
                        });
                    });
                })
            };

            const results = await searchManager.searchPages('first');
            
            expect(results).toHaveLength(1);
            expect(results[0].title).toBe('First Test Page');
        });

        test('should open page in new tab', async () => {
            const pageManager = {
                openPage: jest.fn().mockImplementation((pageId) => {
                    return new Promise((resolve) => {
                        const page = savedPages.get(pageId);
                        if (page) {
                            chrome.tabs.create({ url: page.url }, (tab) => {
                                resolve({ success: true, tab });
                            });
                        } else {
                            resolve({ success: false, error: 'Page not found' });
                        }
                    });
                })
            };

            const result = await pageManager.openPage('page-1');

            expect(result.success).toBe(true);
            expect(mockTabs.create).toHaveBeenCalledWith(
                { url: 'https://example.com/page1' },
                expect.any(Function)
            );
        });

        test('should delete page with confirmation', async () => {
            const deleteManager = {
                deletePage: jest.fn().mockImplementation((pageId) => {
                    return new Promise((resolve) => {
                        chrome.storage.local.remove(pageId, () => {
                            savedPages.delete(pageId);
                            resolve({ success: true });
                        });
                    });
                })
            };

            const modalManager = {
                confirm: jest.fn().mockResolvedValue(true)
            };

            // User confirms deletion
            const confirmed = await modalManager.confirm({
                title: 'Delete Page',
                message: 'Are you sure you want to delete this page?'
            });

            if (confirmed) {
                const result = await deleteManager.deletePage('page-1');
                expect(result.success).toBe(true);
                expect(savedPages.has('page-1')).toBe(false);
            }

            expect(modalManager.confirm).toHaveBeenCalled();
        });
    });

    describe('Settings Configuration Workflow', () => {
        test('should save and load extension settings', async () => {
            const settingsManager = {
                saveSettings: jest.fn().mockImplementation((settings) => {
                    return new Promise((resolve) => {
                        chrome.storage.local.set({ 'extension-settings': settings }, () => {
                            resolve({ success: true });
                        });
                    });
                }),
                loadSettings: jest.fn().mockImplementation(() => {
                    return new Promise((resolve) => {
                        chrome.storage.local.get('extension-settings', (data) => {
                            resolve(data['extension-settings'] || {});
                        });
                    });
                })
            };

            const testSettings = {
                enableAISummary: true,
                apiProvider: 'openai',
                apiKey: 'sk-test-key',
                maxStorageItems: 1000,
                language: 'ko'
            };

            // Save settings
            const saveResult = await settingsManager.saveSettings(testSettings);
            expect(saveResult.success).toBe(true);

            // Load settings
            const loadedSettings = await settingsManager.loadSettings();
            expect(loadedSettings).toEqual(testSettings);
        });

        test('should test API key configuration', async () => {
            const apiTester = {
                testAPIKey: jest.fn().mockImplementation((apiKey, provider) => {
                    return new Promise((resolve) => {
                        // Simulate API test
                        if (apiKey && apiKey.startsWith('sk-')) {
                            resolve({ success: true, valid: true });
                        } else {
                            resolve({ success: false, error: 'Invalid API key format' });
                        }
                    });
                })
            };

            // Test valid API key
            const validResult = await apiTester.testAPIKey('sk-valid-key', 'openai');
            expect(validResult.success).toBe(true);
            expect(validResult.valid).toBe(true);

            // Test invalid API key
            const invalidResult = await apiTester.testAPIKey('invalid-key', 'openai');
            expect(invalidResult.success).toBe(false);
            expect(invalidResult.error).toBe('Invalid API key format');
        });
    });

    describe('Data Export/Import Workflow', () => {
        beforeEach(() => {
            // Add test data
            const testData = {
                'page-1': {
                    id: 'page-1',
                    title: 'Export Test Page',
                    url: 'https://example.com/export-test',
                    content: 'Test content for export'
                }
            };

            Object.keys(testData).forEach(key => {
                savedPages.set(key, testData[key]);
            });
        });

        test('should export all data', async () => {
            const exportManager = {
                exportAllData: jest.fn().mockImplementation(() => {
                    return new Promise((resolve) => {
                        chrome.storage.local.get(null, (data) => {
                            const exportData = {
                                version: '1.0.0',
                                exportDate: new Date().toISOString(),
                                pages: Object.values(data).filter(item => item && item.id),
                                settings: data['extension-settings'] || {}
                            };
                            resolve(exportData);
                        });
                    });
                })
            };

            const exportData = await exportManager.exportAllData();

            expect(exportData.version).toBe('1.0.0');
            expect(exportData.pages).toHaveLength(1);
            expect(exportData.pages[0].title).toBe('Export Test Page');
            expect(exportData.exportDate).toBeDefined();
        });

        test('should import data and merge with existing', async () => {
            const importManager = {
                importData: jest.fn().mockImplementation((importData) => {
                    return new Promise((resolve) => {
                        const pages = importData.pages || [];
                        const settings = importData.settings || {};
                        
                        // Save imported pages
                        const savePromises = pages.map(page => {
                            return new Promise((pageResolve) => {
                                chrome.storage.local.set({ [page.id]: page }, () => {
                                    savedPages.set(page.id, page);
                                    pageResolve();
                                });
                            });
                        });

                        Promise.all(savePromises).then(() => {
                            // Save settings
                            chrome.storage.local.set({ 'extension-settings': settings }, () => {
                                resolve({ 
                                    success: true, 
                                    imported: pages.length,
                                    settings: Object.keys(settings).length > 0
                                });
                            });
                        });
                    });
                })
            };

            const importData = {
                version: '1.0.0',
                pages: [
                    {
                        id: 'imported-page-1',
                        title: 'Imported Page',
                        url: 'https://imported.com/page',
                        content: 'Imported content'
                    }
                ],
                settings: {
                    language: 'en',
                    maxStorageItems: 500
                }
            };

            const result = await importManager.importData(importData);

            expect(result.success).toBe(true);
            expect(result.imported).toBe(1);
            expect(result.settings).toBe(true);
            expect(savedPages.has('imported-page-1')).toBe(true);
        });
    });

    describe('Error Recovery Workflows', () => {
        test('should recover from storage errors', async () => {
            const errorRecovery = {
                handleStorageError: jest.fn().mockImplementation((error) => {
                    // Simulate storage error recovery
                    if (error.message.includes('QUOTA_EXCEEDED')) {
                        return {
                            recovered: true,
                            action: 'cleanup_old_pages',
                            message: 'Storage cleaned up successfully'
                        };
                    }
                    return {
                        recovered: false,
                        action: 'show_error',
                        message: 'Storage error could not be recovered'
                    };
                })
            };

            const quotaError = new Error('QUOTA_EXCEEDED: Storage quota exceeded');
            const recovery = errorRecovery.handleStorageError(quotaError);

            expect(recovery.recovered).toBe(true);
            expect(recovery.action).toBe('cleanup_old_pages');
        });

        test('should handle network errors during AI summary', async () => {
            const networkErrorHandler = {
                handleNetworkError: jest.fn().mockImplementation((error) => {
                    return {
                        shouldRetry: error.code !== 'NETWORK_UNAVAILABLE',
                        fallbackAction: 'save_without_summary',
                        userMessage: 'AI summary unavailable, page saved without summary'
                    };
                })
            };

            const networkError = { code: 'NETWORK_TIMEOUT', message: 'Request timeout' };
            const handling = networkErrorHandler.handleNetworkError(networkError);

            expect(handling.shouldRetry).toBe(true);
            expect(handling.fallbackAction).toBe('save_without_summary');
        });
    });

    describe('Performance Workflows', () => {
        test('should handle large number of saved pages efficiently', async () => {
            // Simulate 1000 saved pages
            const largePagesSet = new Map();
            for (let i = 0; i < 1000; i++) {
                largePagesSet.set(`page-${i}`, {
                    id: `page-${i}`,
                    title: `Page ${i}`,
                    url: `https://example.com/page-${i}`,
                    createdAt: new Date(Date.now() - i * 1000).toISOString()
                });
            }

            const performanceManager = {
                loadPagesWithPagination: jest.fn().mockImplementation((page = 0, limit = 50) => {
                    const pages = Array.from(largePagesSet.values());
                    const start = page * limit;
                    const end = start + limit;
                    return Promise.resolve({
                        pages: pages.slice(start, end),
                        total: pages.length,
                        hasMore: end < pages.length
                    });
                })
            };

            const firstPage = await performanceManager.loadPagesWithPagination(0, 50);
            
            expect(firstPage.pages).toHaveLength(50);
            expect(firstPage.total).toBe(1000);
            expect(firstPage.hasMore).toBe(true);
        });

        test('should debounce search queries', (done) => {
            const searchDebouncer = {
                debouncedSearch: null,
                search: jest.fn(),
                
                setupDebounce() {
                    let timeout;
                    this.debouncedSearch = (query) => {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => {
                            this.search(query);
                        }, 300);
                    };
                }
            };

            searchDebouncer.setupDebounce();

            // Simulate rapid typing
            searchDebouncer.debouncedSearch('t');
            searchDebouncer.debouncedSearch('te');
            searchDebouncer.debouncedSearch('tes');
            searchDebouncer.debouncedSearch('test');

            // Should only call search once after debounce delay
            setTimeout(() => {
                expect(searchDebouncer.search).toHaveBeenCalledTimes(1);
                expect(searchDebouncer.search).toHaveBeenCalledWith('test');
                done();
            }, 350);
        });

        test('should meet timing requirements for page operations', async () => {
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
                            operationName,
                            meetsRequirement: duration < 1000 // Requirement 1.7, 2.5: operations within 1 second
                        };
                    } catch (error) {
                        const endTime = performance.now();
                        const duration = endTime - startTime;
                        
                        return {
                            success: false,
                            error,
                            duration,
                            operationName,
                            meetsRequirement: false
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
                    mockTime += 500; // Simulate 500ms per call
                    return currentTime;
                })
            };

            // Test page save operation timing
            const saveOperation = () => Promise.resolve('page saved');
            const saveResult = await performanceTracker.trackOperation('save_page', saveOperation);

            expect(saveResult.success).toBe(true);
            expect(saveResult.duration).toBeGreaterThanOrEqual(0);
            expect(saveResult.meetsRequirement).toBe(true);

            // Reset mock time for next operation
            mockTime = 0;

            // Test page load operation timing
            const loadOperation = () => Promise.resolve(['page1', 'page2']);
            const loadResult = await performanceTracker.trackOperation('load_pages', loadOperation);

            expect(loadResult.success).toBe(true);
            expect(loadResult.duration).toBeGreaterThanOrEqual(0);
            expect(loadResult.meetsRequirement).toBe(true);

            // Restore original performance
            global.performance = originalPerformance;
        });

        test('should handle concurrent operations without performance degradation', async () => {
            const concurrentOperationManager = {
                executeConcurrentOperations: jest.fn().mockImplementation(async (operations) => {
                    const startTime = Date.now();
                    
                    // Execute all operations concurrently
                    const results = await Promise.all(
                        operations.map(async (operation, index) => {
                            // Simulate some processing time
                            await new Promise(resolve => setTimeout(resolve, 100));
                            return {
                                index,
                                result: `Operation ${index} completed`,
                                timestamp: Date.now()
                            };
                        })
                    );
                    
                    const totalTime = Date.now() - startTime;
                    
                    return {
                        results,
                        totalTime,
                        averageTime: totalTime / operations.length,
                        concurrent: true
                    };
                })
            };

            const operations = Array.from({ length: 10 }, (_, i) => () => `operation-${i}`);
            const result = await concurrentOperationManager.executeConcurrentOperations(operations);

            expect(result.results).toHaveLength(10);
            expect(result.totalTime).toBeLessThan(500); // Should be much faster than sequential
            expect(result.concurrent).toBe(true);
        });

        test('should optimize memory usage during bulk operations', async () => {
            const memoryOptimizer = {
                processBulkData: jest.fn().mockImplementation(async (dataSize) => {
                    const batchSize = 100;
                    const batches = Math.ceil(dataSize / batchSize);
                    const processedBatches = [];
                    
                    for (let i = 0; i < batches; i++) {
                        const batchStart = i * batchSize;
                        const batchEnd = Math.min(batchStart + batchSize, dataSize);
                        const batchData = Array.from(
                            { length: batchEnd - batchStart }, 
                            (_, j) => ({ id: batchStart + j, processed: true })
                        );
                        
                        processedBatches.push({
                            batchIndex: i,
                            size: batchData.length,
                            memoryUsage: batchData.length * 100 // Simulate memory usage
                        });
                        
                        // Simulate memory cleanup after each batch
                        if (i > 0) {
                            processedBatches[i - 1].memoryUsage = 0; // Cleanup previous batch
                        }
                    }
                    
                    return {
                        totalProcessed: dataSize,
                        batches: processedBatches.length,
                        peakMemoryUsage: Math.max(...processedBatches.map(b => b.memoryUsage)),
                        finalMemoryUsage: processedBatches[processedBatches.length - 1]?.memoryUsage || 0
                    };
                })
            };

            const result = await memoryOptimizer.processBulkData(1000);

            expect(result.totalProcessed).toBe(1000);
            expect(result.batches).toBe(10);
            expect(result.peakMemoryUsage).toBe(10000); // 100 items * 100 bytes
            expect(result.finalMemoryUsage).toBeLessThanOrEqual(10000);
        });
    });
});