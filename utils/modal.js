// Modal dialog system for LaterLens Chrome extension
// 모달 다이얼로그 시스템 - 사용자 확인 및 입력 다이얼로그

class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.modalContainer = null;
        this.init();
    }

    init() {
        this.createModalContainer();
        this.setupStyles();
        this.setupEventListeners();
    }

    /**
     * Create modal container element
     * 모달 컨테이너 요소 생성
     */
    createModalContainer() {
        this.modalContainer = document.getElementById('modal-container');
        
        if (!this.modalContainer) {
            this.modalContainer = document.createElement('div');
            this.modalContainer.id = 'modal-container';
            this.modalContainer.className = 'modal-container';
            document.body.appendChild(this.modalContainer);
        }
    }

    /**
     * Setup CSS styles for modals
     * 모달을 위한 CSS 스타일 설정
     */
    setupStyles() {
        if (document.getElementById('modal-styles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'modal-styles';
        styles.textContent = `
            .modal-container {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                pointer-events: none;
            }

            .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: auto;
            }

            .modal-backdrop.show {
                opacity: 1;
            }

            .modal {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow: hidden;
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .modal.show {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }

            .modal-header {
                padding: 20px 24px 16px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .modal-title {
                font-size: 18px;
                font-weight: 600;
                color: #111827;
                margin: 0;
                flex: 1;
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: 4px;
                border-radius: 6px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
            }

            .modal-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            .modal-body {
                padding: 20px 24px;
                max-height: 60vh;
                overflow-y: auto;
            }

            .modal-message {
                font-size: 16px;
                line-height: 1.5;
                color: #374151;
                margin: 0 0 16px 0;
            }

            .modal-details {
                font-size: 14px;
                color: #6b7280;
                margin: 0;
                line-height: 1.4;
            }

            .modal-footer {
                padding: 16px 24px 20px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .modal-button {
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
                min-width: 80px;
                text-align: center;
            }

            .modal-button.primary {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }

            .modal-button.primary:hover {
                background: #2563eb;
                border-color: #2563eb;
            }

            .modal-button.secondary {
                background: #f9fafb;
                color: #374151;
                border-color: #d1d5db;
            }

            .modal-button.secondary:hover {
                background: #f3f4f6;
                border-color: #9ca3af;
            }

            .modal-button.danger {
                background: #ef4444;
                color: white;
                border-color: #ef4444;
            }

            .modal-button.danger:hover {
                background: #dc2626;
                border-color: #dc2626;
            }

            .modal-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .modal-input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                margin-top: 8px;
                transition: border-color 0.2s;
            }

            .modal-input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .modal-textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                margin-top: 8px;
                resize: vertical;
                min-height: 80px;
                font-family: inherit;
                transition: border-color 0.2s;
            }

            .modal-textarea:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .modal-icon {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                margin: 0 auto 16px;
            }

            .modal-icon.info {
                background: #dbeafe;
                color: #3b82f6;
            }

            .modal-icon.warning {
                background: #fef3c7;
                color: #f59e0b;
            }

            .modal-icon.danger {
                background: #fee2e2;
                color: #ef4444;
            }

            .modal-icon.success {
                background: #d1fae5;
                color: #10b981;
            }

            /* Dark theme */
            @media (prefers-color-scheme: dark) {
                .modal {
                    background: #1f2937;
                    color: #f9fafb;
                }

                .modal-header {
                    border-bottom-color: #374151;
                }

                .modal-title {
                    color: #f9fafb;
                }

                .modal-close {
                    color: #9ca3af;
                }

                .modal-close:hover {
                    background: #374151;
                    color: #f3f4f6;
                }

                .modal-message {
                    color: #e5e7eb;
                }

                .modal-details {
                    color: #9ca3af;
                }

                .modal-footer {
                    border-top-color: #374151;
                }

                .modal-button.secondary {
                    background: #374151;
                    color: #f9fafb;
                    border-color: #4b5563;
                }

                .modal-button.secondary:hover {
                    background: #4b5563;
                    border-color: #6b7280;
                }

                .modal-input,
                .modal-textarea {
                    background: #374151;
                    border-color: #4b5563;
                    color: #f9fafb;
                }

                .modal-input:focus,
                .modal-textarea:focus {
                    border-color: #3b82f6;
                }
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                .modal {
                    width: 95%;
                    max-height: 90vh;
                }

                .modal-header,
                .modal-body,
                .modal-footer {
                    padding-left: 16px;
                    padding-right: 16px;
                }

                .modal-footer {
                    flex-direction: column-reverse;
                }

                .modal-button {
                    width: 100%;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Setup global event listeners
     * 전역 이벤트 리스너 설정
     */
    setupEventListeners() {
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
        });
    }

    /**
     * Show confirmation modal
     * 확인 모달 표시
     * @param {Object} options - Modal options
     * @returns {Promise} Promise that resolves with user choice
     */
    confirm(options = {}) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to proceed?',
            details = '',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'info',
            danger = false
        } = options;

        return new Promise((resolve) => {
            const modalId = this.generateModalId();
            const modal = this.createModal(modalId, {
                title,
                type,
                closable: true
            });

            const body = modal.querySelector('.modal-body');
            body.innerHTML = `
                ${type !== 'none' ? `<div class="modal-icon ${danger ? 'danger' : type}">${this.getTypeIcon(danger ? 'danger' : type)}</div>` : ''}
                <p class="modal-message">${this.escapeHtml(message)}</p>
                ${details ? `<p class="modal-details">${this.escapeHtml(details)}</p>` : ''}
            `;

            const footer = modal.querySelector('.modal-footer');
            footer.innerHTML = `
                <button class="modal-button secondary" data-action="cancel">${this.escapeHtml(cancelText)}</button>
                <button class="modal-button ${danger ? 'danger' : 'primary'}" data-action="confirm">${this.escapeHtml(confirmText)}</button>
            `;

            // Add event listeners
            footer.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action) {
                    this.closeModal(modalId);
                    resolve(action === 'confirm');
                }
            });

            this.showModal(modalId);
        });
    }

    /**
     * Show prompt modal for user input
     * 사용자 입력을 위한 프롬프트 모달 표시
     * @param {Object} options - Modal options
     * @returns {Promise} Promise that resolves with user input or null
     */
    prompt(options = {}) {
        const {
            title = 'Enter Value',
            message = 'Please enter a value:',
            placeholder = '',
            defaultValue = '',
            multiline = false,
            required = false,
            confirmText = 'OK',
            cancelText = 'Cancel'
        } = options;

        return new Promise((resolve) => {
            const modalId = this.generateModalId();
            const modal = this.createModal(modalId, {
                title,
                type: 'none',
                closable: true
            });

            const inputType = multiline ? 'textarea' : 'input';
            const inputClass = multiline ? 'modal-textarea' : 'modal-input';
            const inputElement = multiline ? 
                `<textarea class="${inputClass}" placeholder="${this.escapeHtml(placeholder)}" ${required ? 'required' : ''}>${this.escapeHtml(defaultValue)}</textarea>` :
                `<input type="text" class="${inputClass}" placeholder="${this.escapeHtml(placeholder)}" value="${this.escapeHtml(defaultValue)}" ${required ? 'required' : ''}>`;

            const body = modal.querySelector('.modal-body');
            body.innerHTML = `
                <p class="modal-message">${this.escapeHtml(message)}</p>
                ${inputElement}
            `;

            const footer = modal.querySelector('.modal-footer');
            footer.innerHTML = `
                <button class="modal-button secondary" data-action="cancel">${this.escapeHtml(cancelText)}</button>
                <button class="modal-button primary" data-action="confirm">${this.escapeHtml(confirmText)}</button>
            `;

            const input = body.querySelector(`.${inputClass}`);
            const confirmButton = footer.querySelector('[data-action="confirm"]');

            // Validate input
            const validateInput = () => {
                const value = input.value.trim();
                confirmButton.disabled = required && !value;
            };

            input.addEventListener('input', validateInput);
            validateInput();

            // Focus input
            setTimeout(() => input.focus(), 100);

            // Handle Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !multiline && !confirmButton.disabled) {
                    this.closeModal(modalId);
                    resolve(input.value);
                }
            });

            // Add event listeners
            footer.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action) {
                    this.closeModal(modalId);
                    resolve(action === 'confirm' ? input.value : null);
                }
            });

            this.showModal(modalId);
        });
    }

    /**
     * Show alert modal
     * 알림 모달 표시
     * @param {Object} options - Modal options
     * @returns {Promise} Promise that resolves when modal is closed
     */
    alert(options = {}) {
        const {
            title = 'Alert',
            message = 'Alert message',
            details = '',
            type = 'info',
            buttonText = 'OK'
        } = options;

        return new Promise((resolve) => {
            const modalId = this.generateModalId();
            const modal = this.createModal(modalId, {
                title,
                type,
                closable: true
            });

            const body = modal.querySelector('.modal-body');
            body.innerHTML = `
                <div class="modal-icon ${type}">${this.getTypeIcon(type)}</div>
                <p class="modal-message">${this.escapeHtml(message)}</p>
                ${details ? `<p class="modal-details">${this.escapeHtml(details)}</p>` : ''}
            `;

            const footer = modal.querySelector('.modal-footer');
            footer.innerHTML = `
                <button class="modal-button primary" data-action="ok">${this.escapeHtml(buttonText)}</button>
            `;

            // Add event listeners
            footer.addEventListener('click', (e) => {
                if (e.target.dataset.action === 'ok') {
                    this.closeModal(modalId);
                    resolve();
                }
            });

            this.showModal(modalId);
        });
    }

    /**
     * Create modal element
     * 모달 요소 생성
     * @param {string} modalId - Modal ID
     * @param {Object} options - Modal options
     * @returns {HTMLElement} Modal element
     */
    createModal(modalId, options = {}) {
        const { title, closable = true } = options;

        const modalWrapper = document.createElement('div');
        modalWrapper.className = 'modal-wrapper';
        modalWrapper.id = modalId;

        modalWrapper.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title">
                <div class="modal-header">
                    <h3 class="modal-title" id="${modalId}-title">${this.escapeHtml(title)}</h3>
                    ${closable ? '<button class="modal-close" aria-label="Close modal">×</button>' : ''}
                </div>
                <div class="modal-body"></div>
                <div class="modal-footer"></div>
            </div>
        `;

        // Add close event listener
        if (closable) {
            const closeButton = modalWrapper.querySelector('.modal-close');
            const backdrop = modalWrapper.querySelector('.modal-backdrop');

            closeButton.addEventListener('click', () => {
                this.closeModal(modalId);
            });

            backdrop.addEventListener('click', () => {
                this.closeModal(modalId);
            });
        }

        this.modalContainer.appendChild(modalWrapper);
        this.activeModals.set(modalId, modalWrapper);

        return modalWrapper;
    }

    /**
     * Show modal with animation
     * 애니메이션과 함께 모달 표시
     * @param {string} modalId - Modal ID
     */
    showModal(modalId) {
        const modalWrapper = this.activeModals.get(modalId);
        if (!modalWrapper) return;

        const backdrop = modalWrapper.querySelector('.modal-backdrop');
        const modal = modalWrapper.querySelector('.modal');

        // Show with animation
        requestAnimationFrame(() => {
            backdrop.classList.add('show');
            modal.classList.add('show');
        });

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close modal
     * 모달 닫기
     * @param {string} modalId - Modal ID
     */
    closeModal(modalId) {
        const modalWrapper = this.activeModals.get(modalId);
        if (!modalWrapper) return;

        const backdrop = modalWrapper.querySelector('.modal-backdrop');
        const modal = modalWrapper.querySelector('.modal');

        // Hide with animation
        backdrop.classList.remove('show');
        modal.classList.remove('show');

        // Remove from DOM after animation
        setTimeout(() => {
            if (modalWrapper.parentNode) {
                modalWrapper.parentNode.removeChild(modalWrapper);
            }
            this.activeModals.delete(modalId);

            // Restore body scroll if no more modals
            if (this.activeModals.size === 0) {
                document.body.style.overflow = '';
            }
        }, 300);
    }

    /**
     * Close the topmost modal
     * 최상위 모달 닫기
     */
    closeTopModal() {
        const modalIds = Array.from(this.activeModals.keys());
        if (modalIds.length > 0) {
            this.closeModal(modalIds[modalIds.length - 1]);
        }
    }

    /**
     * Close all modals
     * 모든 모달 닫기
     */
    closeAll() {
        const modalIds = Array.from(this.activeModals.keys());
        modalIds.forEach(modalId => this.closeModal(modalId));
    }

    /**
     * Generate unique modal ID
     * 고유 모달 ID 생성
     * @returns {string} Unique modal ID
     */
    generateModalId() {
        return `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get icon for modal type
     * 모달 유형에 따른 아이콘 가져오기
     * @param {string} type - Modal type
     * @returns {string} Icon character
     */
    getTypeIcon(type) {
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            danger: '⚠️',
            success: '✅',
            error: '❌'
        };
        
        return icons[type] || icons.info;
    }

    /**
     * Escape HTML characters
     * HTML 문자 이스케이프
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get active modal count
     * 활성 모달 수 가져오기
     * @returns {number} Number of active modals
     */
    getActiveCount() {
        return this.activeModals.size;
    }
}

// Create global instance
const modalManager = new ModalManager();

// Global convenience functions
function showConfirm(options) {
    return modalManager.confirm(options);
}

function showPrompt(options) {
    return modalManager.prompt(options);
}

function showAlert(options) {
    return modalManager.alert(options);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ModalManager, 
        modalManager, 
        showConfirm, 
        showPrompt, 
        showAlert 
    };
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.showConfirm = showConfirm;
    window.showPrompt = showPrompt;
    window.showAlert = showAlert;
    window.modalManager = modalManager;
}