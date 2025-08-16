// Internationalization utility for LaterLens Chrome extension
// 국제화 유틸리티 - 언어 감지 및 텍스트 현지화

class I18nManager {
    constructor() {
        this.currentLanguage = 'en';
        this.supportedLanguages = ['en', 'ko'];
        this.fallbackLanguage = 'en';
        this.init();
    }

    init() {
        this.detectLanguage();
        this.loadMessages();
    }

    /**
     * Detect user's preferred language from browser settings
     * 브라우저 설정에서 사용자의 선호 언어 감지
     */
    detectLanguage() {
        try {
            // Get browser language
            const browserLanguage = chrome.i18n.getUILanguage();
            console.log('Browser language detected:', browserLanguage);

            // Extract language code (e.g., 'ko-KR' -> 'ko')
            const languageCode = browserLanguage.split('-')[0].toLowerCase();

            // Check if the language is supported
            if (this.supportedLanguages.includes(languageCode)) {
                this.currentLanguage = languageCode;
            } else {
                this.currentLanguage = this.fallbackLanguage;
            }

            console.log('Selected language:', this.currentLanguage);
        } catch (error) {
            console.error('Error detecting language:', error);
            this.currentLanguage = this.fallbackLanguage;
        }
    }

    /**
     * Load messages for current language
     * 현재 언어의 메시지 로드
     */
    loadMessages() {
        // Chrome extension i18n API automatically loads the correct locale
        // Chrome 확장 프로그램 i18n API가 자동으로 올바른 로케일을 로드함
        console.log('Messages loaded for language:', this.currentLanguage);
    }

    /**
     * Get localized message by key
     * 키로 현지화된 메시지 가져오기
     * @param {string} key - Message key
     * @param {Array} substitutions - Optional substitution values
     * @returns {string} Localized message
     */
    getMessage(key, substitutions = []) {
        try {
            const message = chrome.i18n.getMessage(key, substitutions);
            
            // If message is empty, return the key as fallback
            if (!message) {
                console.warn(`Missing translation for key: ${key}`);
                return key;
            }
            
            return message;
        } catch (error) {
            console.error(`Error getting message for key ${key}:`, error);
            return key;
        }
    }

    /**
     * Get current language code
     * 현재 언어 코드 가져오기
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get supported languages
     * 지원되는 언어 목록 가져오기
     * @returns {Array} Array of supported language codes
     */
    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    /**
     * Check if a language is supported
     * 언어가 지원되는지 확인
     * @param {string} languageCode - Language code to check
     * @returns {boolean} True if supported
     */
    isLanguageSupported(languageCode) {
        return this.supportedLanguages.includes(languageCode.toLowerCase());
    }

    /**
     * Set language manually (for testing or user preference)
     * 수동으로 언어 설정 (테스트 또는 사용자 기본 설정용)
     * @param {string} languageCode - Language code to set
     * @returns {boolean} True if language was set successfully
     */
    setLanguage(languageCode) {
        const lowerCode = languageCode.toLowerCase();
        if (this.isLanguageSupported(lowerCode)) {
            this.currentLanguage = lowerCode;
            console.log('Language manually set to:', this.currentLanguage);
            return true;
        } else {
            console.warn(`Unsupported language: ${languageCode}`);
            return false;
        }
    }

    /**
     * Get language display name
     * 언어 표시 이름 가져오기
     * @param {string} languageCode - Language code
     * @returns {string} Display name of the language
     */
    getLanguageDisplayName(languageCode) {
        const displayNames = {
            'en': 'English',
            'ko': '한국어',
            'ja': '日本語',
            'zh': '中文',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch'
        };
        
        return displayNames[languageCode] || languageCode.toUpperCase();
    }

    /**
     * Localize all text elements in a container
     * 컨테이너 내의 모든 텍스트 요소 현지화
     * @param {Element} container - Container element to localize
     */
    localizeContainer(container = document) {
        // Find all elements with data-i18n attribute
        const elements = container.querySelectorAll('[data-i18n]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const localizedText = this.getMessage(key);
            
            // Update text content
            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) {
                element.placeholder = localizedText;
            } else if (element.tagName === 'INPUT' && element.type === 'button') {
                element.value = localizedText;
            } else if (element.tagName === 'TEXTAREA') {
                element.placeholder = localizedText;
            } else {
                element.textContent = localizedText;
            }
        });

        // Find all elements with data-i18n-title attribute for tooltips
        const titleElements = container.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const localizedTitle = this.getMessage(key);
            element.title = localizedTitle;
        });

        // Find all elements with data-i18n-placeholder attribute
        const placeholderElements = container.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const localizedPlaceholder = this.getMessage(key);
            element.placeholder = localizedPlaceholder;
        });
    }

    /**
     * Get localized text for common UI elements
     * 일반적인 UI 요소의 현지화된 텍스트 가져오기
     */
    getCommonTexts() {
        return {
            // Common buttons
            save: this.getMessage('save_settings_button'),
            cancel: this.getMessage('cancel_button'),
            confirm: this.getMessage('confirm_button'),
            delete: this.getMessage('popup_delete_all'),
            export: this.getMessage('export_settings_button'),
            import: this.getMessage('import_settings_button'),
            
            // Common status messages
            loading: this.getMessage('popup_loading'),
            ready: this.getMessage('status_ready'),
            saving: this.getMessage('status_saving'),
            saved: this.getMessage('status_saved'),
            error: this.getMessage('status_error'),
            
            // Common labels
            search: this.getMessage('popup_search_placeholder'),
            settings: this.getMessage('options_title'),
            
            // Toast messages
            success: this.getMessage('toast_success'),
            errorMessage: this.getMessage('toast_error'),
            warning: this.getMessage('toast_warning'),
            info: this.getMessage('toast_info')
        };
    }

    /**
     * Format message with substitutions
     * 치환을 사용하여 메시지 형식화
     * @param {string} key - Message key
     * @param {Object} substitutions - Key-value pairs for substitution
     * @returns {string} Formatted message
     */
    formatMessage(key, substitutions = {}) {
        let message = this.getMessage(key);
        
        // Replace placeholders like {count}, {name}, etc.
        Object.keys(substitutions).forEach(placeholder => {
            const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
            message = message.replace(regex, substitutions[placeholder]);
        });
        
        return message;
    }

    /**
     * Get direction for current language (LTR/RTL)
     * 현재 언어의 방향 가져오기 (좌우/우좌)
     * @returns {string} 'ltr' or 'rtl'
     */
    getTextDirection() {
        // For now, all supported languages are LTR
        // 현재 지원되는 모든 언어는 LTR
        const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        return rtlLanguages.includes(this.currentLanguage) ? 'rtl' : 'ltr';
    }

    /**
     * Apply text direction to document
     * 문서에 텍스트 방향 적용
     */
    applyTextDirection() {
        const direction = this.getTextDirection();
        document.documentElement.dir = direction;
        document.documentElement.lang = this.currentLanguage;
    }

    /**
     * Get number formatting for current locale
     * 현재 로케일의 숫자 형식 가져오기
     * @param {number} number - Number to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted number
     */
    formatNumber(number, options = {}) {
        try {
            const locale = this.currentLanguage === 'ko' ? 'ko-KR' : 'en-US';
            return new Intl.NumberFormat(locale, options).format(number);
        } catch (error) {
            console.error('Error formatting number:', error);
            return number.toString();
        }
    }

    /**
     * Get relative time formatting for current locale
     * 현재 로케일의 상대 시간 형식 가져오기
     * @param {Date} date - Date to format
     * @returns {string} Formatted relative time
     */
    formatRelativeTime(date) {
        try {
            const locale = this.currentLanguage === 'ko' ? 'ko-KR' : 'en-US';
            const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
            
            const now = new Date();
            const diffInSeconds = Math.floor((date - now) / 1000);
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            const diffInHours = Math.floor(diffInMinutes / 60);
            const diffInDays = Math.floor(diffInHours / 24);
            
            if (Math.abs(diffInDays) >= 1) {
                return rtf.format(diffInDays, 'day');
            } else if (Math.abs(diffInHours) >= 1) {
                return rtf.format(diffInHours, 'hour');
            } else if (Math.abs(diffInMinutes) >= 1) {
                return rtf.format(diffInMinutes, 'minute');
            } else {
                return rtf.format(diffInSeconds, 'second');
            }
        } catch (error) {
            console.error('Error formatting relative time:', error);
            return date.toLocaleDateString();
        }
    }
}

// Create global instance
const i18n = new I18nManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18nManager, i18n };
}