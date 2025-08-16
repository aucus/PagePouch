// Loading helpers for common LaterLens operations
// LaterLens 일반 작업을 위한 로딩 헬퍼

/**
 * Show loading state for page saving operation
 * 페이지 저장 작업을 위한 로딩 상태 표시
 * @param {string|HTMLElement} button - Save button element
 * @returns {Object} Loading controllers
 */
function showSavePageLoading(button) {
    const buttonLoaderId = setButtonLoading(button, true);
    const message = _('loading_saving') || 'Saving page...';
    const toastId = showToast(message, 'info', { duration: 0 });
    
    return {
        hide: () => {
            if (buttonLoaderId) hideLoading(buttonLoaderId);
            if (toastId) hideToast(toastId);
        },
        updateProgress: (step) => {
            const messages = {
                'screenshot': _('loading_capturing_screenshot') || 'Capturing screenshot...',
                'content': _('loading_extracting_content') || 'Extracting content...',
                'summary': _('loading_generating_summary') || 'Generating AI summary...',
                'saving': _('loading_saving') || 'Saving page...'
            };
            
            if (toastId && messages[step]) {
                toastManager.update(toastId, messages[step]);
            }
        }
    };
}

/**
 * Show loading state for page deletion
 * 페이지 삭제를 위한 로딩 상태 표시
 * @param {string|HTMLElement} button - Delete button element
 * @returns {Object} Loading controllers
 */
function showDeletePageLoading(button) {
    const buttonLoaderId = setButtonLoading(button, true);
    const message = _('loading_deleting') || 'Deleting...';
    const toastId = showToast(message, 'info', { duration: 0 });
    
    return {
        hide: () => {
            if (buttonLoaderId) hideLoading(buttonLoaderId);
            if (toastId) hideToast(toastId);
        }
    };
}

/**
 * Show loading state for search operation
 * 검색 작업을 위한 로딩 상태 표시
 * @param {string|HTMLElement} input - Search input element
 * @returns {Object} Loading controllers
 */
function showSearchLoading(input) {
    const inputLoaderId = setInputLoading(input, true);
    
    return {
        hide: () => {
            if (inputLoaderId) hideLoading(inputLoaderId);
        }
    };
}

/**
 * Show loading state for API testing
 * API 테스트를 위한 로딩 상태 표시
 * @param {string|HTMLElement} button - Test button element
 * @returns {Object} Loading controllers
 */
function showAPITestLoading(button) {
    const buttonLoaderId = setButtonLoading(button, true);
    const message = _('loading_testing_api') || 'Testing API connection...';
    const toastId = showToast(message, 'info', { duration: 0 });
    
    return {
        hide: () => {
            if (buttonLoaderId) hideLoading(buttonLoaderId);
            if (toastId) hideToast(toastId);
        }
    };
}

/**
 * Show loading state for data export
 * 데이터 내보내기를 위한 로딩 상태 표시
 * @param {string|HTMLElement} button - Export button element
 * @returns {Object} Loading controllers
 */
function showExportLoading(button) {
    const buttonLoaderId = setButtonLoading(button, true);
    const message = _('loading_exporting') || 'Exporting data...';
    const toastId = showToast(message, 'info', { duration: 0 });
    
    return {
        hide: () => {
            if (buttonLoaderId) hideLoading(buttonLoaderId);
            if (toastId) hideToast(toastId);
        }
    };
}

/**
 * Show loading state for data import
 * 데이터 가져오기를 위한 로딩 상태 표시
 * @param {string|HTMLElement} button - Import button element
 * @returns {Object} Loading controllers
 */
function showImportLoading(button) {
    const buttonLoaderId = setButtonLoading(button, true);
    const message = _('loading_importing') || 'Importing data...';
    const toastId = showToast(message, 'info', { duration: 0 });
    
    return {
        hide: () => {
            if (buttonLoaderId) hideLoading(buttonLoaderId);
            if (toastId) hideToast(toastId);
        }
    };
}

/**
 * Show loading overlay for page list
 * 페이지 목록을 위한 로딩 오버레이 표시
 * @param {string|HTMLElement} container - Container element
 * @returns {string} Overlay ID
 */
function showPageListLoading(container) {
    const message = _('loading_pages') || 'Loading pages...';
    return showOverlay(container, {
        message,
        spinner: true
    });
}

/**
 * Show skeleton loading for page cards
 * 페이지 카드를 위한 스켈레톤 로딩 표시
 * @param {string|HTMLElement} container - Container element
 * @param {number} count - Number of skeleton cards to show
 * @returns {Array} Array of skeleton IDs
 */
function showPageCardSkeletons(container, count = 6) {
    const containerElement = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
    
    if (!containerElement) return [];

    const skeletonIds = [];
    
    for (let i = 0; i < count; i++) {
        const cardSkeleton = document.createElement('div');
        cardSkeleton.className = 'page-card skeleton-card';
        cardSkeleton.innerHTML = `
            <div class="loading-skeleton image" style="height: 120px; margin-bottom: 12px;"></div>
            <div class="loading-skeleton title" style="height: 1.2em; margin-bottom: 8px;"></div>
            <div class="loading-skeleton text" style="height: 1em; width: 80%; margin-bottom: 4px;"></div>
            <div class="loading-skeleton text" style="height: 1em; width: 60%;"></div>
        `;
        
        containerElement.appendChild(cardSkeleton);
        skeletonIds.push(cardSkeleton);
    }
    
    return skeletonIds;
}

/**
 * Hide page card skeletons
 * 페이지 카드 스켈레톤 숨기기
 * @param {Array} skeletonElements - Array of skeleton elements
 */
function hidePageCardSkeletons(skeletonElements) {
    if (!Array.isArray(skeletonElements)) return;
    
    skeletonElements.forEach(skeleton => {
        if (skeleton && skeleton.parentNode) {
            skeleton.parentNode.removeChild(skeleton);
        }
    });
}

/**
 * Show progress for multi-step operations
 * 다단계 작업을 위한 진행률 표시
 * @param {string|HTMLElement} container - Container element
 * @param {Array} steps - Array of step names
 * @returns {Object} Progress controller
 */
function showMultiStepProgress(container, steps = []) {
    const progressId = showProgress(container, {
        value: 0,
        max: steps.length,
        showText: true,
        animated: true
    });
    
    let currentStep = 0;
    
    return {
        nextStep: (customText) => {
            if (currentStep < steps.length) {
                currentStep++;
                const text = customText || steps[currentStep - 1] || `Step ${currentStep}`;
                updateProgress(progressId, {
                    value: currentStep,
                    text: text
                });
            }
        },
        setStep: (step, customText) => {
            if (step >= 0 && step <= steps.length) {
                currentStep = step;
                const text = customText || (step > 0 ? steps[step - 1] : '') || `Step ${step}`;
                updateProgress(progressId, {
                    value: step,
                    text: text
                });
            }
        },
        complete: (customText) => {
            const text = customText || _('loading_complete') || 'Complete!';
            updateProgress(progressId, {
                value: steps.length,
                text: text
            });
            
            // Auto-hide after 2 seconds
            setTimeout(() => {
                hideLoading(progressId);
            }, 2000);
        },
        hide: () => {
            hideLoading(progressId);
        }
    };
}

/**
 * Show loading state for settings save
 * 설정 저장을 위한 로딩 상태 표시
 * @param {string|HTMLElement} button - Save button element
 * @returns {Object} Loading controllers
 */
function showSettingsSaveLoading(button) {
    const buttonLoaderId = setButtonLoading(button, true);
    
    return {
        hide: () => {
            if (buttonLoaderId) hideLoading(buttonLoaderId);
        }
    };
}

/**
 * Show indeterminate loading for unknown duration operations
 * 지속 시간을 알 수 없는 작업을 위한 무한 로딩 표시
 * @param {string|HTMLElement} container - Container element
 * @param {string} message - Loading message
 * @returns {string} Progress ID
 */
function showIndeterminateLoading(container, message) {
    const loadingMessage = message || _('loading_please_wait') || 'Please wait...';
    
    return showProgress(container, {
        indeterminate: true,
        showText: true,
        text: loadingMessage,
        animated: true
    });
}

/**
 * Create loading state for async operations with automatic cleanup
 * 자동 정리 기능이 있는 비동기 작업을 위한 로딩 상태 생성
 * @param {Function} asyncOperation - Async operation to execute
 * @param {Object} loadingConfig - Loading configuration
 * @returns {Promise} Promise that resolves with operation result
 */
async function withLoading(asyncOperation, loadingConfig = {}) {
    const {
        button,
        input,
        container,
        message,
        showProgress: showProgressBar = false,
        steps = []
    } = loadingConfig;
    
    const loaders = [];
    
    try {
        // Set up loading states
        if (button) {
            const buttonLoaderId = setButtonLoading(button, true);
            if (buttonLoaderId) loaders.push(() => hideLoading(buttonLoaderId));
        }
        
        if (input) {
            const inputLoaderId = setInputLoading(input, true);
            if (inputLoaderId) loaders.push(() => hideLoading(inputLoaderId));
        }
        
        if (container && message) {
            const overlayId = showOverlay(container, { message });
            if (overlayId) loaders.push(() => hideLoading(overlayId));
        }
        
        if (showProgressBar && container) {
            const progressController = showMultiStepProgress(container, steps);
            loaders.push(() => progressController.hide());
            
            // Pass progress controller to async operation if it accepts it
            if (asyncOperation.length > 0) {
                return await asyncOperation(progressController);
            }
        }
        
        // Execute the async operation
        return await asyncOperation();
        
    } finally {
        // Clean up all loaders
        loaders.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.warn('Error cleaning up loader:', error);
            }
        });
    }
}

// Export functions for global use
if (typeof window !== 'undefined') {
    window.showSavePageLoading = showSavePageLoading;
    window.showDeletePageLoading = showDeletePageLoading;
    window.showSearchLoading = showSearchLoading;
    window.showAPITestLoading = showAPITestLoading;
    window.showExportLoading = showExportLoading;
    window.showImportLoading = showImportLoading;
    window.showPageListLoading = showPageListLoading;
    window.showPageCardSkeletons = showPageCardSkeletons;
    window.hidePageCardSkeletons = hidePageCardSkeletons;
    window.showMultiStepProgress = showMultiStepProgress;
    window.showSettingsSaveLoading = showSettingsSaveLoading;
    window.showIndeterminateLoading = showIndeterminateLoading;
    window.withLoading = withLoading;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
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
    };
}