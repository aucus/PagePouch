// Tests for loading states and progress indicators
// 로딩 상태 및 진행 표시기 테스트

describe('LoadingManager', () => {
    let loadingManager;
    let mockDocument;
    let mockElement;

    beforeEach(() => {
        // Mock DOM elements
        mockElement = {
            innerHTML: '',
            textContent: '',
            style: {},
            className: '',
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn()
            },
            appendChild: jest.fn(),
            removeChild: jest.fn(),
            querySelector: jest.fn(),
            parentNode: {
                removeChild: jest.fn()
            },
            disabled: false
        };

        mockDocument = {
            getElementById: jest.fn(() => mockElement),
            querySelector: jest.fn(() => mockElement),
            createElement: jest.fn(() => mockElement),
            head: {
                appendChild: jest.fn()
            }
        };

        global.document = mockDocument;
        global.HTMLElement = class HTMLElement {};
        global.setTimeout = jest.fn((fn) => fn());
        global.requestAnimationFrame = jest.fn((fn) => fn());

        loadingManager = new LoadingManager();
    });

    afterEach(() => {
        delete global.document;
        delete global.HTMLElement;
        delete global.setTimeout;
        delete global.requestAnimationFrame;
    });

    describe('Initialization', () => {
        test('should initialize with empty state', () => {
            expect(loadingManager.getActiveCount()).toBe(0);
            expect(loadingManager.activeLoaders.size).toBe(0);
            expect(loadingManager.loadingOverlays.size).toBe(0);
            expect(loadingManager.progressBars.size).toBe(0);
        });

        test('should setup styles on initialization', () => {
            expect(mockDocument.createElement).toHaveBeenCalledWith('style');
            expect(mockDocument.head.appendChild).toHaveBeenCalled();
        });
    });

    describe('Spinner Loading', () => {
        test('should show spinner with default options', () => {
            const loaderId = loadingManager.showSpinner('#test-element');
            
            expect(typeof loaderId).toBe('string');
            expect(loaderId).toMatch(/^loader_\d+_[a-z0-9]+$/);
            expect(loadingManager.exists(loaderId)).toBe(true);
            expect(loadingManager.getActiveCount()).toBe(1);
        });

        test('should show spinner with custom options', () => {
            const loaderId = loadingManager.showSpinner('#test-element', {
                size: 'large',
                color: 'white',
                replace: true
            });
            
            expect(loadingManager.exists(loaderId)).toBe(true);
            expect(mockElement.innerHTML).toBe('');
            expect(mockElement.appendChild).toHaveBeenCalled();
        });

        test('should handle missing target element', () => {
            mockDocument.querySelector.mockReturnValue(null);
            
            const loaderId = loadingManager.showSpinner('#missing-element');
            
            expect(loaderId).toBeNull();
            expect(loadingManager.getActiveCount()).toBe(0);
        });

        test('should hide spinner correctly', () => {
            const loaderId = loadingManager.showSpinner('#test-element');
            
            loadingManager.hide(loaderId);
            
            expect(loadingManager.exists(loaderId)).toBe(false);
            expect(loadingManager.getActiveCount()).toBe(0);
        });

        test('should restore original content when replacing', () => {
            mockElement.innerHTML = 'Original Content';
            
            const loaderId = loadingManager.showSpinner('#test-element', { replace: true });
            loadingManager.hide(loaderId);
            
            expect(mockElement.innerHTML).toBe('Original Content');
        });
    });

    describe('Dots Loading', () => {
        test('should show loading dots', () => {
            const loaderId = loadingManager.showDots('#test-element');
            
            expect(loadingManager.exists(loaderId)).toBe(true);
            expect(mockElement.appendChild).toHaveBeenCalled();
        });

        test('should create dots with correct structure', () => {
            const mockDotsElement = {
                ...mockElement,
                innerHTML: ''
            };
            mockDocument.createElement.mockReturnValue(mockDotsElement);
            
            loadingManager.showDots('#test-element');
            
            expect(mockDotsElement.innerHTML).toContain('dot');
        });
    });

    describe('Overlay Loading', () => {
        test('should show loading overlay', () => {
            const loaderId = loadingManager.showOverlay('#test-element');
            
            expect(loadingManager.exists(loaderId)).toBe(true);
            expect(mockElement.style.position).toBe('relative');
            expect(mockElement.appendChild).toHaveBeenCalled();
        });

        test('should show overlay with custom message', () => {
            const loaderId = loadingManager.showOverlay('#test-element', {
                message: 'Custom loading message',
                dark: true
            });
            
            expect(loadingManager.exists(loaderId)).toBe(true);
        });

        test('should preserve original position when hiding', () => {
            mockElement.style.position = 'absolute';
            
            const loaderId = loadingManager.showOverlay('#test-element');
            loadingManager.hide(loaderId);
            
            expect(mockElement.style.position).toBe('absolute');
        });
    });

    describe('Skeleton Loading', () => {
        test('should show skeleton loading', () => {
            const loaderId = loadingManager.showSkeleton('#test-element');
            
            expect(loadingManager.exists(loaderId)).toBe(true);
            expect(mockElement.appendChild).toHaveBeenCalled();
        });

        test('should create multiple lines for text skeleton', () => {
            const loaderId = loadingManager.showSkeleton('#test-element', {
                type: 'text',
                lines: 5
            });
            
            expect(loadingManager.exists(loaderId)).toBe(true);
            expect(mockDocument.createElement).toHaveBeenCalledTimes(7); // 1 container + 5 lines + 1 style
        });

        test('should support different skeleton types', () => {
            const types = ['text', 'title', 'image', 'button'];
            
            types.forEach(type => {
                const loaderId = loadingManager.showSkeleton('#test-element', { type });
                expect(loadingManager.exists(loaderId)).toBe(true);
                loadingManager.hide(loaderId);
            });
        });
    });

    describe('Progress Bar', () => {
        test('should show progress bar', () => {
            const progressId = loadingManager.showProgress('#test-element');
            
            expect(loadingManager.exists(progressId)).toBe(true);
            expect(mockElement.appendChild).toHaveBeenCalled();
        });

        test('should show progress with initial value', () => {
            const progressId = loadingManager.showProgress('#test-element', {
                value: 50,
                max: 100
            });
            
            expect(loadingManager.exists(progressId)).toBe(true);
        });

        test('should update progress value', () => {
            const progressId = loadingManager.showProgress('#test-element', {
                value: 25,
                max: 100
            });
            
            loadingManager.updateProgress(progressId, {
                value: 75,
                text: 'Almost done...'
            });
            
            const progressData = loadingManager.progressBars.get(progressId);
            expect(progressData.value).toBe(75);
        });

        test('should show indeterminate progress', () => {
            const progressId = loadingManager.showProgress('#test-element', {
                indeterminate: true
            });
            
            expect(loadingManager.exists(progressId)).toBe(true);
        });

        test('should hide progress bar', () => {
            const progressId = loadingManager.showProgress('#test-element');
            
            loadingManager.hide(progressId);
            
            expect(loadingManager.exists(progressId)).toBe(false);
        });
    });

    describe('Button Loading States', () => {
        test('should set button loading state', () => {
            mockElement.textContent = 'Save';
            mockElement.disabled = false;
            
            const loaderId = loadingManager.setButtonLoading('#test-button', true);
            
            expect(loadingManager.exists(loaderId)).toBe(true);
            expect(mockElement.classList.add).toHaveBeenCalledWith('loading');
            expect(mockElement.disabled).toBe(true);
        });

        test('should restore button state when hiding', () => {
            mockElement.textContent = 'Save';
            mockElement.disabled = false;
            
            const loaderId = loadingManager.setButtonLoading('#test-button', true);
            loadingManager.setButtonLoading('#test-button', false);
            
            expect(mockElement.classList.remove).toHaveBeenCalledWith('loading');
            expect(mockElement.disabled).toBe(false);
        });

        test('should handle missing button element', () => {
            mockDocument.querySelector.mockReturnValue(null);
            
            const loaderId = loadingManager.setButtonLoading('#missing-button', true);
            
            expect(loaderId).toBeNull();
        });
    });

    describe('Input Loading States', () => {
        test('should set input loading state', () => {
            const loaderId = loadingManager.setInputLoading('#test-input', true);
            
            expect(loadingManager.exists(loaderId)).toBe(true);
            expect(mockElement.classList.add).toHaveBeenCalledWith('input-loading');
        });

        test('should remove input loading state', () => {
            const loaderId = loadingManager.setInputLoading('#test-input', true);
            loadingManager.setInputLoading('#test-input', false);
            
            expect(mockElement.classList.remove).toHaveBeenCalledWith('input-loading');
        });
    });

    describe('Element Resolution', () => {
        test('should resolve string selectors', () => {
            const element = loadingManager.getElement('#test-element');
            expect(element).toBe(mockElement);
            expect(mockDocument.querySelector).toHaveBeenCalledWith('#test-element');
        });

        test('should return HTMLElement directly', () => {
            const htmlElement = new HTMLElement();
            const element = loadingManager.getElement(htmlElement);
            expect(element).toBe(htmlElement);
        });

        test('should return null for invalid input', () => {
            expect(loadingManager.getElement(null)).toBeNull();
            expect(loadingManager.getElement(undefined)).toBeNull();
            expect(loadingManager.getElement(123)).toBeNull();
        });
    });

    describe('Loader Management', () => {
        test('should track multiple loaders', () => {
            const loader1 = loadingManager.showSpinner('#element1');
            const loader2 = loadingManager.showDots('#element2');
            const loader3 = loadingManager.showOverlay('#element3');
            
            expect(loadingManager.getActiveCount()).toBe(3);
            expect(loadingManager.exists(loader1)).toBe(true);
            expect(loadingManager.exists(loader2)).toBe(true);
            expect(loadingManager.exists(loader3)).toBe(true);
        });

        test('should hide all loaders', () => {
            loadingManager.showSpinner('#element1');
            loadingManager.showDots('#element2');
            loadingManager.showOverlay('#element3');
            
            loadingManager.hideAll();
            
            expect(loadingManager.getActiveCount()).toBe(0);
        });

        test('should generate unique loader IDs', () => {
            const id1 = loadingManager.generateLoaderId();
            const id2 = loadingManager.generateLoaderId();
            
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^loader_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^loader_\d+_[a-z0-9]+$/);
        });
    });

    describe('Error Handling', () => {
        test('should handle hide() with invalid loader ID', () => {
            expect(() => {
                loadingManager.hide('invalid-loader-id');
            }).not.toThrow();
        });

        test('should handle updateProgress() with invalid progress ID', () => {
            expect(() => {
                loadingManager.updateProgress('invalid-progress-id', { value: 50 });
            }).not.toThrow();
        });

        test('should log warnings for missing elements', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            mockDocument.querySelector.mockReturnValue(null);
            
            loadingManager.showSpinner('#missing-element');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                'Loading target element not found:',
                '#missing-element'
            );
            
            consoleSpy.mockRestore();
        });
    });
});

describe('Global Loading Functions', () => {
    let mockLoadingManager;

    beforeEach(() => {
        mockLoadingManager = {
            showSpinner: jest.fn(() => 'spinner-id'),
            showDots: jest.fn(() => 'dots-id'),
            showOverlay: jest.fn(() => 'overlay-id'),
            showSkeleton: jest.fn(() => 'skeleton-id'),
            showProgress: jest.fn(() => 'progress-id'),
            updateProgress: jest.fn(),
            setButtonLoading: jest.fn(() => 'button-id'),
            setInputLoading: jest.fn(() => 'input-id'),
            hide: jest.fn(),
            hideAll: jest.fn()
        };

        global.loadingManager = mockLoadingManager;
    });

    afterEach(() => {
        delete global.loadingManager;
    });

    test('showSpinner should call loadingManager.showSpinner', () => {
        const result = showSpinner('#test', { size: 'large' });
        
        expect(mockLoadingManager.showSpinner).toHaveBeenCalledWith('#test', { size: 'large' });
        expect(result).toBe('spinner-id');
    });

    test('showDots should call loadingManager.showDots', () => {
        const result = showDots('#test', { replace: true });
        
        expect(mockLoadingManager.showDots).toHaveBeenCalledWith('#test', { replace: true });
        expect(result).toBe('dots-id');
    });

    test('showOverlay should call loadingManager.showOverlay', () => {
        const result = showOverlay('#test', { message: 'Loading...' });
        
        expect(mockLoadingManager.showOverlay).toHaveBeenCalledWith('#test', { message: 'Loading...' });
        expect(result).toBe('overlay-id');
    });

    test('showSkeleton should call loadingManager.showSkeleton', () => {
        const result = showSkeleton('#test', { type: 'text', lines: 3 });
        
        expect(mockLoadingManager.showSkeleton).toHaveBeenCalledWith('#test', { type: 'text', lines: 3 });
        expect(result).toBe('skeleton-id');
    });

    test('showProgress should call loadingManager.showProgress', () => {
        const result = showProgress('#test', { value: 50, max: 100 });
        
        expect(mockLoadingManager.showProgress).toHaveBeenCalledWith('#test', { value: 50, max: 100 });
        expect(result).toBe('progress-id');
    });

    test('updateProgress should call loadingManager.updateProgress', () => {
        updateProgress('progress-id', { value: 75 });
        
        expect(mockLoadingManager.updateProgress).toHaveBeenCalledWith('progress-id', { value: 75 });
    });

    test('setButtonLoading should call loadingManager.setButtonLoading', () => {
        const result = setButtonLoading('#button', true);
        
        expect(mockLoadingManager.setButtonLoading).toHaveBeenCalledWith('#button', true);
        expect(result).toBe('button-id');
    });

    test('setInputLoading should call loadingManager.setInputLoading', () => {
        const result = setInputLoading('#input', true);
        
        expect(mockLoadingManager.setInputLoading).toHaveBeenCalledWith('#input', true);
        expect(result).toBe('input-id');
    });

    test('hideLoading should call loadingManager.hide', () => {
        hideLoading('loader-id');
        
        expect(mockLoadingManager.hide).toHaveBeenCalledWith('loader-id');
    });

    test('hideAllLoading should call loadingManager.hideAll', () => {
        hideAllLoading();
        
        expect(mockLoadingManager.hideAll).toHaveBeenCalled();
    });
});

describe('LoadingManager Integration', () => {
    let loadingManager;
    let container;

    beforeEach(() => {
        // Create real DOM elements for integration testing
        container = document.createElement('div');
        container.id = 'test-container';
        container.innerHTML = `
            <button id="test-button">Save</button>
            <input id="test-input" type="text" />
            <div id="test-content">Content</div>
        `;
        document.body.appendChild(container);

        loadingManager = new LoadingManager();
    });

    afterEach(() => {
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    test('should work with real DOM elements', () => {
        const button = document.getElementById('test-button');
        const loaderId = loadingManager.setButtonLoading(button, true);
        
        expect(button.classList.contains('loading')).toBe(true);
        expect(button.disabled).toBe(true);
        
        loadingManager.hide(loaderId);
        
        expect(button.classList.contains('loading')).toBe(false);
        expect(button.disabled).toBe(false);
    });

    test('should handle overlay positioning correctly', () => {
        const content = document.getElementById('test-content');
        const originalPosition = content.style.position;
        
        const loaderId = loadingManager.showOverlay(content);
        
        expect(content.style.position).toBe('relative');
        expect(content.children.length).toBe(1);
        expect(content.children[0].classList.contains('loading-overlay')).toBe(true);
        
        loadingManager.hide(loaderId);
        
        // Position should be restored
        expect(content.style.position).toBe(originalPosition);
    });

    test('should create proper skeleton structure', () => {
        const content = document.getElementById('test-content');
        const originalHTML = content.innerHTML;
        
        const loaderId = loadingManager.showSkeleton(content, {
            type: 'text',
            lines: 3,
            replace: true
        });
        
        expect(content.innerHTML).not.toBe(originalHTML);
        expect(content.children.length).toBe(1);
        
        const skeleton = content.children[0];
        expect(skeleton.children.length).toBe(3); // 3 skeleton lines
        
        loadingManager.hide(loaderId);
        
        expect(content.innerHTML).toBe(originalHTML);
    });
});