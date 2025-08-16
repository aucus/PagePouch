// Test suite for Message Router and Service Coordination
// 메시지 라우터 및 서비스 조정 테스트 스위트

// Mock Chrome APIs
global.chrome = {
    runtime: {
        getManifest: jest.fn(() => ({
            version: '1.0.0',
            name: 'LaterLens'
        }))
    },
    tabs: {
        get: jest.fn()
    },
    scripting: {
        executeScript: jest.fn()
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn()
        }
    }
};

// Mock utility classes
class MockStorageService {
    async savePage(pageData) {
        return { success: true, id: 'test-id' };
    }
    
    async enforceStorageLimit(limit) {
        return { success: true };
    }
}

class MockScreenshotService {
    async captureTab(tabId, options) {
        return {
            success: true,
            dataUrl: 'data:image/jpeg;base64,test-screenshot'
        };
    }
}

class MockSavedPage {
    constructor(data) {
        this.data = data;
    }
    
    toJSON() {
        return this.data;
    }
}

// Mock global functions
global.StorageService = MockStorageService;
global.ScreenshotService = MockScreenshotService;
global.SavedPage = MockSavedPage;
global.getSettings = jest.fn();
global.generateConditionalSummary = jest.fn();

// Import the MessageRouter class (would be from background.js in real scenario)
class MessageRouter {
    constructor() {
        this.handlers = new Map();
        this.middleware = [];
        this.requestId = 0;
        this.activeRequests = new Map();
        this.rateLimits = new Map();
        
        this.registerHandlers();
        this.setupMiddleware();
    }

    registerHandlers() {
        this.register('ping', this.handlePing.bind(this));
        this.register('savePage', this.handleSavePage.bind(this));
        this.register('getSystemInfo', this.handleGetSystemInfo.bind(this));
    }

    setupMiddleware() {
        // Request logging middleware
        this.use(async (message, sender, next) => {
            const requestId = ++this.requestId;
            const startTime = Date.now();
            
            this.activeRequests.set(requestId, {
                action: message.action,
                startTime,
                sender
            });
            
            try {
                const result = await next();
                return result;
            } finally {
                this.activeRequests.delete(requestId);
            }
        });
        
        // Rate limiting middleware
        this.use(async (message, sender, next) => {
            const rateLimitKey = `${message.action}:${sender.tab?.id || 'extension'}`;
            const now = Date.now();
            
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

    register(action, handler) {
        this.handlers.set(action, handler);
    }

    use(middleware) {
        this.middleware.push(middleware);
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            const result = await this.processMessage(message, sender);
            sendResponse(result);
        } catch (error) {
            sendResponse({
                success: false,
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    async processMessage(message, sender) {
        let index = 0;
        
        const next = async () => {
            if (index < this.middleware.length) {
                const middleware = this.middleware[index++];
                return await middleware(message, sender, next);
            } else {
                const handler = this.handlers.get(message.action);
                return await handler(message, sender);
            }
        };
        
        return await next();
    }

    async handlePing(message, sender) {
        return {
            success: true,
            pong: true,
            timestamp: Date.now(),
            version: '1.0.0'
        };
    }

    async handleSavePage(message, sender) {
        // Mock implementation
        return {
            success: true,
            data: {
                id: 'test-page-id',
                title: 'Test Page',
                url: 'https://example.com'
            }
        };
    }

    async handleGetSystemInfo(message, sender) {
        return {
            success: true,
            data: {
                version: '1.0.0',
                name: 'LaterLens',
                activeRequests: this.activeRequests.size,
                handlers: Array.from(this.handlers.keys()),
                middleware: this.middleware.length
            }
        };
    }

    cleanupRateLimits() {
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

    getActiveRequestStats() {
        const stats = {
            total: this.activeRequests.size,
            byAction: {},
            byTab: {}
        };

        for (const [id, request] of this.activeRequests) {
            stats.byAction[request.action] = (stats.byAction[request.action] || 0) + 1;
            const tabId = request.sender.tab?.id || 'extension';
            stats.byTab[tabId] = (stats.byTab[tabId] || 0) + 1;
        }

        return stats;
    }
}

describe('MessageRouter', () => {
    let messageRouter;
    let mockSender;

    beforeEach(() => {
        messageRouter = new MessageRouter();
        mockSender = {
            tab: { id: 1 }
        };
        jest.clearAllMocks();
    });

    describe('Handler Registration', () => {
        test('should register handlers correctly', () => {
            expect(messageRouter.handlers.has('ping')).toBe(true);
            expect(messageRouter.handlers.has('savePage')).toBe(true);
            expect(messageRouter.handlers.has('getSystemInfo')).toBe(true);
        });

        test('should allow custom handler registration', () => {
            const customHandler = jest.fn();
            messageRouter.register('customAction', customHandler);
            
            expect(messageRouter.handlers.has('customAction')).toBe(true);
            expect(messageRouter.handlers.get('customAction')).toBe(customHandler);
        });
    });

    describe('Middleware System', () => {
        test('should execute middleware in order', async () => {
            const executionOrder = [];
            
            messageRouter.use(async (message, sender, next) => {
                executionOrder.push('middleware1-before');
                const result = await next();
                executionOrder.push('middleware1-after');
                return result;
            });
            
            messageRouter.use(async (message, sender, next) => {
                executionOrder.push('middleware2-before');
                const result = await next();
                executionOrder.push('middleware2-after');
                return result;
            });

            const message = { action: 'ping' };
            await messageRouter.processMessage(message, mockSender);

            expect(executionOrder).toEqual([
                'middleware1-before',
                'middleware2-before',
                'middleware2-after',
                'middleware1-after'
            ]);
        });

        test('should handle middleware errors', async () => {
            messageRouter.use(async (message, sender, next) => {
                throw new Error('Middleware error');
            });

            const message = { action: 'ping' };
            
            await expect(messageRouter.processMessage(message, mockSender))
                .rejects.toThrow('Middleware error');
        });
    });

    describe('Request Validation', () => {
        test('should reject messages without action', async () => {
            const message = { data: 'test' };
            
            await expect(messageRouter.processMessage(message, mockSender))
                .rejects.toThrow('Missing action in message');
        });

        test('should reject unknown actions', async () => {
            const message = { action: 'unknownAction' };
            
            await expect(messageRouter.processMessage(message, mockSender))
                .rejects.toThrow('Unknown action: unknownAction');
        });

        test('should accept valid messages', async () => {
            const message = { action: 'ping' };
            const result = await messageRouter.processMessage(message, mockSender);
            
            expect(result.success).toBe(true);
            expect(result.pong).toBe(true);
        });
    });

    describe('Rate Limiting', () => {
        test('should allow requests under rate limit', async () => {
            const message = { action: 'ping' };
            
            // Send 5 requests (under limit of 10)
            for (let i = 0; i < 5; i++) {
                const result = await messageRouter.processMessage(message, mockSender);
                expect(result.success).toBe(true);
            }
        });

        test('should block requests over rate limit', async () => {
            const message = { action: 'ping' };
            
            // Send 10 requests to hit the limit
            for (let i = 0; i < 10; i++) {
                await messageRouter.processMessage(message, mockSender);
            }
            
            // 11th request should be blocked
            await expect(messageRouter.processMessage(message, mockSender))
                .rejects.toThrow('Rate limit exceeded');
        });

        test('should reset rate limits after time window', async () => {
            const message = { action: 'ping' };
            
            // Fill up the rate limit
            for (let i = 0; i < 10; i++) {
                await messageRouter.processMessage(message, mockSender);
            }
            
            // Clean up rate limits (simulating time passage)
            messageRouter.cleanupRateLimits();
            
            // Should be able to make requests again
            const result = await messageRouter.processMessage(message, mockSender);
            expect(result.success).toBe(true);
        });
    });

    describe('Request Tracking', () => {
        test('should track active requests', async () => {
            const initialStats = messageRouter.getActiveRequestStats();
            expect(initialStats.total).toBe(0);
            
            // Mock a long-running handler
            messageRouter.register('longRunning', async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return { success: true };
            });
            
            const message = { action: 'longRunning' };
            const promise = messageRouter.processMessage(message, mockSender);
            
            // Check stats while request is active
            const activeStats = messageRouter.getActiveRequestStats();
            expect(activeStats.total).toBe(1);
            expect(activeStats.byAction.longRunning).toBe(1);
            
            await promise;
            
            // Check stats after request completes
            const finalStats = messageRouter.getActiveRequestStats();
            expect(finalStats.total).toBe(0);
        });

        test('should track requests by tab', async () => {
            const tab1Sender = { tab: { id: 1 } };
            const tab2Sender = { tab: { id: 2 } };
            const extensionSender = {};
            
            messageRouter.register('test', async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return { success: true };
            });
            
            const promises = [
                messageRouter.processMessage({ action: 'test' }, tab1Sender),
                messageRouter.processMessage({ action: 'test' }, tab2Sender),
                messageRouter.processMessage({ action: 'test' }, extensionSender)
            ];
            
            // Check stats while requests are active
            const stats = messageRouter.getActiveRequestStats();
            expect(stats.byTab['1']).toBe(1);
            expect(stats.byTab['2']).toBe(1);
            expect(stats.byTab['extension']).toBe(1);
            
            await Promise.all(promises);
        });
    });

    describe('System Information', () => {
        test('should provide system information', async () => {
            const message = { action: 'getSystemInfo' };
            const result = await messageRouter.processMessage(message, mockSender);
            
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('version');
            expect(result.data).toHaveProperty('name');
            expect(result.data).toHaveProperty('activeRequests');
            expect(result.data).toHaveProperty('handlers');
            expect(result.data).toHaveProperty('middleware');
            
            expect(Array.isArray(result.data.handlers)).toBe(true);
            expect(typeof result.data.middleware).toBe('number');
        });
    });

    describe('Error Handling', () => {
        test('should handle handler errors gracefully', async () => {
            messageRouter.register('errorHandler', async () => {
                throw new Error('Handler error');
            });
            
            const mockSendResponse = jest.fn();
            const message = { action: 'errorHandler' };
            
            await messageRouter.handleMessage(message, mockSender, mockSendResponse);
            
            expect(mockSendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Handler error',
                timestamp: expect.any(Number)
            });
        });

        test('should provide meaningful error messages', async () => {
            const mockSendResponse = jest.fn();
            const message = { action: 'nonExistentAction' };
            
            await messageRouter.handleMessage(message, mockSender, mockSendResponse);
            
            expect(mockSendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Unknown action: nonExistentAction',
                timestamp: expect.any(Number)
            });
        });
    });
});

describe('PageSaveOrchestrator', () => {
    let orchestrator;
    
    beforeEach(() => {
        // Mock the PageSaveOrchestrator class
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
                    { name: 'saveToStorage', handler: this.saveToStorage.bind(this) }
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
                    for (const step of this.steps) {
                        await step.handler(context);
                    }

                    return {
                        success: true,
                        data: context.results.savedPage,
                        metadata: {
                            duration: Date.now() - context.startTime,
                            steps: this.steps.map(s => s.name),
                            errors: context.errors
                        }
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message,
                        metadata: {
                            duration: Date.now() - context.startTime,
                            errors: context.errors
                        }
                    };
                }
            }

            async validateInput(context) {
                if (!context.tabId) {
                    throw new Error('No tab ID provided');
                }
            }

            async getTabInfo(context) {
                context.results.tab = {
                    id: context.tabId,
                    url: 'https://example.com',
                    title: 'Test Page'
                };
            }

            async loadSettings(context) {
                context.results.settings = {
                    enableAISummary: true,
                    thumbnailQuality: 0.8
                };
            }

            async extractMetadata(context) {
                context.results.metadata = {
                    title: 'Test Page',
                    description: 'Test description',
                    ogImage: null
                };
            }

            async captureScreenshot(context) {
                context.results.screenshot = 'data:image/jpeg;base64,test';
            }

            async generateSummary(context) {
                context.results.summary = 'Test summary';
                context.results.summaryMetadata = {
                    method: 'ai_generated',
                    provider: 'openai'
                };
            }

            async createPageObject(context) {
                context.results.pageObject = new MockSavedPage({
                    url: context.results.tab.url,
                    title: context.results.tab.title,
                    summary: context.results.summary,
                    thumbnail: context.results.screenshot
                });
            }

            async saveToStorage(context) {
                context.results.savedPage = context.results.pageObject.toJSON();
            }

            isCriticalStep(stepName) {
                const criticalSteps = ['validateInput', 'getTabInfo', 'saveToStorage'];
                return criticalSteps.includes(stepName);
            }
        }
        
        orchestrator = new PageSaveOrchestrator();
        
        // Setup mocks
        global.getSettings = jest.fn().mockResolvedValue({
            success: true,
            data: { enableAISummary: true }
        });
        
        global.generateConditionalSummary = jest.fn().mockResolvedValue({
            summary: 'Test summary',
            metadata: { method: 'ai_generated' }
        });
        
        chrome.tabs.get.mockResolvedValue({
            id: 1,
            url: 'https://example.com',
            title: 'Test Page'
        });
        
        chrome.scripting.executeScript.mockResolvedValue([{
            result: {
                title: 'Test Page',
                description: 'Test description',
                ogImage: null
            }
        }]);
    });

    describe('Successful Page Save', () => {
        test('should complete all steps successfully', async () => {
            const result = await orchestrator.savePage({}, 1);
            
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.metadata.steps).toHaveLength(8);
            expect(result.metadata.errors).toHaveLength(0);
        });

        test('should provide timing information', async () => {
            const result = await orchestrator.savePage({}, 1);
            
            expect(result.metadata.duration).toBeGreaterThan(0);
            expect(typeof result.metadata.duration).toBe('number');
        });

        test('should create proper page object', async () => {
            const result = await orchestrator.savePage({}, 1);
            
            expect(result.data.url).toBe('https://example.com');
            expect(result.data.title).toBe('Test Page');
            expect(result.data.summary).toBe('Test summary');
            expect(result.data.thumbnail).toBe('data:image/jpeg;base64,test');
        });
    });

    describe('Error Handling', () => {
        test('should fail on critical step errors', async () => {
            const result = await orchestrator.savePage({}, null); // Invalid tabId
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('No tab ID provided');
            expect(result.metadata.errors).toHaveLength(1);
        });

        test('should continue on non-critical step errors', async () => {
            // Mock a non-critical step to fail
            const originalExtractMetadata = orchestrator.extractMetadata;
            orchestrator.extractMetadata = async (context) => {
                throw new Error('Metadata extraction failed');
            };
            
            // Override isCriticalStep to make extractMetadata non-critical
            orchestrator.isCriticalStep = (stepName) => {
                return stepName === 'validateInput' || stepName === 'getTabInfo' || stepName === 'saveToStorage';
            };
            
            const result = await orchestrator.savePage({}, 1);
            
            expect(result.success).toBe(true);
            expect(result.metadata.errors).toHaveLength(1);
            expect(result.metadata.errors[0].step).toBe('extractMetadata');
        });
    });

    describe('Step Execution Order', () => {
        test('should execute steps in correct order', async () => {
            const executionOrder = [];
            
            // Override each step to track execution order
            orchestrator.steps.forEach(step => {
                const originalHandler = step.handler;
                step.handler = async (context) => {
                    executionOrder.push(step.name);
                    return await originalHandler(context);
                };
            });
            
            await orchestrator.savePage({}, 1);
            
            expect(executionOrder).toEqual([
                'validateInput',
                'getTabInfo',
                'loadSettings',
                'extractMetadata',
                'captureScreenshot',
                'generateSummary',
                'createPageObject',
                'saveToStorage'
            ]);
        });
    });
});

describe('Integration Tests', () => {
    test('should handle complete message flow', async () => {
        const messageRouter = new MessageRouter();
        const mockSendResponse = jest.fn();
        
        const message = {
            action: 'ping',
            data: {}
        };
        
        const sender = {
            tab: { id: 1 }
        };
        
        await messageRouter.handleMessage(message, sender, mockSendResponse);
        
        expect(mockSendResponse).toHaveBeenCalledWith({
            success: true,
            pong: true,
            timestamp: expect.any(Number),
            version: '1.0.0'
        });
    });

    test('should handle concurrent requests', async () => {
        const messageRouter = new MessageRouter();
        
        const promises = Array.from({ length: 5 }, (_, i) => 
            messageRouter.processMessage(
                { action: 'ping' },
                { tab: { id: i + 1 } }
            )
        );
        
        const results = await Promise.all(promises);
        
        results.forEach(result => {
            expect(result.success).toBe(true);
            expect(result.pong).toBe(true);
        });
    });

    test('should maintain request isolation', async () => {
        const messageRouter = new MessageRouter();
        
        messageRouter.register('slowHandler', async (message, sender) => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return { success: true, tabId: sender.tab?.id };
        });
        
        const promises = [
            messageRouter.processMessage({ action: 'slowHandler' }, { tab: { id: 1 } }),
            messageRouter.processMessage({ action: 'slowHandler' }, { tab: { id: 2 } })
        ];
        
        const results = await Promise.all(promises);
        
        expect(results[0].tabId).toBe(1);
        expect(results[1].tabId).toBe(2);
    });
});