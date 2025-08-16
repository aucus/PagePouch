// Tests for error handling functionality
// 오류 처리 기능 테스트

const { ErrorHandler } = require('../utils/error-handler');
const { ToastManager } = require('../utils/toast');
const { ModalManager } = require('../utils/modal');

describe('ErrorHandler', () => {
    let errorHandler;
    let mockShowToast;
    let mockGetLocalizedErrorMessage;
    let mockGetCurrentLanguage;

    beforeEach(() => {
        // Mock global functions
        mockShowToast = jest.fn();
        mockGetLocalizedErrorMessage = jest.fn();
        mockGetCurrentLanguage = jest.fn(() => 'en');

        global.showToast = mockShowToast;
        global.getLocalizedErrorMessage = mockGetLocalizedErrorMessage;
        global.getCurrentLanguage = mockGetCurrentLanguage;

        // Mock console methods
        global.console = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            log: jest.fn()
        };

        // Mock Chrome APIs
        global.chrome = {
            notifications: {
                create: jest.fn()
            },
            runtime: {
                lastError: null
            }
        };

        // Mock window and navigator
        global.window = {
            location: { href: 'https://example.com' },
            addEventListener: jest.fn()
        };
        global.navigator = {
            userAgent: 'Mozilla/5.0 (Test Browser)'
        };

        errorHandler = new ErrorHandler();
    });

    afterEach(() => {
        delete global.showToast;
        delete global.getLocalizedErrorMessage;
        delete global.getCurrentLanguage;
        delete global.console;
        delete global.chrome;
        delete global.window;
        delete global.navigator;
    });

    describe('Error Processing', () => {
        test('should process Error objects correctly', () => {
            const error = new Error('Test error message');
            error.name = 'TestError';
            
            const result = errorHandler.handleError(error, 'network', 'medium');
            
            expect(result.message).toBe('Test error message');
            expect(result.name).toBe('TestError');
            expect(result.category).toBe('network');
            expect(result.severity).toBe('medium');
            expect(result.stack).toBe(error.stack);
            expect(result.id).toMatch(/^err_\d+_[a-z0-9]+$/);
        });

        test('should process string errors correctly', () => {
            const result = errorHandler.handleError('String error message', 'storage', 'high');
            
            expect(result.message).toBe('String error message');
            expect(result.name).toBe('StringError');
            expect(result.category).toBe('storage');
            expect(result.severity).toBe('high');
            expect(result.stack).toBeNull();
        });

        test('should handle unknown error types', () => {
            const result = errorHandler.handleError(null, 'unknown', 'low');
            
            expect(result.message).toBe('Unknown error occurred');
            expect(result.name).toBe('UnknownError');
            expect(result.category).toBe('unknown');
            expect(result.severity).toBe('low');
        });

        test('should include context information', () => {
            const context = { component: 'test', action: 'save' };
            const result = errorHandler.handleError('Test error', 'api', 'medium', context);
            
            expect(result.context).toEqual(context);
        });

        test('should include environment information', () => {
            const result = errorHandler.handleError('Test error');
            
            expect(result.userAgent).toBe('Mozilla/5.0 (Test Browser)');
            expect(result.url).toBe('https://example.com');
            expect(result.timestamp).toBeDefined();
        });
    });

    describe('Error Logging', () => {
        test('should log errors with appropriate levels', () => {
            errorHandler.handleError('Low severity', 'unknown', 'low');
            expect(console.info).toHaveBeenCalled();

            errorHandler.handleError('Medium severity', 'unknown', 'medium');
            expect(console.warn).toHaveBeenCalled();

            errorHandler.handleError('High severity', 'unknown', 'high');
            expect(console.error).toHaveBeenCalled();

            errorHandler.handleError('Critical severity', 'unknown', 'critical');
            expect(console.error).toHaveBeenCalled();
        });

        test('should include error details in logs', () => {
            const error = new Error('Test error');
            errorHandler.handleError(error, 'network', 'high', { test: 'context' });
            
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('[NETWORK] Test error'),
                expect.objectContaining({
                    id: expect.any(String),
                    timestamp: expect.any(String),
                    context: { test: 'context' },
                    stack: expect.any(String)
                })
            );
        });
    });

    describe('User Messages', () => {
        test('should use localized error messages when available', () => {
            mockGetLocalizedErrorMessage.mockReturnValue('Localized error message');
            
            const result = errorHandler.handleError('Test error', 'network', 'medium');
            
            expect(mockGetLocalizedErrorMessage).toHaveBeenCalledWith('network', 
                expect.objectContaining({ message: 'Test error' }));
            expect(result.userMessage).toBe('Localized error message');
        });

        test('should fallback to built-in messages', () => {
            // Don't mock getLocalizedErrorMessage to test fallback
            delete global.getLocalizedErrorMessage;
            
            const result = errorHandler.handleError('Test error', 'network', 'medium');
            
            expect(result.userMessage).toContain('Network connection failed');
        });

        test('should provide Korean messages when language is Korean', () => {
            mockGetCurrentLanguage.mockReturnValue('ko');
            delete global.getLocalizedErrorMessage;
            
            const result = errorHandler.handleError('Test error', 'network', 'medium');
            
            expect(result.userMessage).toContain('네트워크 연결에 실패했습니다');
        });

        test('should handle all error categories', () => {
            delete global.getLocalizedErrorMessage;
            
            const categories = [
                'network', 'storage', 'api', 'validation', 'permission',
                'parsing', 'screenshot', 'content_extraction', 'ai_summary', 'unknown'
            ];
            
            categories.forEach(category => {
                const result = errorHandler.handleError('Test error', category, 'medium');
                expect(result.userMessage).toBeDefined();
                expect(result.userMessage.length).toBeGreaterThan(0);
            });
        });
    });

    describe('User Notifications', () => {
        test('should show toast notifications for appropriate errors', () => {
            errorHandler.handleError('Test error', 'network', 'medium');
            
            expect(mockShowToast).toHaveBeenCalledWith(
                expect.any(String),
                'warning'
            );
        });

        test('should not show notifications for low severity errors', () => {
            errorHandler.handleError('Test error', 'network', 'low');
            
            expect(mockShowToast).not.toHaveBeenCalled();
        });

        test('should not show notifications for validation errors', () => {
            errorHandler.handleError('Test error', 'validation', 'medium');
            
            expect(mockShowToast).not.toHaveBeenCalled();
        });

        test('should use Chrome notifications when toast is not available', () => {
            delete global.showToast;
            
            errorHandler.handleError('Test error', 'network', 'high');
            
            expect(chrome.notifications.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'basic',
                    title: 'LaterLens Error',
                    message: expect.any(String)
                }),
                expect.any(Function)
            );
        });
    });

    describe('Specific Error Handlers', () => {
        test('should handle network errors', () => {
            const error = new Error('Network failed');
            const result = errorHandler.handleNetworkError(error, { url: 'test.com' });
            
            expect(result.category).toBe('network');
            expect(result.severity).toBe('medium');
            expect(result.context.component).toBe('network');
            expect(result.context.url).toBe('test.com');
        });

        test('should handle storage errors', () => {
            const error = new Error('Storage full');
            const result = errorHandler.handleStorageError(error);
            
            expect(result.category).toBe('storage');
            expect(result.severity).toBe('high');
            expect(result.context.component).toBe('storage');
        });

        test('should handle API errors', () => {
            const error = new Error('API failed');
            const result = errorHandler.handleAPIError(error, { apiKey: 'hidden' });
            
            expect(result.category).toBe('api');
            expect(result.severity).toBe('medium');
            expect(result.context.component).toBe('api');
            expect(result.context.apiKey).toBe('hidden');
        });

        test('should handle validation errors', () => {
            const result = errorHandler.handleValidationError('Invalid input');
            
            expect(result.category).toBe('validation');
            expect(result.severity).toBe('low');
            expect(result.context.component).toBe('validation');
        });

        test('should handle permission errors', () => {
            const error = new Error('Permission denied');
            const result = errorHandler.handlePermissionError(error);
            
            expect(result.category).toBe('permission');
            expect(result.severity).toBe('high');
            expect(result.context.component).toBe('permissions');
        });

        test('should handle screenshot errors', () => {
            const error = new Error('Screenshot failed');
            const result = errorHandler.handleScreenshotError(error);
            
            expect(result.category).toBe('screenshot');
            expect(result.severity).toBe('medium');
            expect(result.context.component).toBe('screenshot');
        });

        test('should handle content extraction errors', () => {
            const error = new Error('Extraction failed');
            const result = errorHandler.handleContentExtractionError(error);
            
            expect(result.category).toBe('content_extraction');
            expect(result.severity).toBe('medium');
            expect(result.context.component).toBe('content-extraction');
        });

        test('should handle AI summary errors', () => {
            const error = new Error('AI failed');
            const result = errorHandler.handleAISummaryError(error);
            
            expect(result.category).toBe('ai_summary');
            expect(result.severity).toBe('low');
            expect(result.context.component).toBe('ai-summary');
        });
    });

    describe('Error Anonymization', () => {
        test('should anonymize sensitive information', () => {
            const processedError = {
                id: 'test-id',
                timestamp: '2023-01-01',
                category: 'network',
                severity: 'medium',
                name: 'NetworkError',
                message: 'Failed to fetch https://api.example.com/data',
                stack: 'Error stack trace with sensitive info',
                context: { 
                    apiKey: 'secret-key',
                    component: 'network',
                    userId: '12345'
                },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
                url: 'https://example.com/sensitive-page'
            };

            const anonymized = errorHandler.anonymizeError(processedError);

            expect(anonymized.message).toBe('Failed to fetch [URL]');
            expect(anonymized.stack).toBeNull();
            expect(anonymized.context).toEqual({ component: 'network' });
            expect(anonymized.url).toBeNull();
            expect(anonymized.userAgent).toContain('Chrome');
            expect(anonymized.userAgent).toContain('Windows');
            expect(anonymized.userAgent).not.toContain('91.0.4472.124');
        });

        test('should sanitize various sensitive patterns', () => {
            const message = 'Error at https://example.com/path with email user@example.com and path C:\\Users\\test';
            const sanitized = errorHandler.sanitizeMessage(message);
            
            expect(sanitized).toBe('Error at [URL] with email [EMAIL] and path [PATH]');
        });

        test('should sanitize user agent information', () => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36';
            const sanitized = errorHandler.sanitizeUserAgent(userAgent);
            
            expect(sanitized).toContain('Chrome');
            expect(sanitized).toContain('Windows');
            expect(sanitized).not.toContain('91.0.4472.124');
        });

        test('should handle unknown user agents', () => {
            expect(errorHandler.sanitizeUserAgent('Unknown')).toBe('Unknown');
            expect(errorHandler.sanitizeUserAgent('')).toBe('Unknown');
            expect(errorHandler.sanitizeUserAgent(null)).toBe('Unknown');
        });
    });

    describe('Toast Type Mapping', () => {
        test('should map severity to correct toast types', () => {
            expect(errorHandler.getToastType('low')).toBe('info');
            expect(errorHandler.getToastType('medium')).toBe('warning');
            expect(errorHandler.getToastType('high')).toBe('error');
            expect(errorHandler.getToastType('critical')).toBe('error');
            expect(errorHandler.getToastType('unknown')).toBe('error');
        });
    });

    describe('Error Reporting', () => {
        test('should not report errors by default', () => {
            const spy = jest.spyOn(errorHandler, 'sendToAnalytics');
            
            errorHandler.handleError('Test error', 'network', 'medium');
            
            expect(spy).not.toHaveBeenCalled();
        });

        test('should respect user privacy settings', () => {
            expect(errorHandler.shouldReportError()).toBe(false);
        });
    });

    describe('Global Error Handlers', () => {
        test('should set up global error handlers', () => {
            expect(window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
            expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
        });
    });
});

describe('Toast Manager', () => {
    let toastManager;
    let mockDocument;

    beforeEach(() => {
        // Mock DOM
        mockDocument = {
            getElementById: jest.fn(),
            createElement: jest.fn(() => ({
                id: '',
                className: '',
                innerHTML: '',
                textContent: '',
                style: {},
                appendChild: jest.fn(),
                querySelector: jest.fn(),
                querySelectorAll: jest.fn(() => []),
                addEventListener: jest.fn(),
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                },
                setAttribute: jest.fn()
            })),
            head: {
                appendChild: jest.fn()
            },
            body: {
                appendChild: jest.fn()
            }
        };

        global.document = mockDocument;
        global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));

        toastManager = new ToastManager();
    });

    afterEach(() => {
        delete global.document;
        delete global.requestAnimationFrame;
    });

    describe('Initialization', () => {
        test('should create toast container', () => {
            expect(mockDocument.createElement).toHaveBeenCalledWith('div');
            expect(mockDocument.body.appendChild).toHaveBeenCalled();
        });

        test('should setup styles', () => {
            expect(mockDocument.createElement).toHaveBeenCalledWith('style');
            expect(mockDocument.head.appendChild).toHaveBeenCalled();
        });
    });

    describe('Toast Creation', () => {
        test('should show toast with correct properties', () => {
            const toastId = toastManager.show('Test message', 'success');
            
            expect(typeof toastId).toBe('string');
            expect(toastId).toMatch(/^toast_\d+_[a-z0-9]+$/);
            expect(toastManager.getActiveCount()).toBe(1);
        });

        test('should limit maximum toasts', () => {
            // Show more toasts than the limit
            for (let i = 0; i < 10; i++) {
                toastManager.show(`Message ${i}`, 'info');
            }
            
            expect(toastManager.getActiveCount()).toBeLessThanOrEqual(toastManager.maxToasts);
        });

        test('should auto-hide toasts after duration', (done) => {
            const toastId = toastManager.show('Test message', 'info', { duration: 100 });
            
            setTimeout(() => {
                expect(toastManager.exists(toastId)).toBe(false);
                done();
            }, 150);
        });

        test('should not auto-hide toasts with duration 0', () => {
            const toastId = toastManager.show('Test message', 'info', { duration: 0 });
            
            expect(toastManager.exists(toastId)).toBe(true);
        });
    });

    describe('Toast Types', () => {
        test('should create success toast', () => {
            const toastId = toastManager.success('Success message');
            expect(toastManager.exists(toastId)).toBe(true);
        });

        test('should create error toast with longer duration', () => {
            const toastId = toastManager.error('Error message');
            expect(toastManager.exists(toastId)).toBe(true);
        });

        test('should create warning toast', () => {
            const toastId = toastManager.warning('Warning message');
            expect(toastManager.exists(toastId)).toBe(true);
        });

        test('should create info toast', () => {
            const toastId = toastManager.info('Info message');
            expect(toastManager.exists(toastId)).toBe(true);
        });

        test('should create loading toast that doesn\'t auto-hide', () => {
            const toastId = toastManager.loading('Loading...');
            expect(toastManager.exists(toastId)).toBe(true);
        });
    });

    describe('Toast Management', () => {
        test('should hide specific toast', () => {
            const toastId = toastManager.show('Test message');
            toastManager.hide(toastId);
            
            // Should be marked for removal
            expect(toastManager.exists(toastId)).toBe(false);
        });

        test('should hide all toasts', () => {
            toastManager.show('Message 1');
            toastManager.show('Message 2');
            toastManager.show('Message 3');
            
            toastManager.hideAll();
            
            expect(toastManager.getActiveCount()).toBe(0);
        });

        test('should update existing toast', () => {
            const toastId = toastManager.show('Original message', 'info');
            toastManager.update(toastId, 'Updated message', 'success');
            
            expect(toastManager.exists(toastId)).toBe(true);
        });
    });

    describe('Icon Mapping', () => {
        test('should return correct icons for toast types', () => {
            expect(toastManager.getTypeIcon('success')).toBe('✅');
            expect(toastManager.getTypeIcon('error')).toBe('❌');
            expect(toastManager.getTypeIcon('warning')).toBe('⚠️');
            expect(toastManager.getTypeIcon('info')).toBe('ℹ️');
            expect(toastManager.getTypeIcon('unknown')).toBe('ℹ️');
        });
    });

    describe('HTML Escaping', () => {
        test('should escape HTML in messages', () => {
            const maliciousMessage = '<script>alert("xss")</script>';
            const escaped = toastManager.escapeHtml(maliciousMessage);
            
            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;script&gt;');
        });
    });
});

describe('Modal Manager', () => {
    let modalManager;
    let mockDocument;

    beforeEach(() => {
        // Mock DOM
        mockDocument = {
            getElementById: jest.fn(),
            createElement: jest.fn(() => ({
                id: '',
                className: '',
                innerHTML: '',
                textContent: '',
                style: {},
                appendChild: jest.fn(),
                querySelector: jest.fn(() => ({
                    innerHTML: '',
                    addEventListener: jest.fn(),
                    classList: { add: jest.fn(), remove: jest.fn() },
                    focus: jest.fn(),
                    value: 'test value'
                })),
                querySelectorAll: jest.fn(() => []),
                addEventListener: jest.fn(),
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                },
                setAttribute: jest.fn(),
                parentNode: {
                    removeChild: jest.fn()
                }
            })),
            head: {
                appendChild: jest.fn()
            },
            body: {
                appendChild: jest.fn(),
                style: {}
            },
            addEventListener: jest.fn()
        };

        global.document = mockDocument;
        global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));

        modalManager = new ModalManager();
    });

    afterEach(() => {
        delete global.document;
        delete global.requestAnimationFrame;
    });

    describe('Initialization', () => {
        test('should create modal container', () => {
            expect(mockDocument.createElement).toHaveBeenCalledWith('div');
            expect(mockDocument.body.appendChild).toHaveBeenCalled();
        });

        test('should setup global event listeners', () => {
            expect(mockDocument.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        });
    });

    describe('Confirmation Modal', () => {
        test('should show confirmation modal and resolve with user choice', async () => {
            const confirmPromise = modalManager.confirm({
                title: 'Test Confirmation',
                message: 'Are you sure?'
            });

            // Simulate user clicking confirm
            setTimeout(() => {
                const mockFooter = { addEventListener: jest.fn() };
                const mockModal = { querySelector: jest.fn(() => mockFooter) };
                modalManager.activeModals.set(modalManager.activeModals.keys().next().value, mockModal);
                
                // Simulate confirm click
                const clickHandler = mockFooter.addEventListener.mock.calls[0][1];
                clickHandler({ target: { dataset: { action: 'confirm' } } });
            }, 10);

            const result = await confirmPromise;
            expect(typeof result).toBe('boolean');
        });
    });

    describe('Prompt Modal', () => {
        test('should show prompt modal and return user input', async () => {
            const promptPromise = modalManager.prompt({
                title: 'Test Prompt',
                message: 'Enter value:'
            });

            // Simulate user input and confirm
            setTimeout(() => {
                const mockFooter = { addEventListener: jest.fn() };
                const mockModal = { querySelector: jest.fn(() => mockFooter) };
                modalManager.activeModals.set(modalManager.activeModals.keys().next().value, mockModal);
                
                // Simulate confirm click
                const clickHandler = mockFooter.addEventListener.mock.calls[0][1];
                clickHandler({ target: { dataset: { action: 'confirm' } } });
            }, 10);

            const result = await promptPromise;
            expect(typeof result).toBe('string');
        });
    });

    describe('Alert Modal', () => {
        test('should show alert modal and resolve when closed', async () => {
            const alertPromise = modalManager.alert({
                title: 'Test Alert',
                message: 'Alert message'
            });

            // Simulate user clicking OK
            setTimeout(() => {
                const mockFooter = { addEventListener: jest.fn() };
                const mockModal = { querySelector: jest.fn(() => mockFooter) };
                modalManager.activeModals.set(modalManager.activeModals.keys().next().value, mockModal);
                
                // Simulate OK click
                const clickHandler = mockFooter.addEventListener.mock.calls[0][1];
                clickHandler({ target: { dataset: { action: 'ok' } } });
            }, 10);

            await expect(alertPromise).resolves.toBeUndefined();
        });
    });

    describe('Modal Management', () => {
        test('should track active modals', () => {
            expect(modalManager.getActiveCount()).toBe(0);
            
            modalManager.confirm({ message: 'Test' });
            expect(modalManager.getActiveCount()).toBe(1);
        });

        test('should close all modals', () => {
            modalManager.confirm({ message: 'Test 1' });
            modalManager.confirm({ message: 'Test 2' });
            
            modalManager.closeAll();
            expect(modalManager.getActiveCount()).toBe(0);
        });
    });

    describe('HTML Escaping', () => {
        test('should escape HTML in modal content', () => {
            const maliciousContent = '<script>alert("xss")</script>';
            const escaped = modalManager.escapeHtml(maliciousContent);
            
            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;script&gt;');
        });
    });

    describe('Icon Mapping', () => {
        test('should return correct icons for modal types', () => {
            expect(modalManager.getTypeIcon('info')).toBe('ℹ️');
            expect(modalManager.getTypeIcon('warning')).toBe('⚠️');
            expect(modalManager.getTypeIcon('danger')).toBe('⚠️');
            expect(modalManager.getTypeIcon('success')).toBe('✅');
            expect(modalManager.getTypeIcon('error')).toBe('❌');
        });
    });
});