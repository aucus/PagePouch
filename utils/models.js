// Data models for LaterLens Chrome extension
// 데이터 모델 - LaterLens 확장 프로그램의 핵심 데이터 구조

/**
 * SavedPage model class for managing saved page data
 * 저장된 페이지 데이터 관리를 위한 SavedPage 모델 클래스
 */
class SavedPage {
    constructor(data = {}) {
        // Required fields
        this.id = data.id || this.generateId();
        this.url = data.url || '';
        this.title = data.title || '';
        this.timestamp = data.timestamp || Date.now();
        
        // Optional fields with defaults
        this.summary = data.summary || '요약 없음';
        this.thumbnail = data.thumbnail || '';
        this.domain = data.domain || this.extractDomain(this.url);
        this.description = data.description || '';
        this.ogImage = data.ogImage || null;
        this.favicon = data.favicon || null;
        this.tags = data.tags || [];
        this.isArchived = data.isArchived || false;
        this.lastAccessed = data.lastAccessed || null;
        
        // Metadata
        this.createdAt = data.createdAt || Date.now();
        this.updatedAt = data.updatedAt || Date.now();
        this.version = data.version || '1.0.0';
    }

    /**
     * Generate unique ID for the page
     * 페이지용 고유 ID 생성
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Extract domain from URL
     * URL에서 도메인 추출
     */
    extractDomain(url) {
        try {
            if (!url) return 'unknown';
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            console.warn('Invalid URL for domain extraction:', url);
            return 'unknown';
        }
    }

    /**
     * Validate the SavedPage data
     * SavedPage 데이터 검증
     */
    static validate(data) {
        const errors = [];
        const warnings = [];

        // Required field validation
        if (!data.url || typeof data.url !== 'string') {
            errors.push('URL is required and must be a string');
        } else if (!this.isValidUrl(data.url)) {
            errors.push('URL must be a valid HTTP/HTTPS URL');
        }

        if (!data.title || typeof data.title !== 'string') {
            errors.push('Title is required and must be a string');
        } else if (data.title.trim().length === 0) {
            errors.push('Title cannot be empty');
        } else if (data.title.length > 500) {
            warnings.push('Title is very long (>500 characters)');
        }

        // Optional field validation
        if (data.id && typeof data.id !== 'string') {
            errors.push('ID must be a string');
        }

        if (data.summary && typeof data.summary !== 'string') {
            errors.push('Summary must be a string');
        } else if (data.summary && data.summary.length > 1000) {
            warnings.push('Summary is very long (>1000 characters)');
        }

        if (data.thumbnail && typeof data.thumbnail !== 'string') {
            errors.push('Thumbnail must be a string');
        } else if (data.thumbnail && !this.isValidDataUrl(data.thumbnail) && !this.isValidUrl(data.thumbnail)) {
            warnings.push('Thumbnail should be a valid data URL or HTTP URL');
        }

        if (data.timestamp && (!Number.isInteger(data.timestamp) || data.timestamp < 0)) {
            errors.push('Timestamp must be a positive integer');
        }

        if (data.tags && !Array.isArray(data.tags)) {
            errors.push('Tags must be an array');
        } else if (data.tags) {
            data.tags.forEach((tag, index) => {
                if (typeof tag !== 'string') {
                    errors.push(`Tag at index ${index} must be a string`);
                }
            });
        }

        if (data.isArchived !== undefined && typeof data.isArchived !== 'boolean') {
            errors.push('isArchived must be a boolean');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    /**
     * Validate current instance
     * 현재 인스턴스 검증
     */
    validate() {
        return SavedPage.validate(this.toJSON());
    }

    /**
     * Check if URL is valid
     * URL 유효성 검사
     */
    static isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    /**
     * Check if string is a valid data URL
     * 데이터 URL 유효성 검사
     */
    static isValidDataUrl(string) {
        return typeof string === 'string' && string.startsWith('data:');
    }

    /**
     * Sanitize and clean data
     * 데이터 정리 및 정화
     */
    sanitize() {
        // Trim whitespace from string fields
        this.title = this.title.trim();
        this.summary = this.summary.trim();
        this.url = this.url.trim();
        
        // Ensure domain is extracted correctly
        this.domain = this.extractDomain(this.url);
        
        // Clean tags
        if (this.tags) {
            this.tags = this.tags
                .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
                .map(tag => tag.trim().toLowerCase())
                .filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates
        }
        
        // Update timestamp
        this.updatedAt = Date.now();
        
        return this;
    }

    /**
     * Convert to JSON object
     * JSON 객체로 변환
     */
    toJSON() {
        return {
            id: this.id,
            url: this.url,
            title: this.title,
            summary: this.summary,
            thumbnail: this.thumbnail,
            timestamp: this.timestamp,
            domain: this.domain,
            description: this.description,
            ogImage: this.ogImage,
            favicon: this.favicon,
            tags: this.tags,
            isArchived: this.isArchived,
            lastAccessed: this.lastAccessed,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            version: this.version
        };
    }

    /**
     * Create SavedPage from JSON data
     * JSON 데이터에서 SavedPage 생성
     */
    static fromJSON(data) {
        return new SavedPage(data);
    }

    /**
     * Clone the current instance
     * 현재 인스턴스 복제
     */
    clone() {
        return new SavedPage(this.toJSON());
    }

    /**
     * Update page data
     * 페이지 데이터 업데이트
     */
    update(data) {
        const allowedFields = [
            'title', 'summary', 'thumbnail', 'description', 
            'tags', 'isArchived', 'lastAccessed'
        ];
        
        allowedFields.forEach(field => {
            if (data.hasOwnProperty(field)) {
                this[field] = data[field];
            }
        });
        
        this.updatedAt = Date.now();
        return this.sanitize();
    }

    /**
     * Mark page as accessed
     * 페이지를 접근됨으로 표시
     */
    markAsAccessed() {
        this.lastAccessed = Date.now();
        this.updatedAt = Date.now();
        return this;
    }

    /**
     * Add tag to page
     * 페이지에 태그 추가
     */
    addTag(tag) {
        if (typeof tag !== 'string' || tag.trim().length === 0) {
            return this;
        }
        
        const cleanTag = tag.trim().toLowerCase();
        if (!this.tags.includes(cleanTag)) {
            this.tags.push(cleanTag);
            this.updatedAt = Date.now();
        }
        
        return this;
    }

    /**
     * Remove tag from page
     * 페이지에서 태그 제거
     */
    removeTag(tag) {
        if (typeof tag !== 'string') {
            return this;
        }
        
        const cleanTag = tag.trim().toLowerCase();
        const index = this.tags.indexOf(cleanTag);
        
        if (index > -1) {
            this.tags.splice(index, 1);
            this.updatedAt = Date.now();
        }
        
        return this;
    }

    /**
     * Check if page matches search query
     * 페이지가 검색 쿼리와 일치하는지 확인
     */
    matchesQuery(query) {
        if (!query || typeof query !== 'string') {
            return true;
        }
        
        const searchTerm = query.toLowerCase();
        const searchableFields = [
            this.title,
            this.summary,
            this.url,
            this.domain,
            this.description,
            ...this.tags
        ];
        
        return searchableFields.some(field => 
            field && field.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Get page age in days
     * 페이지 생성 후 경과 일수 가져오기
     */
    getAgeInDays() {
        const now = Date.now();
        const diffTime = Math.abs(now - this.createdAt);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Check if page is recently created (within 7 days)
     * 페이지가 최근 생성되었는지 확인 (7일 이내)
     */
    isRecent() {
        return this.getAgeInDays() <= 7;
    }

    /**
     * Get formatted creation date
     * 형식화된 생성 날짜 가져오기
     */
    getFormattedDate(locale = 'en-US') {
        return new Date(this.createdAt).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

/**
 * ExtensionSettings model class for managing extension settings
 * 확장 프로그램 설정 관리를 위한 ExtensionSettings 모델 클래스
 */
class ExtensionSettings {
    constructor(data = {}) {
        // AI Settings
        this.enableAISummary = data.enableAISummary || false;
        this.apiProvider = data.apiProvider || 'openai';
        this.apiKey = data.apiKey || '';
        
        // Storage Settings
        this.maxStorageItems = data.maxStorageItems || 1000;
        this.thumbnailQuality = data.thumbnailQuality || 0.8;
        this.autoCleanup = data.autoCleanup || false;
        this.cleanupDays = data.cleanupDays || 90;
        
        // UI Settings
        this.language = data.language || 'auto';
        this.theme = data.theme || 'light';
        this.gridColumns = data.gridColumns || 1;
        this.showDomain = data.showDomain !== false; // Default true
        this.showDate = data.showDate !== false; // Default true
        
        // Privacy Settings
        this.enableAnalytics = data.enableAnalytics || false;
        this.shareUsageData = data.shareUsageData || false;
        
        // Metadata
        this.version = data.version || '1.0.0';
        this.createdAt = data.createdAt || Date.now();
        this.updatedAt = data.updatedAt || Date.now();
    }

    /**
     * Validate settings data
     * 설정 데이터 검증
     */
    static validate(data) {
        const errors = [];
        const warnings = [];

        // Boolean validations
        const booleanFields = [
            'enableAISummary', 'autoCleanup', 'showDomain', 
            'showDate', 'enableAnalytics', 'shareUsageData'
        ];
        
        booleanFields.forEach(field => {
            if (data[field] !== undefined && typeof data[field] !== 'boolean') {
                errors.push(`${field} must be a boolean`);
            }
        });

        // Number validations
        if (data.maxStorageItems !== undefined) {
            if (!Number.isInteger(data.maxStorageItems) || data.maxStorageItems < 10 || data.maxStorageItems > 10000) {
                errors.push('maxStorageItems must be an integer between 10 and 10000');
            }
        }

        if (data.thumbnailQuality !== undefined) {
            if (typeof data.thumbnailQuality !== 'number' || data.thumbnailQuality < 0.1 || data.thumbnailQuality > 1) {
                errors.push('thumbnailQuality must be a number between 0.1 and 1');
            }
        }

        if (data.cleanupDays !== undefined) {
            if (!Number.isInteger(data.cleanupDays) || data.cleanupDays < 1 || data.cleanupDays > 365) {
                errors.push('cleanupDays must be an integer between 1 and 365');
            }
        }

        if (data.gridColumns !== undefined) {
            if (!Number.isInteger(data.gridColumns) || data.gridColumns < 1 || data.gridColumns > 3) {
                errors.push('gridColumns must be an integer between 1 and 3');
            }
        }

        // String validations
        if (data.apiProvider !== undefined) {
            const validProviders = ['openai', 'anthropic', 'gemini', 'ollama'];
            if (!validProviders.includes(data.apiProvider)) {
                errors.push(`apiProvider must be one of: ${validProviders.join(', ')}`);
            }
        }

        if (data.language !== undefined) {
            const validLanguages = ['auto', 'en', 'ko'];
            if (!validLanguages.includes(data.language)) {
                errors.push(`language must be one of: ${validLanguages.join(', ')}`);
            }
        }

        if (data.theme !== undefined) {
            const validThemes = ['light', 'dark', 'auto'];
            if (!validThemes.includes(data.theme)) {
                errors.push(`theme must be one of: ${validThemes.join(', ')}`);
            }
        }

        // API key validation
        if (data.enableAISummary && (!data.apiKey || data.apiKey.trim().length === 0)) {
            warnings.push('AI summary is enabled but no API key is provided');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    /**
     * Validate current instance
     * 현재 인스턴스 검증
     */
    validate() {
        return ExtensionSettings.validate(this.toJSON());
    }

    /**
     * Get default settings
     * 기본 설정 가져오기
     */
    static getDefaults() {
        return new ExtensionSettings();
    }

    /**
     * Convert to JSON object
     * JSON 객체로 변환
     */
    toJSON() {
        return {
            enableAISummary: this.enableAISummary,
            apiProvider: this.apiProvider,
            apiKey: this.apiKey,
            maxStorageItems: this.maxStorageItems,
            thumbnailQuality: this.thumbnailQuality,
            autoCleanup: this.autoCleanup,
            cleanupDays: this.cleanupDays,
            language: this.language,
            theme: this.theme,
            gridColumns: this.gridColumns,
            showDomain: this.showDomain,
            showDate: this.showDate,
            enableAnalytics: this.enableAnalytics,
            shareUsageData: this.shareUsageData,
            version: this.version,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create ExtensionSettings from JSON data
     * JSON 데이터에서 ExtensionSettings 생성
     */
    static fromJSON(data) {
        return new ExtensionSettings(data);
    }

    /**
     * Update settings
     * 설정 업데이트
     */
    update(data) {
        Object.keys(data).forEach(key => {
            if (this.hasOwnProperty(key) && key !== 'createdAt' && key !== 'version') {
                this[key] = data[key];
            }
        });
        
        this.updatedAt = Date.now();
        return this;
    }

    /**
     * Reset to defaults
     * 기본값으로 재설정
     */
    reset() {
        const defaults = ExtensionSettings.getDefaults();
        Object.assign(this, defaults.toJSON());
        this.updatedAt = Date.now();
        return this;
    }

    /**
     * Check if AI features are properly configured
     * AI 기능이 올바르게 구성되었는지 확인
     */
    isAIConfigured() {
        return this.enableAISummary && 
               this.apiKey && 
               this.apiKey.trim().length > 0 && 
               this.apiProvider;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SavedPage, ExtensionSettings };
} else if (typeof window !== 'undefined') {
    window.SavedPage = SavedPage;
    window.ExtensionSettings = ExtensionSettings;
}