// Extension settings management for LaterLens Chrome extension
// 확장 프로그램 설정 관리 - LaterLens 크롬 확장 프로그램

// Import models if available
if (typeof ExtensionSettings === 'undefined' && typeof require !== 'undefined') {
    const { ExtensionSettings } = require('./models.js');
}

/**
 * Settings manager class for handling extension configuration
 * 확장 프로그램 구성 처리를 위한 설정 관리자 클래스
 */
class SettingsManager {
    constructor() {
        this.SETTINGS_KEY = 'settings';
        this.CACHE_KEY = 'settings_cache';
        this.MIGRATION_KEY = 'settings_migration';
        
        // Settings cache for performance
        this.cache = null;
        this.cacheExpiry = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        
        // Migration version tracking
        this.CURRENT_VERSION = '1.0.0';
        
        // Event listeners for settings changes
        this.listeners = new Map();
        this.listenerIdCounter = 0;
        
        // Initialize settings
        this.initialize();
    }

    /**
     * Initialize settings manager
     * 설정 관리자 초기화
     */
    async initialize() {
        try {
            // Check if migration is needed
            await this.checkAndPerformMigration();
            
            // Load initial settings into cache
            await this.loadSettings();
            
            // Set up storage change listener
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.onChanged.addListener((changes, namespace) => {
                    if (namespace === 'local' && changes[this.SETTINGS_KEY]) {
                        this.handleStorageChange(changes[this.SETTINGS_KEY]);
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to initialize settings manager:', error);
        }
    }

    /**
     * Check and perform settings migration if needed
     * 필요한 경우 설정 마이그레이션 확인 및 수행
     */
    async checkAndPerformMigration() {
        try {
            const result = await chrome.storage.local.get([this.MIGRATION_KEY]);
            const migrationInfo = result[this.MIGRATION_KEY] || { version: '0.0.0' };
            
            if (migrationInfo.version !== this.CURRENT_VERSION) {
                console.log(`Migrating settings from ${migrationInfo.version} to ${this.CURRENT_VERSION}`);
                await this.performMigration(migrationInfo.version);
                
                // Update migration info
                await chrome.storage.local.set({
                    [this.MIGRATION_KEY]: {
                        version: this.CURRENT_VERSION,
                        migratedAt: Date.now(),
                        previousVersion: migrationInfo.version
                    }
                });
            }
        } catch (error) {
            console.warn('Migration check failed:', error);
        }
    }

    /**
     * Perform settings migration
     * 설정 마이그레이션 수행
     */
    async performMigration(fromVersion) {
        try {
            const currentSettings = await this.getRawSettings();
            let migratedSettings = { ...currentSettings };
            
            // Migration logic based on version
            if (this.compareVersions(fromVersion, '1.0.0') < 0) {
                // Migrate from pre-1.0.0 versions
                migratedSettings = this.migrateToV1(migratedSettings);
            }
            
            // Validate migrated settings
            const settings = ExtensionSettings.fromJSON(migratedSettings);
            const validation = settings.validate();
            
            if (validation.isValid) {
                await chrome.storage.local.set({ [this.SETTINGS_KEY]: settings.toJSON() });
                console.log('Settings migration completed successfully');
            } else {
                console.warn('Migration resulted in invalid settings, using defaults');
                await this.resetToDefaults();
            }
        } catch (error) {
            console.error('Settings migration failed:', error);
            await this.resetToDefaults();
        }
    }

    /**
     * Migrate settings to version 1.0.0
     * 설정을 버전 1.0.0으로 마이그레이션
     */
    migrateToV1(settings) {
        const migrated = { ...settings };
        
        // Add new fields with defaults
        if (!migrated.hasOwnProperty('autoCleanup')) {
            migrated.autoCleanup = false;
        }
        if (!migrated.hasOwnProperty('cleanupDays')) {
            migrated.cleanupDays = 90;
        }
        if (!migrated.hasOwnProperty('theme')) {
            migrated.theme = 'light';
        }
        if (!migrated.hasOwnProperty('gridColumns')) {
            migrated.gridColumns = 1;
        }
        if (!migrated.hasOwnProperty('showDomain')) {
            migrated.showDomain = true;
        }
        if (!migrated.hasOwnProperty('showDate')) {
            migrated.showDate = true;
        }
        
        // Rename or transform existing fields if needed
        if (migrated.hasOwnProperty('aiEnabled')) {
            migrated.enableAISummary = migrated.aiEnabled;
            delete migrated.aiEnabled;
        }
        
        return migrated;
    }

    /**
     * Compare version strings
     * 버전 문자열 비교
     */
    compareVersions(version1, version2) {
        const v1parts = version1.split('.').map(Number);
        const v2parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
            const v1part = v1parts[i] || 0;
            const v2part = v2parts[i] || 0;
            
            if (v1part < v2part) return -1;
            if (v1part > v2part) return 1;
        }
        
        return 0;
    }

    /**
     * Load settings from storage
     * 스토리지에서 설정 로드
     */
    async loadSettings() {
        try {
            const rawSettings = await this.getRawSettings();
            
            if (rawSettings && Object.keys(rawSettings).length > 0) {
                const settings = ExtensionSettings.fromJSON(rawSettings);
                const validation = settings.validate();
                
                if (validation.isValid) {
                    this.updateCache(settings.toJSON());
                    return settings.toJSON();
                } else {
                    console.warn('Invalid settings found, using defaults:', validation.errors);
                }
            }
            
            // Use defaults if no valid settings found
            const defaultSettings = ExtensionSettings.getDefaults().toJSON();
            await this.saveSettings(defaultSettings);
            return defaultSettings;
        } catch (error) {
            console.error('Failed to load settings:', error);
            const defaultSettings = ExtensionSettings.getDefaults().toJSON();
            this.updateCache(defaultSettings);
            return defaultSettings;
        }
    }

    /**
     * Get raw settings from storage without validation
     * 검증 없이 스토리지에서 원시 설정 가져오기
     */
    async getRawSettings() {
        try {
            const result = await chrome.storage.local.get([this.SETTINGS_KEY]);
            return result[this.SETTINGS_KEY] || {};
        } catch (error) {
            console.error('Failed to get raw settings:', error);
            return {};
        }
    }

    /**
     * Get current settings (with caching)
     * 현재 설정 가져오기 (캐싱 포함)
     */
    async getSettings() {
        try {
            // Return cached settings if valid
            if (this.cache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
                return { ...this.cache };
            }
            
            // Load fresh settings
            return await this.loadSettings();
        } catch (error) {
            console.error('Failed to get settings:', error);
            return ExtensionSettings.getDefaults().toJSON();
        }
    }

    /**
     * Save settings to storage
     * 설정을 스토리지에 저장
     */
    async saveSettings(settingsData) {
        try {
            console.log('SettingsManager: Saving settings:', settingsData);
            
            // Validate settings
            const settings = ExtensionSettings.fromJSON(settingsData);
            const validation = settings.validate();
            
            if (!validation.isValid) {
                console.error('Settings validation failed:', validation.errors);
                throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
            }
            
            // Log warnings if any
            if (validation.warnings.length > 0) {
                console.warn('Settings warnings:', validation.warnings);
            }
            
            // Update timestamps
            const finalSettings = {
                ...settings.toJSON(),
                updatedAt: Date.now()
            };
            
            console.log('SettingsManager: Final settings to save:', finalSettings);
            
            // Save to storage
            await chrome.storage.local.set({ [this.SETTINGS_KEY]: finalSettings });
            console.log('SettingsManager: Settings saved to storage');
            
            // Update cache
            this.updateCache(finalSettings);
            
            // Notify listeners
            this.notifyListeners('updated', finalSettings);
            
            return { success: true, data: finalSettings };
        } catch (error) {
            console.error('Failed to save settings:', error);
            throw new Error(`Failed to save settings: ${error.message}`);
        }
    }

    /**
     * Update specific setting
     * 특정 설정 업데이트
     */
    async updateSetting(key, value) {
        try {
            const currentSettings = await this.getSettings();
            const updatedSettings = { ...currentSettings, [key]: value };
            
            return await this.saveSettings(updatedSettings);
        } catch (error) {
            console.error(`Failed to update setting ${key}:`, error);
            throw error;
        }
    }

    /**
     * Update multiple settings
     * 여러 설정 업데이트
     */
    async updateSettings(updates) {
        try {
            const currentSettings = await this.getSettings();
            const updatedSettings = { ...currentSettings, ...updates };
            
            return await this.saveSettings(updatedSettings);
        } catch (error) {
            console.error('Failed to update settings:', error);
            throw error;
        }
    }

    /**
     * Reset settings to defaults
     * 설정을 기본값으로 재설정
     */
    async resetToDefaults() {
        try {
            const defaultSettings = ExtensionSettings.getDefaults().toJSON();
            const result = await this.saveSettings(defaultSettings);
            
            // Notify listeners
            this.notifyListeners('reset', defaultSettings);
            
            return result;
        } catch (error) {
            console.error('Failed to reset settings:', error);
            throw error;
        }
    }

    /**
     * Get specific setting value
     * 특정 설정 값 가져오기
     */
    async getSetting(key, defaultValue = null) {
        try {
            const settings = await this.getSettings();
            return settings.hasOwnProperty(key) ? settings[key] : defaultValue;
        } catch (error) {
            console.error(`Failed to get setting ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Check if AI features are configured
     * AI 기능이 구성되었는지 확인
     */
    async isAIConfigured() {
        try {
            const settings = await this.getSettings();
            return settings.enableAISummary && 
                   settings.apiKey && 
                   settings.apiKey.trim().length > 0;
        } catch (error) {
            console.error('Failed to check AI configuration:', error);
            return false;
        }
    }

    /**
     * Validate API key format
     * API 키 형식 검증
     */
    validateAPIKey(apiKey, provider = 'openai') {
        if (!apiKey || typeof apiKey !== 'string') {
            return { isValid: false, error: 'API key is required' };
        }
        
        const trimmedKey = apiKey.trim();
        
        switch (provider) {
            case 'openai':
                if (!trimmedKey.startsWith('sk-') || trimmedKey.length < 20) {
                    return { 
                        isValid: false, 
                        error: 'OpenAI API key must start with "sk-" and be at least 20 characters long' 
                    };
                }
                break;
                
            case 'anthropic':
                if (!trimmedKey.startsWith('sk-ant-') || trimmedKey.length < 30) {
                    return { 
                        isValid: false, 
                        error: 'Anthropic API key must start with "sk-ant-" and be at least 30 characters long' 
                    };
                }
                break;
                
            default:
                return { isValid: false, error: 'Unsupported API provider' };
        }
        
        return { isValid: true };
    }

    /**
     * Export settings for backup
     * 백업용 설정 내보내기
     */
    async exportSettings() {
        try {
            const settings = await this.getSettings();
            
            return {
                version: this.CURRENT_VERSION,
                exportedAt: new Date().toISOString(),
                settings: settings
            };
        } catch (error) {
            console.error('Failed to export settings:', error);
            throw error;
        }
    }

    /**
     * Import settings from backup
     * 백업에서 설정 가져오기
     */
    async importSettings(backupData) {
        try {
            if (!backupData || !backupData.settings) {
                throw new Error('Invalid backup data format');
            }
            
            // Validate imported settings
            const settings = ExtensionSettings.fromJSON(backupData.settings);
            const validation = settings.validate();
            
            if (!validation.isValid) {
                throw new Error(`Invalid settings in backup: ${validation.errors.join(', ')}`);
            }
            
            // Save imported settings
            const result = await this.saveSettings(settings.toJSON());
            
            // Notify listeners
            this.notifyListeners('imported', settings.toJSON());
            
            return {
                success: true,
                importedVersion: backupData.version,
                warnings: validation.warnings
            };
        } catch (error) {
            console.error('Failed to import settings:', error);
            throw error;
        }
    }

    /**
     * Update cache
     * 캐시 업데이트
     */
    updateCache(settings) {
        this.cache = { ...settings };
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
    }

    /**
     * Clear cache
     * 캐시 지우기
     */
    clearCache() {
        this.cache = null;
        this.cacheExpiry = null;
    }

    /**
     * Handle storage change events
     * 스토리지 변경 이벤트 처리
     */
    handleStorageChange(change) {
        try {
            if (change.newValue) {
                this.updateCache(change.newValue);
                this.notifyListeners('changed', change.newValue, change.oldValue);
            }
        } catch (error) {
            console.warn('Failed to handle storage change:', error);
        }
    }

    /**
     * Add settings change listener
     * 설정 변경 리스너 추가
     */
    addListener(callback) {
        const id = ++this.listenerIdCounter;
        this.listeners.set(id, callback);
        return id;
    }

    /**
     * Remove settings change listener
     * 설정 변경 리스너 제거
     */
    removeListener(id) {
        return this.listeners.delete(id);
    }

    /**
     * Notify all listeners of settings changes
     * 모든 리스너에게 설정 변경 알림
     */
    notifyListeners(event, newSettings, oldSettings = null) {
        this.listeners.forEach(callback => {
            try {
                callback(event, newSettings, oldSettings);
            } catch (error) {
                console.warn('Settings listener error:', error);
            }
        });
    }

    /**
     * Get settings summary for debugging
     * 디버깅용 설정 요약 가져오기
     */
    async getSettingsSummary() {
        try {
            const settings = await this.getSettings();
            
            return {
                version: this.CURRENT_VERSION,
                aiConfigured: await this.isAIConfigured(),
                language: settings.language,
                maxStorageItems: settings.maxStorageItems,
                thumbnailQuality: settings.thumbnailQuality,
                theme: settings.theme,
                cacheStatus: {
                    cached: this.cache !== null,
                    expiry: this.cacheExpiry,
                    expired: this.cacheExpiry ? Date.now() > this.cacheExpiry : true
                },
                listeners: this.listeners.size
            };
        } catch (error) {
            console.error('Failed to get settings summary:', error);
            return { error: error.message };
        }
    }

    /**
     * Perform settings health check
     * 설정 상태 검사 수행
     */
    async performHealthCheck() {
        try {
            const issues = [];
            const warnings = [];
            
            // Check if settings exist
            const rawSettings = await this.getRawSettings();
            if (!rawSettings || Object.keys(rawSettings).length === 0) {
                issues.push('No settings found in storage');
            }
            
            // Validate current settings
            const settings = await this.getSettings();
            const settingsObj = ExtensionSettings.fromJSON(settings);
            const validation = settingsObj.validate();
            
            if (!validation.isValid) {
                issues.push(...validation.errors);
            }
            warnings.push(...validation.warnings);
            
            // Check AI configuration if enabled
            if (settings.enableAISummary) {
                const apiValidation = this.validateAPIKey(settings.apiKey, settings.apiProvider);
                if (!apiValidation.isValid) {
                    warnings.push(`AI enabled but API key invalid: ${apiValidation.error}`);
                }
            }
            
            // Check cache status
            if (!this.cache) {
                warnings.push('Settings cache is empty');
            } else if (this.cacheExpiry && Date.now() > this.cacheExpiry) {
                warnings.push('Settings cache is expired');
            }
            
            return {
                healthy: issues.length === 0,
                issues,
                warnings,
                checkedAt: Date.now()
            };
        } catch (error) {
            console.error('Settings health check failed:', error);
            return {
                healthy: false,
                issues: [`Health check failed: ${error.message}`],
                warnings: [],
                checkedAt: Date.now()
            };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
} else if (typeof window !== 'undefined') {
    window.SettingsManager = SettingsManager;
}