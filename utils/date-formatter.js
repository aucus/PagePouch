// Date formatting utility for LaterLens Chrome extension
// 날짜 형식화 유틸리티 - 로케일별 날짜 및 시간 형식화

class DateFormatter {
    constructor() {
        this.currentLanguage = 'en';
        this.init();
    }

    init() {
        // Get current language from i18n manager if available
        if (typeof i18n !== 'undefined') {
            this.currentLanguage = i18n.getCurrentLanguage();
        } else if (typeof chrome !== 'undefined' && chrome.i18n) {
            const browserLanguage = chrome.i18n.getUILanguage();
            this.currentLanguage = browserLanguage.split('-')[0].toLowerCase();
        }
    }

    /**
     * Get locale string for Intl APIs
     * Intl API용 로케일 문자열 가져오기
     * @returns {string} Locale string (e.g., 'ko-KR', 'en-US')
     */
    getLocale() {
        const localeMap = {
            'ko': 'ko-KR',
            'en': 'en-US',
            'ja': 'ja-JP',
            'zh': 'zh-CN',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE'
        };
        
        return localeMap[this.currentLanguage] || 'en-US';
    }

    /**
     * Format date according to current locale
     * 현재 로케일에 따라 날짜 형식화
     * @param {Date|string|number} date - Date to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted date string
     */
    formatDate(date, options = {}) {
        try {
            const dateObj = this.parseDate(date);
            if (!dateObj) return 'Invalid Date';

            const locale = this.getLocale();
            const defaultOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            };

            const formatOptions = { ...defaultOptions, ...options };
            return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
        } catch (error) {
            console.error('Error formatting date:', error);
            return this.fallbackDateFormat(date);
        }
    }

    /**
     * Format time according to current locale
     * 현재 로케일에 따라 시간 형식화
     * @param {Date|string|number} date - Date to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted time string
     */
    formatTime(date, options = {}) {
        try {
            const dateObj = this.parseDate(date);
            if (!dateObj) return 'Invalid Time';

            const locale = this.getLocale();
            const defaultOptions = {
                hour: '2-digit',
                minute: '2-digit'
            };

            const formatOptions = { ...defaultOptions, ...options };
            return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
        } catch (error) {
            console.error('Error formatting time:', error);
            return this.fallbackTimeFormat(date);
        }
    }

    /**
     * Format date and time together
     * 날짜와 시간을 함께 형식화
     * @param {Date|string|number} date - Date to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted datetime string
     */
    formatDateTime(date, options = {}) {
        try {
            const dateObj = this.parseDate(date);
            if (!dateObj) return 'Invalid DateTime';

            const locale = this.getLocale();
            const defaultOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };

            const formatOptions = { ...defaultOptions, ...options };
            return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
        } catch (error) {
            console.error('Error formatting datetime:', error);
            return this.fallbackDateTimeFormat(date);
        }
    }

    /**
     * Format relative time (e.g., "2 hours ago", "in 3 days")
     * 상대 시간 형식화 (예: "2시간 전", "3일 후")
     * @param {Date|string|number} date - Date to format
     * @param {Date} baseDate - Base date for comparison (default: now)
     * @returns {string} Formatted relative time string
     */
    formatRelativeTime(date, baseDate = new Date()) {
        try {
            const dateObj = this.parseDate(date);
            const baseDateObj = this.parseDate(baseDate);
            
            if (!dateObj || !baseDateObj) return 'Invalid Date';

            const locale = this.getLocale();
            const rtf = new Intl.RelativeTimeFormat(locale, { 
                numeric: 'auto',
                style: 'long'
            });

            const diffInSeconds = Math.floor((dateObj - baseDateObj) / 1000);
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            const diffInHours = Math.floor(diffInMinutes / 60);
            const diffInDays = Math.floor(diffInHours / 24);
            const diffInWeeks = Math.floor(diffInDays / 7);
            const diffInMonths = Math.floor(diffInDays / 30);
            const diffInYears = Math.floor(diffInDays / 365);

            // Choose appropriate unit based on time difference
            if (Math.abs(diffInYears) >= 1) {
                return rtf.format(diffInYears, 'year');
            } else if (Math.abs(diffInMonths) >= 1) {
                return rtf.format(diffInMonths, 'month');
            } else if (Math.abs(diffInWeeks) >= 1) {
                return rtf.format(diffInWeeks, 'week');
            } else if (Math.abs(diffInDays) >= 1) {
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
            return this.fallbackRelativeTime(date, baseDate);
        }
    }

    /**
     * Format date in short format (e.g., "12/25/2023", "2023-12-25")
     * 짧은 형식으로 날짜 형식화
     * @param {Date|string|number} date - Date to format
     * @returns {string} Short formatted date string
     */
    formatShortDate(date) {
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        };
        return this.formatDate(date, options);
    }

    /**
     * Format date in long format (e.g., "December 25, 2023", "2023년 12월 25일")
     * 긴 형식으로 날짜 형식화
     * @param {Date|string|number} date - Date to format
     * @returns {string} Long formatted date string
     */
    formatLongDate(date) {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return this.formatDate(date, options);
    }

    /**
     * Format date for display in saved pages list
     * 저장된 페이지 목록 표시용 날짜 형식화
     * @param {Date|string|number} date - Date to format
     * @returns {string} Formatted date for UI display
     */
    formatForDisplay(date) {
        const dateObj = this.parseDate(date);
        if (!dateObj) return 'Invalid Date';

        const now = new Date();
        const diffInDays = Math.floor((now - dateObj) / (1000 * 60 * 60 * 24));

        // Show relative time for recent dates, absolute date for older ones
        if (diffInDays === 0) {
            // Today - show relative time
            return this.formatRelativeTime(dateObj);
        } else if (diffInDays === 1) {
            // Yesterday - show "Yesterday" with time
            const timeStr = this.formatTime(dateObj);
            return this.currentLanguage === 'ko' ? `어제 ${timeStr}` : `Yesterday ${timeStr}`;
        } else if (diffInDays < 7) {
            // This week - show day name with time
            const dayOptions = { weekday: 'long' };
            const dayStr = this.formatDate(dateObj, dayOptions);
            const timeStr = this.formatTime(dateObj);
            return `${dayStr} ${timeStr}`;
        } else if (diffInDays < 365) {
            // This year - show month and day
            const options = { month: 'short', day: 'numeric' };
            return this.formatDate(dateObj, options);
        } else {
            // Older - show full date
            return this.formatShortDate(dateObj);
        }
    }

    /**
     * Get localized month names
     * 현지화된 월 이름 가져오기
     * @param {string} format - 'long', 'short', or 'narrow'
     * @returns {Array} Array of month names
     */
    getMonthNames(format = 'long') {
        const locale = this.getLocale();
        const months = [];
        
        for (let i = 0; i < 12; i++) {
            const date = new Date(2023, i, 1); // Use 2023 as a reference year
            const monthName = new Intl.DateTimeFormat(locale, { month: format }).format(date);
            months.push(monthName);
        }
        
        return months;
    }

    /**
     * Get localized day names
     * 현지화된 요일 이름 가져오기
     * @param {string} format - 'long', 'short', or 'narrow'
     * @returns {Array} Array of day names (starting from Sunday)
     */
    getDayNames(format = 'long') {
        const locale = this.getLocale();
        const days = [];
        
        // Start from Sunday (0) to Saturday (6)
        for (let i = 0; i < 7; i++) {
            const date = new Date(2023, 0, i + 1); // January 1, 2023 was a Sunday
            const dayName = new Intl.DateTimeFormat(locale, { weekday: format }).format(date);
            days.push(dayName);
        }
        
        return days;
    }

    /**
     * Parse various date formats into Date object
     * 다양한 날짜 형식을 Date 객체로 파싱
     * @param {Date|string|number} date - Date to parse
     * @returns {Date|null} Parsed Date object or null if invalid
     */
    parseDate(date) {
        if (date instanceof Date) {
            return isNaN(date.getTime()) ? null : date;
        }
        
        if (typeof date === 'string' || typeof date === 'number') {
            const parsed = new Date(date);
            return isNaN(parsed.getTime()) ? null : parsed;
        }
        
        return null;
    }

    /**
     * Fallback date formatting when Intl API fails
     * Intl API 실패 시 폴백 날짜 형식화
     * @param {Date|string|number} date - Date to format
     * @returns {string} Fallback formatted date
     */
    fallbackDateFormat(date) {
        const dateObj = this.parseDate(date);
        if (!dateObj) return 'Invalid Date';

        if (this.currentLanguage === 'ko') {
            return `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
        } else {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
        }
    }

    /**
     * Fallback time formatting when Intl API fails
     * Intl API 실패 시 폴백 시간 형식화
     * @param {Date|string|number} date - Date to format
     * @returns {string} Fallback formatted time
     */
    fallbackTimeFormat(date) {
        const dateObj = this.parseDate(date);
        if (!dateObj) return 'Invalid Time';

        const hours = dateObj.getHours();
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        
        if (this.currentLanguage === 'ko') {
            const period = hours < 12 ? '오전' : '오후';
            const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            return `${period} ${displayHours}:${minutes}`;
        } else {
            const period = hours < 12 ? 'AM' : 'PM';
            const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            return `${displayHours}:${minutes} ${period}`;
        }
    }

    /**
     * Fallback datetime formatting when Intl API fails
     * Intl API 실패 시 폴백 날짜시간 형식화
     * @param {Date|string|number} date - Date to format
     * @returns {string} Fallback formatted datetime
     */
    fallbackDateTimeFormat(date) {
        const dateStr = this.fallbackDateFormat(date);
        const timeStr = this.fallbackTimeFormat(date);
        return `${dateStr} ${timeStr}`;
    }

    /**
     * Fallback relative time formatting when Intl API fails
     * Intl API 실패 시 폴백 상대 시간 형식화
     * @param {Date|string|number} date - Date to format
     * @param {Date} baseDate - Base date for comparison
     * @returns {string} Fallback formatted relative time
     */
    fallbackRelativeTime(date, baseDate = new Date()) {
        const dateObj = this.parseDate(date);
        const baseDateObj = this.parseDate(baseDate);
        
        if (!dateObj || !baseDateObj) return 'Invalid Date';

        const diffInSeconds = Math.floor((dateObj - baseDateObj) / 1000);
        const diffInMinutes = Math.floor(Math.abs(diffInSeconds) / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        const isPast = diffInSeconds < 0;
        
        if (this.currentLanguage === 'ko') {
            if (diffInDays >= 1) {
                return isPast ? `${diffInDays}일 전` : `${diffInDays}일 후`;
            } else if (diffInHours >= 1) {
                return isPast ? `${diffInHours}시간 전` : `${diffInHours}시간 후`;
            } else if (diffInMinutes >= 1) {
                return isPast ? `${diffInMinutes}분 전` : `${diffInMinutes}분 후`;
            } else {
                return isPast ? '방금 전' : '곧';
            }
        } else {
            if (diffInDays >= 1) {
                return isPast ? `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago` : `in ${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
            } else if (diffInHours >= 1) {
                return isPast ? `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago` : `in ${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
            } else if (diffInMinutes >= 1) {
                return isPast ? `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago` : `in ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
            } else {
                return isPast ? 'just now' : 'soon';
            }
        }
    }

    /**
     * Update current language
     * 현재 언어 업데이트
     * @param {string} language - Language code
     */
    setLanguage(language) {
        this.currentLanguage = language;
    }

    /**
     * Get current language
     * 현재 언어 가져오기
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// Create global instance
const dateFormatter = new DateFormatter();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DateFormatter, dateFormatter };
}