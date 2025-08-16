// Auto-localization script for LaterLens Chrome extension
// 자동 현지화 스크립트 - DOM 로드 시 텍스트 현지화

/**
 * Initialize localization when DOM is loaded
 * DOM 로드 시 현지화 초기화
 */
function initializeLocalization() {
    // Apply text direction and language to document
    i18n.applyTextDirection();
    
    // Localize all elements in the document
    i18n.localizeContainer(document);
    
    // Update page title if it has a data-i18n attribute
    const titleElement = document.querySelector('title[data-i18n]');
    if (titleElement) {
        const key = titleElement.getAttribute('data-i18n');
        document.title = i18n.getMessage(key);
    }
    
    console.log('Page localized for language:', i18n.getCurrentLanguage());
}

/**
 * Localize dynamic content
 * 동적 콘텐츠 현지화
 * @param {Element} element - Element to localize
 */
function localizeDynamicContent(element) {
    if (element) {
        i18n.localizeContainer(element);
    }
}

/**
 * Get localized text for JavaScript usage
 * JavaScript 사용을 위한 현지화된 텍스트 가져오기
 * @param {string} key - Message key
 * @param {Array} substitutions - Optional substitution values
 * @returns {string} Localized text
 */
function _(key, substitutions) {
    return i18n.getMessage(key, substitutions);
}

/**
 * Format localized message with named substitutions
 * 명명된 치환을 사용하여 현지화된 메시지 형식화
 * @param {string} key - Message key
 * @param {Object} substitutions - Named substitutions
 * @returns {string} Formatted message
 */
function formatMessage(key, substitutions) {
    return i18n.formatMessage(key, substitutions);
}

/**
 * Update element text with localized content
 * 현지화된 콘텐츠로 요소 텍스트 업데이트
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} messageKey - Message key
 * @param {Array} substitutions - Optional substitutions
 */
function updateElementText(elementOrId, messageKey, substitutions = []) {
    const element = typeof elementOrId === 'string' 
        ? document.getElementById(elementOrId) 
        : elementOrId;
    
    if (element) {
        const localizedText = i18n.getMessage(messageKey, substitutions);
        
        if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) {
            element.placeholder = localizedText;
        } else if (element.tagName === 'INPUT' && element.type === 'button') {
            element.value = localizedText;
        } else if (element.tagName === 'TEXTAREA') {
            element.placeholder = localizedText;
        } else {
            element.textContent = localizedText;
        }
    }
}

/**
 * Create localized HTML content
 * 현지화된 HTML 콘텐츠 생성
 * @param {string} template - HTML template with {{key}} placeholders
 * @param {Object} data - Data for substitution
 * @returns {string} Localized HTML
 */
function createLocalizedHTML(template, data = {}) {
    let html = template;
    
    // Replace localization keys like {{popup_title}}
    html = html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        return i18n.getMessage(key.trim());
    });
    
    // Replace data substitutions like {count}, {name}
    Object.keys(data).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        html = html.replace(regex, data[key]);
    });
    
    return html;
}

/**
 * Localize select options
 * 선택 옵션 현지화
 * @param {string|Element} selectElementOrId - Select element or ID
 * @param {Array} options - Array of {value, messageKey} objects
 */
function localizeSelectOptions(selectElementOrId, options) {
    const selectElement = typeof selectElementOrId === 'string' 
        ? document.getElementById(selectElementOrId) 
        : selectElementOrId;
    
    if (!selectElement) return;
    
    // Clear existing options
    selectElement.innerHTML = '';
    
    // Add localized options
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = i18n.getMessage(option.messageKey);
        selectElement.appendChild(optionElement);
    });
}

/**
 * Get common localized texts for UI
 * UI용 일반적인 현지화된 텍스트 가져오기
 * @returns {Object} Object with common localized texts
 */
function getCommonTexts() {
    return i18n.getCommonTexts();
}

/**
 * Format number according to current locale
 * 현재 로케일에 따라 숫자 형식화
 * @param {number} number - Number to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number
 */
function formatNumber(number, options = {}) {
    return i18n.formatNumber(number, options);
}

/**
 * Format date according to current locale
 * 현재 로케일에 따라 날짜 형식화
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date
 */
function formatDate(date, options = {}) {
    if (typeof dateFormatter !== 'undefined') {
        return dateFormatter.formatDate(date, options);
    }
    
    // Fallback if dateFormatter is not available
    try {
        const locale = i18n.getCurrentLanguage() === 'ko' ? 'ko-KR' : 'en-US';
        const dateObj = new Date(date);
        return new Intl.DateTimeFormat(locale, options).format(dateObj);
    } catch (error) {
        console.error('Error formatting date:', error);
        return new Date(date).toLocaleDateString();
    }
}

/**
 * Format time according to current locale
 * 현재 로케일에 따라 시간 형식화
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted time
 */
function formatTime(date, options = {}) {
    if (typeof dateFormatter !== 'undefined') {
        return dateFormatter.formatTime(date, options);
    }
    
    // Fallback if dateFormatter is not available
    try {
        const locale = i18n.getCurrentLanguage() === 'ko' ? 'ko-KR' : 'en-US';
        const dateObj = new Date(date);
        const defaultOptions = { hour: '2-digit', minute: '2-digit' };
        return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
    } catch (error) {
        console.error('Error formatting time:', error);
        return new Date(date).toLocaleTimeString();
    }
}

/**
 * Format date and time together
 * 날짜와 시간을 함께 형식화
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted datetime
 */
function formatDateTime(date, options = {}) {
    if (typeof dateFormatter !== 'undefined') {
        return dateFormatter.formatDateTime(date, options);
    }
    
    // Fallback if dateFormatter is not available
    try {
        const locale = i18n.getCurrentLanguage() === 'ko' ? 'ko-KR' : 'en-US';
        const dateObj = new Date(date);
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
    } catch (error) {
        console.error('Error formatting datetime:', error);
        return new Date(date).toLocaleString();
    }
}

/**
 * Format relative time according to current locale
 * 현재 로케일에 따라 상대 시간 형식화
 * @param {Date|string|number} date - Date to format
 * @param {Date} baseDate - Base date for comparison (optional)
 * @returns {string} Formatted relative time
 */
function formatRelativeTime(date, baseDate) {
    if (typeof dateFormatter !== 'undefined') {
        return dateFormatter.formatRelativeTime(date, baseDate);
    }
    
    // Fallback if dateFormatter is not available
    return i18n.formatRelativeTime(new Date(date));
}

/**
 * Format date for display in UI (smart formatting)
 * UI 표시용 날짜 형식화 (스마트 형식화)
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date for display
 */
function formatForDisplay(date) {
    if (typeof dateFormatter !== 'undefined') {
        return dateFormatter.formatForDisplay(date);
    }
    
    // Fallback to relative time
    return formatRelativeTime(date);
}

/**
 * Format short date (e.g., "12/25/2023", "2023-12-25")
 * 짧은 날짜 형식화
 * @param {Date|string|number} date - Date to format
 * @returns {string} Short formatted date
 */
function formatShortDate(date) {
    if (typeof dateFormatter !== 'undefined') {
        return dateFormatter.formatShortDate(date);
    }
    
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return formatDate(date, options);
}

/**
 * Format long date (e.g., "December 25, 2023", "2023년 12월 25일")
 * 긴 날짜 형식화
 * @param {Date|string|number} date - Date to format
 * @returns {string} Long formatted date
 */
function formatLongDate(date) {
    if (typeof dateFormatter !== 'undefined') {
        return dateFormatter.formatLongDate(date);
    }
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return formatDate(date, options);
}

/**
 * Get current language code
 * 현재 언어 코드 가져오기
 * @returns {string} Current language code
 */
function getCurrentLanguage() {
    return i18n.getCurrentLanguage();
}

/**
 * Check if current language is Korean
 * 현재 언어가 한국어인지 확인
 * @returns {boolean} True if Korean
 */
function isKorean() {
    return i18n.getCurrentLanguage() === 'ko';
}

/**
 * Check if current language is English
 * 현재 언어가 영어인지 확인
 * @returns {boolean} True if English
 */
function isEnglish() {
    return i18n.getCurrentLanguage() === 'en';
}

/**
 * Localize error messages
 * 오류 메시지 현지화
 * @param {string} errorType - Type of error
 * @param {Object} details - Error details
 * @returns {string} Localized error message
 */
function getLocalizedErrorMessage(errorType, details = {}) {
    const errorMessages = {
        'network': isKorean() ? '네트워크 오류가 발생했습니다.' : 'A network error occurred.',
        'storage': isKorean() ? '저장소 오류가 발생했습니다.' : 'A storage error occurred.',
        'api': isKorean() ? 'API 오류가 발생했습니다.' : 'An API error occurred.',
        'validation': isKorean() ? '입력값이 올바르지 않습니다.' : 'Invalid input provided.',
        'permission': isKorean() ? '권한이 필요합니다.' : 'Permission required.',
        'unknown': isKorean() ? '알 수 없는 오류가 발생했습니다.' : 'An unknown error occurred.'
    };
    
    let message = errorMessages[errorType] || errorMessages['unknown'];
    
    // Add details if provided
    if (details.message) {
        message += ` ${details.message}`;
    }
    
    return message;
}

/**
 * Initialize localization when DOM is ready
 * DOM 준비 시 현지화 초기화
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLocalization);
} else {
    // DOM is already loaded
    initializeLocalization();
}

// Export functions for global use
window._ = _;
window.formatMessage = formatMessage;
window.updateElementText = updateElementText;
window.createLocalizedHTML = createLocalizedHTML;
window.localizeSelectOptions = localizeSelectOptions;
window.localizeDynamicContent = localizeDynamicContent;
window.getCommonTexts = getCommonTexts;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.formatDateTime = formatDateTime;
window.formatRelativeTime = formatRelativeTime;
window.formatForDisplay = formatForDisplay;
window.formatShortDate = formatShortDate;
window.formatLongDate = formatLongDate;
window.getCurrentLanguage = getCurrentLanguage;
window.isKorean = isKorean;
window.isEnglish = isEnglish;
window.getLocalizedErrorMessage = getLocalizedErrorMessage;