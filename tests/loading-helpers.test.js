// Tests for loading helper functions
// 로딩 헬퍼 함수 테스트

const {
    showSavePageLoading,
    showDeletePageLoading,
    showSearchLoading,
    showAPITestLoading,
    showExportLoading,
    showImportLoading,
    showPageListLoading,
    showPageCardSkeletons,
    hidePageCardSkeletons,
    showMultiStepProgress,
    showSettingsSaveLoading,
    showIndeterminateLoading,
    withLoading
} = require('../utils/loading-helpers');

describe('Loading Helpers', () => {
    let mockToastManager;
    let mockLoadingManager;
    let mockElement;

    beforeEach(() => {
        // Mock toast manager
        mockToastManager = {
            show: jest.fn(() => 'toast-id'),
            update: jest.fn(),
            hide: jest.fn()
        };

        // Mock loading manager
        mockLoadingManager = {
            showSpinner: jest.fn(() => 'spinner-id'),
            showOverlay: jest.fn(() => 'overlay-id'),
            showProgress: jest.fn(() => 'progress-id'),
            updateProgress: jest.fn(),
            setButtonLoading: jest.fn(() => 'button-id'),
            setInputLoading: jest.fn(() => 'input-id'),
            hide: jest.fn()
        };

        // Mock DOM element
        mockElement = createMockElement('button', {
            textContent: 'Save',
            disabled: false
        });

        // Mock global functions
        global._ = jest.fn((key) => {
            const messages = {
                'loading_saving': 'Saving page...',
                'loading_deleting': 'Deleting...',
                'loading_testing_api': 'Testing API connection...',
                'loading_exporting': 'Exporting data...',
                'loading_importing': 'Importing data...',
                'loading_pages': 'Loading pages...',
                'loading_complete': 'Complete!',
                'loading_please_wait': 'Please wait...'
            };
            return messages[key] || key;
        });

        global.showToast = jest.fn(() => 'toast-id');
        global.hideToast = jest.fn();
        global.showOverlay = jest.fn(() => 'overlay-id');
        global.showProgress = jest.fn(() => 'progress-id');
        global.updateProgress = jest.fn();
        global.setButtonLoading = jest.fn(() => 'button-id');
        global.setInputLoading = jest.fn(() => 'input-id');
        global.hideLoading = jest.fn();
        global.toastManager = mockToastManager;
        global.loadingManager = mockLoadingManager;

        // Mock document.querySelector
        document.querySelector = jest.fn(() => mockElement);
    });

    afterEach(() => {
        delete global._;
        delete global.showToast;
        delete global.hideToast;
        delete global.showOverlay;
        delete global.showProgress;
        delete global.updateProgress;
        delete global.setButtonLoading;
        delete global.setInputLoading;
        delete global.hideLoading;
        delete global.toastManager;
        delete global.loadingManager;
    });

    describe('showSavePageLoading', () => {
        test('should show button loading and toast', () => {
            const controller = showSavePageLoading('#save-button');
            
            expect(setButtonLoading).toHaveBeenCalledWith('#save-button', true);
            expect(showToast).toHaveBeenCalledWith('Saving page...', 'info', { duration: 0 });
            expect(controller).toHaveProperty('hide');
            expect(controller).toHaveProperty('updateProgress');
        });

        test('should hide loading when controller.hide() is called', () => {
            const controller = showSavePageLoading('#save-button');
            
            controller.hide();
            
            expect(hideLoading).toHaveBeenCalledWith('button-id');
            expect(hideToast).toHaveBeenCalledWith('toast-id');
        });

        test('should update progress with different steps', () => {
            const controller = showSavePageLoading('#save-button');
            
            controller.updateProgress('screenshot');
            controller.updateProgress('content');
            controller.updateProgress('summary');
            
            expect(mockToastManager.update).toHaveBeenCalledTimes(3);
        });
    });

    describe('showDeletePageLoading', () => {
        test('should show delete loading state', () => {
            const controller = showDeletePageLoading('#delete-button');
            
            expect(setButtonLoading).toHaveBeenCalledWith('#delete-button', true);
            expect(showToast).toHaveBeenCalledWith('Deleting...', 'info', { duration: 0 });
            expect(controller).toHaveProperty('hide');
        });

        test('should hide delete loading', () => {
            const controller = showDeletePageLoading('#delete-button');
            
            controller.hide();
            
            expect(hideLoading).toHaveBeenCalledWith('button-id');
            expect(hideToast).toHaveBeenCalledWith('toast-id');
        });
    });

    describe('showSearchLoading', () => {
        test('should show search input loading', () => {
            const controller = showSearchLoading('#search-input');
            
            expect(setInputLoading).toHaveBeenCalledWith('#search-input', true);
            expect(controller).toHaveProperty('hide');
        });

        test('should hide search loading', () => {
            const controller = showSearchLoading('#search-input');
            
            controller.hide();
            
            expect(hideLoading).toHaveBeenCalledWith('input-id');
        });
    });

    describe('showAPITestLoading', () => {
        test('should show API test loading', () => {
            const controller = showAPITestLoading('#test-button');
            
            expect(setButtonLoading).toHaveBeenCalledWith('#test-button', true);
            expect(showToast).toHaveBeenCalledWith('Testing API connection...', 'info', { duration: 0 });
        });
    });

    describe('showExportLoading', () => {
        test('should show export loading', () => {
            const controller = showExportLoading('#export-button');
            
            expect(setButtonLoading).toHaveBeenCalledWith('#export-button', true);
            expect(showToast).toHaveBeenCalledWith('Exporting data...', 'info', { duration: 0 });
        });
    });

    describe('showImportLoading', () => {
        test('should show import loading', () => {
            const controller = showImportLoading('#import-button');
            
            expect(setButtonLoading).toHaveBeenCalledWith('#import-button', true);
            expect(showToast).toHaveBeenCalledWith('Importing data...', 'info', { duration: 0 });
        });
    });

    describe('showPageListLoading', () => {
        test('should show page list overlay', () => {
            const overlayId = showPageListLoading('#page-container');
            
            expect(showOverlay).toHaveBeenCalledWith('#page-container', {
                message: 'Loading pages...',
                spinner: true
            });
            expect(overlayId).toBe('overlay-id');
        });
    });

    describe('showPageCardSkeletons', () => {
        test('should create skeleton cards', () => {
            const mockContainer = createMockElement('div');
            document.querySelector.mockReturnValue(mockContainer);
            
            const skeletons = showPageCardSkeletons('#container', 3);
            
            expect(skeletons).toHaveLength(3);
            expect(mockContainer.appendChild).toHaveBeenCalledTimes(3);
        });

        test('should handle missing container', () => {
            document.querySelector.mockReturnValue(null);
            
            const skeletons = showPageCardSkeletons('#missing-container');
            
            expect(skeletons).toEqual([]);
        });

        test('should hide skeleton cards', () => {
            const mockSkeleton1 = createMockElement('div');
            const mockSkeleton2 = createMockElement('div');
            const mockParent = createMockElement('div');
            
            mockSkeleton1.parentNode = mockParent;
            mockSkeleton2.parentNode = mockParent;
            
            hidePageCardSkeletons([mockSkeleton1, mockSkeleton2]);
            
            expect(mockParent.removeChild).toHaveBeenCalledWith(mockSkeleton1);
            expect(mockParent.removeChild).toHaveBeenCalledWith(mockSkeleton2);
        });

        test('should handle invalid skeleton array', () => {
            expect(() => {
                hidePageCardSkeletons(null);
                hidePageCardSkeletons('not-an-array');
                hidePageCardSkeletons([null, undefined]);
            }).not.toThrow();
        });
    });

    describe('showMultiStepProgress', () => {
        test('should create multi-step progress controller', () => {
            const steps = ['Step 1', 'Step 2', 'Step 3'];
            const controller = showMultiStepProgress('#container', steps);
            
            expect(showProgress).toHaveBeenCalledWith('#container', {
                value: 0,
                max: 3,
                showText: true,
                animated: true
            });
            
            expect(controller).toHaveProperty('nextStep');
            expect(controller).toHaveProperty('setStep');
            expect(controller).toHaveProperty('complete');
            expect(controller).toHaveProperty('hide');
        });

        test('should advance to next step', () => {
            const steps = ['Step 1', 'Step 2', 'Step 3'];
            const controller = showMultiStepProgress('#container', steps);
            
            controller.nextStep();
            
            expect(updateProgress).toHaveBeenCalledWith('progress-id', {
                value: 1,
                text: 'Step 1'
            });
        });

        test('should set specific step', () => {
            const steps = ['Step 1', 'Step 2', 'Step 3'];
            const controller = showMultiStepProgress('#container', steps);
            
            controller.setStep(2, 'Custom text');
            
            expect(updateProgress).toHaveBeenCalledWith('progress-id', {
                value: 2,
                text: 'Custom text'
            });
        });

        test('should complete progress', (done) => {
            const steps = ['Step 1', 'Step 2'];
            const controller = showMultiStepProgress('#container', steps);
            
            // Mock setTimeout for auto-hide
            global.setTimeout = jest.fn((fn, delay) => {
                expect(delay).toBe(2000);
                fn(); // Execute immediately for test
            });
            
            controller.complete();
            
            expect(updateProgress).toHaveBeenCalledWith('progress-id', {
                value: 2,
                text: 'Complete!'
            });
            
            // Check that hide is called after timeout
            setTimeout(() => {
                expect(hideLoading).toHaveBeenCalledWith('progress-id');
                done();
            }, 0);
        });

        test('should hide progress manually', () => {
            const controller = showMultiStepProgress('#container', []);
            
            controller.hide();
            
            expect(hideLoading).toHaveBeenCalledWith('progress-id');
        });
    });

    describe('showSettingsSaveLoading', () => {
        test('should show settings save loading', () => {
            const controller = showSettingsSaveLoading('#save-settings');
            
            expect(setButtonLoading).toHaveBeenCalledWith('#save-settings', true);
            expect(controller).toHaveProperty('hide');
        });
    });

    describe('showIndeterminateLoading', () => {
        test('should show indeterminate progress', () => {
            const progressId = showIndeterminateLoading('#container', 'Custom message');
            
            expect(showProgress).toHaveBeenCalledWith('#container', {
                indeterminate: true,
                showText: true,
                text: 'Custom message',
                animated: true
            });
            expect(progressId).toBe('progress-id');
        });

        test('should use default message when none provided', () => {
            showIndeterminateLoading('#container');
            
            expect(showProgress).toHaveBeenCalledWith('#container', {
                indeterminate: true,
                showText: true,
                text: 'Please wait...',
                animated: true
            });
        });
    });

    describe('withLoading', () => {
        test('should execute async operation with button loading', async () => {
            const asyncOperation = jest.fn().mockResolvedValue('result');
            
            const result = await withLoading(asyncOperation, {
                button: '#save-button',
                message: 'Processing...'
            });
            
            expect(setButtonLoading).toHaveBeenCalledWith('#save-button', true);
            expect(asyncOperation).toHaveBeenCalled();
            expect(result).toBe('result');
            expect(hideLoading).toHaveBeenCalledWith('button-id');
        });

        test('should execute async operation with input loading', async () => {
            const asyncOperation = jest.fn().mockResolvedValue('result');
            
            await withLoading(asyncOperation, {
                input: '#search-input'
            });
            
            expect(setInputLoading).toHaveBeenCalledWith('#search-input', true);
            expect(hideLoading).toHaveBeenCalledWith('input-id');
        });

        test('should execute async operation with overlay', async () => {
            const asyncOperation = jest.fn().mockResolvedValue('result');
            
            await withLoading(asyncOperation, {
                container: '#container',
                message: 'Loading...'
            });
            
            expect(showOverlay).toHaveBeenCalledWith('#container', { message: 'Loading...' });
            expect(hideLoading).toHaveBeenCalledWith('overlay-id');
        });

        test('should execute async operation with progress', async () => {
            const asyncOperation = jest.fn((progressController) => {
                progressController.nextStep();
                return Promise.resolve('result');
            });
            
            const result = await withLoading(asyncOperation, {
                container: '#container',
                showProgress: true,
                steps: ['Step 1', 'Step 2']
            });
            
            expect(showProgress).toHaveBeenCalled();
            expect(result).toBe('result');
        });

        test('should clean up loaders even if operation fails', async () => {
            const asyncOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
            
            await expect(withLoading(asyncOperation, {
                button: '#save-button'
            })).rejects.toThrow('Operation failed');
            
            expect(hideLoading).toHaveBeenCalledWith('button-id');
        });

        test('should handle cleanup errors gracefully', async () => {
            const asyncOperation = jest.fn().mockResolvedValue('result');
            hideLoading.mockImplementation(() => {
                throw new Error('Cleanup error');
            });
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const result = await withLoading(asyncOperation, {
                button: '#save-button'
            });
            
            expect(result).toBe('result');
            expect(consoleSpy).toHaveBeenCalledWith('Error cleaning up loader:', expect.any(Error));
            
            consoleSpy.mockRestore();
        });

        test('should execute operation without progress controller when not needed', async () => {
            const asyncOperation = jest.fn().mockResolvedValue('result');
            
            const result = await withLoading(asyncOperation, {
                button: '#save-button'
            });
            
            expect(asyncOperation).toHaveBeenCalledWith();
            expect(result).toBe('result');
        });
    });

    describe('Integration Tests', () => {
        test('should work with real DOM elements', () => {
            // Create real DOM elements
            const button = document.createElement('button');
            button.id = 'test-button';
            button.textContent = 'Save';
            document.body.appendChild(button);
            
            const controller = showSavePageLoading(button);
            
            expect(setButtonLoading).toHaveBeenCalledWith(button, true);
            expect(controller).toHaveProperty('hide');
            
            // Cleanup
            document.body.removeChild(button);
        });

        test('should handle multiple concurrent loading states', () => {
            const controller1 = showSavePageLoading('#button1');
            const controller2 = showDeletePageLoading('#button2');
            const controller3 = showAPITestLoading('#button3');
            
            expect(setButtonLoading).toHaveBeenCalledTimes(3);
            expect(showToast).toHaveBeenCalledTimes(3);
            
            controller1.hide();
            controller2.hide();
            controller3.hide();
            
            expect(hideLoading).toHaveBeenCalledTimes(3);
            expect(hideToast).toHaveBeenCalledTimes(3);
        });
    });
});