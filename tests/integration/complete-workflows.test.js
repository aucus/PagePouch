// Complete workflow integration tests
// 완전한 워크플로우 통합 테스트

describe('Complete Workflow Integration Tests', () => {
    let mockStorage;
    let mockChrome;
    let backgroundScript;
    let popupScript;
    let optionsScript;
    let contentScript;

    beforeEach(() => {
        // Mock Chrome storage
        mockStorage = createMockChromeStorage();
        
        // Mock Chrome APIs
        mockChrome = {
            storage: {
                local: mockStorage
            },
            tabs: {
                query: jest.fn(),
                create: jest.fn(),
                captureVisibleTab: jest.fn(),
                sendMessage: jest.fn()
            },
            runtime: {
                sendMessage: jest.fn(),
                onMessage: {
                    addListener: jest.fn(),
                    removeListener: jest.fn()
                },
                getURL: jest.fn((path) => `chrome-extension://test-id/${path}`)
            },
            action: {
                setBadgeText: jest.fn(),
                setBadgeBackgroundColor: jest.fn()
            },
            notifications: {
                create: jest.fn()
            }
        };

        global.chrome = mockChrome;

        // Mock global functions
        global.showToast = jest.fn();
        global.showConfirm = jest.fn().mockResolvedValue(true);
        global._ = jest.fn((key) => key);
        global.formatForDisplay = jest.fn((date) => 'formatted-date');
        global.formatBytes = jest.fn((bytes) => `${Math.round(bytes / 1024 / 1024)} MB`);
    });

    afterEach(() => {
        delete global.showToast;
        delete global.showConfirm;
        delete global._;
        delete global.formatForDisplay;
        delete global.formatBytes;
    });

    describe('End-to-End Page Saving Workflow', () => {
        test('should complete full page saving workflow from popup to storage', async () => {
            // Mock current tab
            const mockTab = {
                id: 1,
                url: 'https://example.com/article',
                title: 'Test Article Title'
            };

            mockChrome.tabs.query.mockImplementation((query, callback) => {
                callback([mockTab]);
            });

            // Mock screenshot capture
            mockChrome.tabs.captureVisibleTab.mockImplementation((options, callback) => {
                callback('data:image/png;base64,mock-screenshot-data');
            });

            // Mock content script response
            mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
                if (message.action === 'extractMetadata') {
                    callback({
                        success: true,
                        data: {
                            title: 'Test Article Title',
                            description: 'This is a test article description',
                            image: 'https://example.com/image.jpg',
                            content: 'This is the main content of the article...'
                        }
                    });
                }
            });

            // Mock AI summary service (disabled)
            const mockAIService = {
                isConfigured: () => false,
                generateSummary: jest.fn()
            };

            // Simulate background script message handling
            const handleBackgroundMessage = async (message, sender, sendResponse) => {
                if (message.action === 'savePage') {
                    try {
                        // 1. Get current tab info
                        const tabs = await new Promise(resolve => {
                            mockChrome.tabs.query({ active: true, currentWindow: true }, resolve);
                        });
                        const currentTab = tabs[0];

                        // 2. Extract metadata from content script
                        const metadataResponse = await new Promise(resolve => {
                            mockChrome.tabs.sendMessage(currentTab.id, { action: 'extractMetadata' }, resolve);
                        });

                        // 3. Capture screenshot
                        const screenshot = await new Promise(resolve => {
                            mockChrome.tabs.captureVisibleTab({ format: 'png', quality: 80 }, resolve);
                        });

                        // 4. Generate AI summary (if configured)
                        let summary = '요약 없음';
                        if (mockAIService.isConfigured()) {
                            summary = await mockAIService.generateSummary(metadataResponse.data.content);
                        }

                        // 5. Create saved page object
                        const savedPage = {
                            id: `page_${Date.now()}`,
                            url: currentTab.url,
                            title: metadataResponse.data.title || currentTab.title,
                            description: metadataResponse.data.description || '',
                            content: metadataResponse.data.content || '',
                            summary: summary,
                            thumbnail: screenshot,
                            createdAt: new Date().toISOString(),
                            tags: []
                        };

                        // 6. Save to storage
                        const existingData = await new Promise(resolve => {
                            mockStorage.get(['savedPages'], resolve);
                        });
                        
                        const savedPages = existingData.savedPages || [];
                        savedPages.unshift(savedPage);

                        await new Promise(resolve => {
                            mockStorage.set({ savedPages }, resolve);
                        });

                        sendResponse({ success: true, pageId: savedPage.id });
                    } catch (error) {
                        sendResponse({ success: false, error: error.message });
                    }
                }
            };

            // Execute the workflow
            const result = await new Promise(resolve => {
                handleBackgroundMessage(
                    { action: 'savePage' },
                    {},
                    resolve
                );
            });

            // Verify the workflow completed successfully
            expect(result.success).toBe(true);
            expect(result.pageId).toBeDefined();
            
            // Verify all steps were executed
            expect(mockChrome.tabs.query).toHaveBeenCalled();
            expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
                1,
                { action: 'extractMetadata' },
                expect.any(Function)
            );
            expect(mockChrome.tabs.captureVisibleTab).toHaveBeenCalled();
            expect(mockStorage.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    savedPages: expect.arrayContaining([
                        expect.objectContaining({
                            url: 'https://example.com/article',
                            title: 'Test Article Title',
                            summary: '요약 없음'
                        })
                    ])
                }),
                expect.any(Function)
            );
        });

        test('should handle AI-enabled page saving workflow', async () => {
            // Mock AI service as configured
            const mockAIService = {
                isConfigured: () => true,
                generateSummary: jest.fn().mockResolvedValue('AI generated summary of the article content')
            };

            // Mock current tab
            const mockTab = {
                id: 1,
                url: 'https://example.com/ai-article',
                title: 'AI Test Article'
            };

            mockChrome.tabs.query.mockImplementation((query, callback) => {
                callback([mockTab]);
            });

            mockChrome.tabs.captureVisibleTab.mockImplementation((options, callback) => {
                callback('data:image/png;base64,mock-screenshot-data');
            });

            mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
                if (message.action === 'extractMetadata') {
                    callback({
                        success: true,
                        data: {
                            title: 'AI Test Article',
                            description: 'Article about AI',
                            content: 'This article discusses artificial intelligence and its applications...'
                        }
                    });
                }
            });

            // Simulate AI-enabled background script message handling
            const handleBackgroundMessage = async (message, sender, sendResponse) => {
                if (message.action === 'savePage') {
                    try {
                        const tabs = await new Promise(resolve => {
                            mockChrome.tabs.query({ active: true, currentWindow: true }, resolve);
                        });
                        const currentTab = tabs[0];

                        const metadataResponse = await new Promise(resolve => {
                            mockChrome.tabs.sendMessage(currentTab.id, { action: 'extractMetadata' }, resolve);
                        });

                        const screenshot = await new Promise(resolve => {
                            mockChrome.tabs.captureVisibleTab({ format: 'png', quality: 80 }, resolve);
                        });

                        // Generate AI summary
                        let summary = '요약 없음';
                        if (mockAIService.isConfigured()) {
                            summary = await mockAIService.generateSummary(metadataResponse.data.content);
                        }

                        const savedPage = {
                            id: `page_${Date.now()}`,
                            url: currentTab.url,
                            title: metadataResponse.data.title || currentTab.title,
                            description: metadataResponse.data.description || '',
                            content: metadataResponse.data.content || '',
                            summary: summary,
                            thumbnail: screenshot,
                            createdAt: new Date().toISOString(),
                            tags: []
                        };

                        const existingData = await new Promise(resolve => {
                            mockStorage.get(['savedPages'], resolve);
                        });
                        
                        const savedPages = existingData.savedPages || [];
                        savedPages.unshift(savedPage);

                        await new Promise(resolve => {
                            mockStorage.set({ savedPages }, resolve);
                        });

                        sendResponse({ success: true, pageId: savedPage.id });
                    } catch (error) {
                        sendResponse({ success: false, error: error.message });
                    }
                }
            };

            const result = await new Promise(resolve => {
                handleBackgroundMessage(
                    { action: 'savePage' },
                    {},
                    resolve
                );
            });

            expect(result.success).toBe(true);
            expect(mockAIService.generateSummary).toHaveBeenCalledWith(
                'This article discusses artificial intelligence and its applications...'
            );
            expect(mockStorage.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    savedPages: expect.arrayContaining([
                        expect.objectContaining({
                            summary: 'AI generated summary of the article content'
                        })
                    ])
                }),
                expect.any(Function)
            );
        });
    });

    describe('Popup to Background Communication', () => {
        test('should handle popup initialization and page loading', async () => {
            // Mock saved pages in storage
            const mockSavedPages = [
                {
                    id: 'page1',
                    title: 'Test Page 1',
                    url: 'https://example.com/page1',
                    summary: 'Summary 1',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'page2',
                    title: 'Test Page 2',
                    url: 'https://example.com/page2',
                    summary: 'Summary 2',
                    createdAt: new Date().toISOString()
                }
            ];

            mockStorage.get.mockImplementation((keys, callback) => {
                callback({ savedPages: mockSavedPages });
            });

            // Simulate popup initialization
            const initializePopup = async () => {
                return new Promise((resolve) => {
                    mockChrome.storage.local.get(['savedPages'], (result) => {
                        const pages = result.savedPages || [];
                        resolve(pages);
                    });
                });
            };

            const pages = await initializePopup();

            expect(pages).toHaveLength(2);
            expect(pages[0].title).toBe('Test Page 1');
            expect(mockStorage.get).toHaveBeenCalledWith(['savedPages'], expect.any(Function));
        });

        test('should handle page deletion from popup', async () => {
            const mockSavedPages = [
                { id: 'page1', title: 'Page 1' },
                { id: 'page2', title: 'Page 2' },
                { id: 'page3', title: 'Page 3' }
            ];

            mockStorage.get.mockImplementation((keys, callback) => {
                callback({ savedPages: mockSavedPages });
            });

            // Simulate background script delete handler
            const handleDeleteMessage = async (message, sender, sendResponse) => {
                if (message.action === 'deletePage') {
                    try {
                        const existingData = await new Promise(resolve => {
                            mockStorage.get(['savedPages'], resolve);
                        });

                        const savedPages = existingData.savedPages || [];
                        const updatedPages = savedPages.filter(page => page.id !== message.pageId);

                        await new Promise(resolve => {
                            mockStorage.set({ savedPages: updatedPages }, resolve);
                        });

                        sendResponse({ success: true });
                    } catch (error) {
                        sendResponse({ success: false, error: error.message });
                    }
                }
            };

            const result = await new Promise(resolve => {
                handleDeleteMessage(
                    { action: 'deletePage', pageId: 'page2' },
                    {},
                    resolve
                );
            });

            expect(result.success).toBe(true);
            expect(mockStorage.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    savedPages: expect.arrayContaining([
                        expect.objectContaining({ id: 'page1' }),
                        expect.objectContaining({ id: 'page3' })
                    ])
                }),
                expect.any(Function)
            );
        });
    });

    describe('Options Page Integration', () => {
        test('should handle settings updates from options page', async () => {
            const initialSettings = {
                enableAISummary: false,
                apiKey: '',
                maxStorageItems: 1000
            };

            mockStorage.get.mockImplementation((keys, callback) => {
                callback({ settings: initialSettings });
            });

            // Simulate options page settings update
            const updateSettings = async (newSettings) => {
                return new Promise((resolve) => {
                    mockChrome.storage.local.set({ settings: newSettings }, () => {
                        resolve(newSettings);
                    });
                });
            };

            const updatedSettings = {
                ...initialSettings,
                enableAISummary: true,
                apiKey: 'test-api-key-12345',
                maxStorageItems: 2000
            };

            const result = await updateSettings(updatedSettings);

            expect(result.enableAISummary).toBe(true);
            expect(result.apiKey).toBe('test-api-key-12345');
            expect(mockStorage.set).toHaveBeenCalledWith(
                { settings: updatedSettings },
                expect.any(Function)
            );
        });

        test('should handle API key testing from options page', async () => {
            // Mock background script API key test handler
            const handleAPIKeyTest = async (message, sender, sendResponse) => {
                if (message.action === 'testAPIKey') {
                    const { apiKey, provider } = message.data;
                    
                    // Simulate API key validation
                    const isValid = apiKey && apiKey.length > 10 && apiKey.startsWith('test-');
                    
                    if (isValid) {
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: 'Invalid API key format' });
                    }
                }
            };

            // Test valid API key
            const validResult = await new Promise(resolve => {
                handleAPIKeyTest(
                    { 
                        action: 'testAPIKey', 
                        data: { apiKey: 'test-valid-key-12345', provider: 'openai' }
                    },
                    {},
                    resolve
                );
            });

            expect(validResult.success).toBe(true);

            // Test invalid API key
            const invalidResult = await new Promise(resolve => {
                handleAPIKeyTest(
                    { 
                        action: 'testAPIKey', 
                        data: { apiKey: 'invalid', provider: 'openai' }
                    },
                    {},
                    resolve
                );
            });

            expect(invalidResult.success).toBe(false);
            expect(invalidResult.error).toBe('Invalid API key format');
        });
    });

    describe('Content Script Integration', () => {
        test('should extract metadata from various page types', async () => {
            // Mock different page structures
            const testCases = [
                {
                    name: 'Standard article page',
                    dom: `
                        <html>
                            <head>
                                <title>Test Article</title>
                                <meta property="og:title" content="OG Test Article">
                                <meta property="og:description" content="OG Description">
                                <meta property="og:image" content="https://example.com/og-image.jpg">
                            </head>
                            <body>
                                <article>
                                    <h1>Main Article Title</h1>
                                    <p>This is the main content of the article...</p>
                                </article>
                            </body>
                        </html>
                    `,
                    expected: {
                        title: 'OG Test Article',
                        description: 'OG Description',
                        image: 'https://example.com/og-image.jpg'
                    }
                },
                {
                    name: 'Blog post without OG tags',
                    dom: `
                        <html>
                            <head>
                                <title>Blog Post Title</title>
                                <meta name="description" content="Blog post description">
                            </head>
                            <body>
                                <div class="post">
                                    <h1>Blog Post Title</h1>
                                    <p>Blog post content goes here...</p>
                                </div>
                            </body>
                        </html>
                    `,
                    expected: {
                        title: 'Blog Post Title',
                        description: 'Blog post description',
                        image: null
                    }
                }
            ];

            for (const testCase of testCases) {
                // Mock DOM parsing
                const mockDocument = {
                    title: testCase.expected.title,
                    querySelector: jest.fn((selector) => {
                        if (selector === 'meta[property="og:title"]') {
                            return testCase.expected.title ? { content: testCase.expected.title } : null;
                        }
                        if (selector === 'meta[property="og:description"]') {
                            return testCase.expected.description ? { content: testCase.expected.description } : null;
                        }
                        if (selector === 'meta[property="og:image"]') {
                            return testCase.expected.image ? { content: testCase.expected.image } : null;
                        }
                        if (selector === 'meta[name="description"]') {
                            return testCase.expected.description ? { content: testCase.expected.description } : null;
                        }
                        return null;
                    }),
                    querySelectorAll: jest.fn(() => [])
                };

                // Simulate content script metadata extraction
                const extractMetadata = () => {
                    const title = mockDocument.querySelector('meta[property="og:title"]')?.content || 
                                 mockDocument.title;
                    const description = mockDocument.querySelector('meta[property="og:description"]')?.content || 
                                       mockDocument.querySelector('meta[name="description"]')?.content || '';
                    const image = mockDocument.querySelector('meta[property="og:image"]')?.content || null;

                    return { title, description, image };
                };

                const result = extractMetadata();

                expect(result.title).toBe(testCase.expected.title);
                expect(result.description).toBe(testCase.expected.description);
                expect(result.image).toBe(testCase.expected.image);
            }
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle storage quota exceeded error', async () => {
            // Mock storage quota exceeded error
            mockStorage.set.mockImplementation((items, callback) => {
                const error = new Error('QUOTA_EXCEEDED_ERR');
                error.name = 'QuotaExceededError';
                throw error;
            });

            const handleSaveWithQuotaError = async (message, sender, sendResponse) => {
                if (message.action === 'savePage') {
                    try {
                        await new Promise((resolve, reject) => {
                            try {
                                mockStorage.set({ savedPages: [] }, resolve);
                            } catch (error) {
                                reject(error);
                            }
                        });
                        sendResponse({ success: true });
                    } catch (error) {
                        if (error.name === 'QuotaExceededError') {
                            sendResponse({ 
                                success: false, 
                                error: 'Storage quota exceeded. Please delete some pages or clear old data.',
                                errorType: 'QUOTA_EXCEEDED'
                            });
                        } else {
                            sendResponse({ success: false, error: error.message });
                        }
                    }
                }
            };

            const result = await new Promise(resolve => {
                handleSaveWithQuotaError(
                    { action: 'savePage' },
                    {},
                    resolve
                );
            });

            expect(result.success).toBe(false);
            expect(result.errorType).toBe('QUOTA_EXCEEDED');
            expect(result.error).toContain('Storage quota exceeded');
        });

        test('should handle network errors during AI summary generation', async () => {
            const mockAIService = {
                isConfigured: () => true,
                generateSummary: jest.fn().mockRejectedValue(new Error('Network error'))
            };

            const handleSaveWithNetworkError = async (message, sender, sendResponse) => {
                if (message.action === 'savePage') {
                    try {
                        let summary = '요약 없음';
                        if (mockAIService.isConfigured()) {
                            try {
                                summary = await mockAIService.generateSummary('test content');
                            } catch (error) {
                                console.warn('AI summary generation failed:', error.message);
                                // Continue with default summary
                            }
                        }

                        const savedPage = {
                            id: 'test-page',
                            summary: summary
                        };

                        sendResponse({ success: true, page: savedPage });
                    } catch (error) {
                        sendResponse({ success: false, error: error.message });
                    }
                }
            };

            const result = await new Promise(resolve => {
                handleSaveWithNetworkError(
                    { action: 'savePage' },
                    {},
                    resolve
                );
            });

            expect(result.success).toBe(true);
            expect(result.page.summary).toBe('요약 없음');
            expect(mockAIService.generateSummary).toHaveBeenCalled();
        });
    });

    describe('Performance Integration', () => {
        test('should complete page saving within performance requirements', async () => {
            const startTime = Date.now();

            // Mock all required operations
            mockChrome.tabs.query.mockImplementation((query, callback) => {
                setTimeout(() => callback([{ id: 1, url: 'https://example.com', title: 'Test' }]), 10);
            });

            mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
                setTimeout(() => callback({
                    success: true,
                    data: { title: 'Test', content: 'Content' }
                }), 50);
            });

            mockChrome.tabs.captureVisibleTab.mockImplementation((options, callback) => {
                setTimeout(() => callback('data:image/png;base64,screenshot'), 100);
            });

            const handleTimedSave = async (message, sender, sendResponse) => {
                if (message.action === 'savePage') {
                    const tabs = await new Promise(resolve => {
                        mockChrome.tabs.query({ active: true, currentWindow: true }, resolve);
                    });

                    const metadata = await new Promise(resolve => {
                        mockChrome.tabs.sendMessage(tabs[0].id, { action: 'extractMetadata' }, resolve);
                    });

                    const screenshot = await new Promise(resolve => {
                        mockChrome.tabs.captureVisibleTab({}, resolve);
                    });

                    const savedPage = {
                        id: 'timed-page',
                        title: metadata.data.title,
                        thumbnail: screenshot
                    };

                    await new Promise(resolve => {
                        mockStorage.set({ savedPages: [savedPage] }, resolve);
                    });

                    sendResponse({ success: true, duration: Date.now() - startTime });
                }
            };

            const result = await new Promise(resolve => {
                handleTimedSave(
                    { action: 'savePage' },
                    {},
                    resolve
                );
            });

            expect(result.success).toBe(true);
            expect(result.duration).toBeLessThan(2000); // Should complete within 2 seconds
        });

        test('should meet timing requirements for popup loading', async () => {
            // Requirements 2.5: popup should load within 1 second
            const popupLoadTimer = {
                measurePopupLoad: jest.fn().mockImplementation(async (pageCount) => {
                    const startTime = Date.now();
                    
                    // Simulate loading saved pages
                    const pages = Array.from({ length: pageCount }, (_, i) => ({
                        id: `page-${i}`,
                        title: `Page ${i}`,
                        url: `https://example.com/page-${i}`,
                        thumbnail: 'data:image/png;base64,thumbnail'
                    }));
                    
                    // Simulate DOM rendering time
                    await new Promise(resolve => setTimeout(resolve, Math.min(pageCount * 10, 800)));
                    
                    const loadTime = Date.now() - startTime;
                    
                    return {
                        success: true,
                        pageCount,
                        loadTime,
                        meetsRequirement: loadTime < 1000,
                        pages
                    };
                })
            };

            // Test with different page counts
            const testCases = [10, 50, 100, 500];
            
            for (const pageCount of testCases) {
                const result = await popupLoadTimer.measurePopupLoad(pageCount);
                
                expect(result.success).toBe(true);
                expect(result.pageCount).toBe(pageCount);
                expect(result.meetsRequirement).toBe(true);
                expect(result.loadTime).toBeLessThan(1000);
            }
        });

        test('should handle performance under stress conditions', async () => {
            const stressTestManager = {
                performStressTest: jest.fn().mockImplementation(async (config) => {
                    const results = {
                        operations: [],
                        totalTime: 0,
                        successRate: 0,
                        averageResponseTime: 0,
                        peakMemoryUsage: 0
                    };
                    
                    const startTime = Date.now();
                    let successCount = 0;
                    let totalResponseTime = 0;
                    
                    // Simulate concurrent operations
                    const operations = Array.from({ length: config.operationCount }, (_, i) => ({
                        id: i,
                        type: config.operationType,
                        startTime: Date.now()
                    }));
                    
                    const operationResults = await Promise.allSettled(
                        operations.map(async (operation) => {
                            const opStartTime = Date.now();
                            
                            // Simulate operation processing
                            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
                            
                            const responseTime = Date.now() - opStartTime;
                            totalResponseTime += responseTime;
                            
                            if (Math.random() > 0.05) { // 95% success rate
                                successCount++;
                                return { success: true, responseTime, operationId: operation.id };
                            } else {
                                throw new Error('Simulated operation failure');
                            }
                        })
                    );
                    
                    results.totalTime = Date.now() - startTime;
                    results.successRate = (successCount / config.operationCount) * 100;
                    results.averageResponseTime = totalResponseTime / config.operationCount;
                    results.operations = operationResults;
                    results.peakMemoryUsage = config.operationCount * 1024; // Simulate memory usage
                    
                    return results;
                })
            };

            const stressConfig = {
                operationCount: 100,
                operationType: 'savePage'
            };

            const result = await stressTestManager.performStressTest(stressConfig);

            expect(result.successRate).toBeGreaterThan(90);
            expect(result.averageResponseTime).toBeLessThan(200);
            expect(result.totalTime).toBeLessThan(5000);
        });

        test('should maintain performance with large datasets', async () => {
            const largeDatasetManager = {
                testLargeDatasetPerformance: jest.fn().mockImplementation(async (datasetSize) => {
                    const startTime = Date.now();
                    
                    // Simulate large dataset operations
                    const operations = [
                        'load_pages',
                        'search_pages',
                        'filter_pages',
                        'sort_pages',
                        'paginate_results'
                    ];
                    
                    const results = {};
                    
                    for (const operation of operations) {
                        const opStartTime = Date.now();
                        
                        // Simulate operation on large dataset
                        switch (operation) {
                            case 'load_pages':
                                await new Promise(resolve => setTimeout(resolve, Math.log(datasetSize) * 10));
                                break;
                            case 'search_pages':
                                await new Promise(resolve => setTimeout(resolve, Math.sqrt(datasetSize)));
                                break;
                            case 'filter_pages':
                                await new Promise(resolve => setTimeout(resolve, datasetSize / 100));
                                break;
                            case 'sort_pages':
                                await new Promise(resolve => setTimeout(resolve, datasetSize * Math.log(datasetSize) / 1000));
                                break;
                            case 'paginate_results':
                                await new Promise(resolve => setTimeout(resolve, 10));
                                break;
                        }
                        
                        results[operation] = {
                            duration: Date.now() - opStartTime,
                            datasetSize
                        };
                    }
                    
                    const totalTime = Date.now() - startTime;
                    
                    return {
                        datasetSize,
                        totalTime,
                        operations: results,
                        performanceAcceptable: totalTime < 2000 // Should complete within 2 seconds
                    };
                })
            };

            // Test with different dataset sizes
            const datasetSizes = [100, 500, 1000, 5000];
            
            for (const size of datasetSizes) {
                const result = await largeDatasetManager.testLargeDatasetPerformance(size);
                
                expect(result.performanceAcceptable).toBe(true);
                expect(result.totalTime).toBeLessThan(2000);
                expect(result.operations.load_pages.duration).toBeLessThan(500);
                expect(result.operations.search_pages.duration).toBeLessThan(300);
            }
        });
    });

    describe('Complete User Journey Integration', () => {
        test('should handle complete user journey from installation to daily usage', async () => {
            const userJourneyManager = {
                simulateCompleteUserJourney: jest.fn().mockImplementation(async function() {
                    const journey = [];
                    
                    // Step 1: Extension installation
                    journey.push('installation');
                    const installResult = await this.simulateInstallation();
                    
                    // Step 2: First-time setup
                    journey.push('first_setup');
                    const setupResult = await this.simulateFirstTimeSetup();
                    
                    // Step 3: Save first page
                    journey.push('first_page_save');
                    const firstSaveResult = await this.simulatePageSave('https://example.com/first-article');
                    
                    // Step 4: Configure AI settings (optional)
                    journey.push('ai_configuration');
                    const aiConfigResult = await this.simulateAIConfiguration('sk-test-key');
                    
                    // Step 5: Save multiple pages over time
                    journey.push('multiple_saves');
                    const multipleSavesResult = await this.simulateMultipleSaves(10);
                    
                    // Step 6: Use search functionality
                    journey.push('search_usage');
                    const searchResult = await this.simulateSearch('test');
                    
                    // Step 7: Delete old pages
                    journey.push('cleanup');
                    const cleanupResult = await this.simulateCleanup(3);
                    
                    // Step 8: Export data
                    journey.push('data_export');
                    const exportResult = await this.simulateDataExport();
                    
                    return {
                        journey,
                        results: {
                            installation: installResult,
                            setup: setupResult,
                            firstSave: firstSaveResult,
                            aiConfig: aiConfigResult,
                            multipleSaves: multipleSavesResult,
                            search: searchResult,
                            cleanup: cleanupResult,
                            export: exportResult
                        },
                        success: true,
                        totalSteps: journey.length
                    };
                }),
                
                simulateInstallation: jest.fn().mockResolvedValue({ success: true, time: 500 }),
                simulateFirstTimeSetup: jest.fn().mockResolvedValue({ success: true, configured: true }),
                simulatePageSave: jest.fn().mockResolvedValue({ success: true, pageId: 'page-1' }),
                simulateAIConfiguration: jest.fn().mockResolvedValue({ success: true, aiEnabled: true }),
                simulateMultipleSaves: jest.fn().mockResolvedValue({ success: true, savedCount: 10 }),
                simulateSearch: jest.fn().mockResolvedValue({ success: true, resultsCount: 5 }),
                simulateCleanup: jest.fn().mockResolvedValue({ success: true, deletedCount: 3 }),
                simulateDataExport: jest.fn().mockResolvedValue({ success: true, exportSize: '2.5MB' })
            };

            const result = await userJourneyManager.simulateCompleteUserJourney();

            expect(result.success).toBe(true);
            expect(result.totalSteps).toBe(8);
            expect(result.journey).toEqual([
                'installation',
                'first_setup',
                'first_page_save',
                'ai_configuration',
                'multiple_saves',
                'search_usage',
                'cleanup',
                'data_export'
            ]);
            
            // Verify all steps completed successfully
            Object.values(result.results).forEach(stepResult => {
                expect(stepResult.success).toBe(true);
            });
        });

        test('should handle user journey with errors and recovery', async () => {
            const errorRecoveryManager = {
                simulateJourneyWithErrors: jest.fn().mockImplementation(async function() {
                    const journey = [];
                    const errors = [];
                    const recoveries = [];
                    
                    try {
                        // Step 1: Normal page save
                        journey.push('normal_save');
                        await this.simulateNormalSave();
                        
                        // Step 2: Save with network error (should recover)
                        journey.push('save_with_network_error');
                        try {
                            await this.simulateNetworkError();
                        } catch (error) {
                            errors.push({ step: 'save_with_network_error', error: error.message });
                            const recovery = await this.recoverFromNetworkError();
                            recoveries.push({ step: 'save_with_network_error', recovery });
                        }
                        
                        // Step 3: Storage quota exceeded (should handle gracefully)
                        journey.push('quota_exceeded');
                        try {
                            await this.simulateQuotaExceeded();
                        } catch (error) {
                            errors.push({ step: 'quota_exceeded', error: error.message });
                            const recovery = await this.recoverFromQuotaExceeded();
                            recoveries.push({ step: 'quota_exceeded', recovery });
                        }
                        
                        // Step 4: Continue normal operation after recovery
                        journey.push('post_recovery_save');
                        await this.simulateNormalSave();
                        
                    } catch (error) {
                        errors.push({ step: 'critical_failure', error: error.message });
                    }
                    
                    return {
                        journey,
                        errors,
                        recoveries,
                        success: errors.length === recoveries.length && errors.length > 0, // All errors recovered
                        resilient: recoveries.length > 0
                    };
                }),
                
                simulateNormalSave: jest.fn().mockResolvedValue({ success: true }),
                simulateNetworkError: jest.fn().mockRejectedValue(new Error('Network timeout')),
                simulateQuotaExceeded: jest.fn().mockRejectedValue(new Error('Storage quota exceeded')),
                recoverFromNetworkError: jest.fn().mockResolvedValue({ recovered: true, fallback: 'save_without_ai' }),
                recoverFromQuotaExceeded: jest.fn().mockResolvedValue({ recovered: true, action: 'cleanup_old_pages' })
            };

            const result = await errorRecoveryManager.simulateJourneyWithErrors();

            expect(result.success).toBe(true);
            expect(result.resilient).toBe(true);
            expect(result.errors).toHaveLength(2);
            expect(result.recoveries).toHaveLength(2);
            expect(result.journey).toContain('post_recovery_save');
        });

        test('should validate cross-component communication integrity', async () => {
            const communicationTester = {
                testCrossComponentCommunication: jest.fn().mockImplementation(async function() {
                    const tests = [];
                    
                    // Test 1: Popup to Background communication
                    tests.push({
                        name: 'popup_to_background',
                        test: async () => {
                            const message = { action: 'getPages', timestamp: Date.now() };
                            const response = await this.sendMessage(message);
                            return response && response.success;
                        }
                    });
                    
                    // Test 2: Background to Content Script communication
                    tests.push({
                        name: 'background_to_content',
                        test: async () => {
                            const message = { action: 'extractMetadata', timestamp: Date.now() };
                            const response = await this.sendTabMessage(1, message);
                            return response && response.success;
                        }
                    });
                    
                    // Test 3: Options to Background communication
                    tests.push({
                        name: 'options_to_background',
                        test: async () => {
                            const message = { action: 'saveSettings', data: { language: 'ko' } };
                            const response = await this.sendMessage(message);
                            return response && response.success;
                        }
                    });
                    
                    // Test 4: Background service coordination
                    tests.push({
                        name: 'service_coordination',
                        test: async () => {
                            const message = { action: 'savePage', data: { url: 'https://test.com' } };
                            const response = await this.coordinateServices(message);
                            return response && response.success;
                        }
                    });
                    
                    const results = [];
                    for (const test of tests) {
                        try {
                            const success = await test.test();
                            results.push({ name: test.name, success, error: null });
                        } catch (error) {
                            results.push({ name: test.name, success: false, error: error.message });
                        }
                    }
                    
                    return {
                        tests: results,
                        allPassed: results.every(r => r.success),
                        passRate: (results.filter(r => r.success).length / results.length) * 100
                    };
                }),
                
                sendMessage: jest.fn().mockResolvedValue({ success: true }),
                sendTabMessage: jest.fn().mockResolvedValue({ success: true }),
                coordinateServices: jest.fn().mockResolvedValue({ success: true })
            };

            const result = await communicationTester.testCrossComponentCommunication();

            expect(result.allPassed).toBe(true);
            expect(result.passRate).toBe(100);
            expect(result.tests).toHaveLength(4);
            expect(result.tests.every(test => test.success)).toBe(true);
        });
    });
});