// Storage utility functions for LaterLens Chrome extension
// 스토리지 유틸리티 함수 - Chrome 로컬 스토리지 작업 추상화

// Import models if available
if (typeof SavedPage === 'undefined' && typeof require !== 'undefined') {
    const { SavedPage, ExtensionSettings } = require('./models.js');
}

/**
 * Storage service class for managing saved pages
 * 저장된 페이지 관리를 위한 스토리지 서비스 클래스
 */
class StorageService {
    constructor() {
        this.PAGES_KEY = 'pages';
        this.SETTINGS_KEY = 'settings';
        this.BACKUP_KEY = 'backup';
        this.METADATA_KEY = 'metadata';
        
        // Storage limits and quotas
        this.MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for Chrome local storage
        this.MAX_PAGES_DEFAULT = 1000;
        this.BACKUP_RETENTION_DAYS = 7;
        
        // Initialize metadata if not exists
        this.initializeMetadata();
    }

    /**
     * Initialize storage metadata
     * 스토리지 메타데이터 초기화
     */
    async initializeMetadata() {
        try {
            const result = await chrome.storage.local.get([this.METADATA_KEY]);
            if (!result[this.METADATA_KEY]) {
                const metadata = {
                    version: '1.0.0',
                    createdAt: Date.now(),
                    lastBackup: null,
                    totalPages: 0,
                    storageUsed: 0,
                    lastCleanup: Date.now()
                };
                await chrome.storage.local.set({ [this.METADATA_KEY]: metadata });
            }
        } catch (error) {
            console.warn('Failed to initialize metadata:', error);
        }
    }

    /**
     * Update storage metadata
     * 스토리지 메타데이터 업데이트
     */
    async updateMetadata(updates) {
        try {
            const result = await chrome.storage.local.get([this.METADATA_KEY]);
            const metadata = result[this.METADATA_KEY] || {};
            
            const updatedMetadata = {
                ...metadata,
                ...updates,
                updatedAt: Date.now()
            };
            
            await chrome.storage.local.set({ [this.METADATA_KEY]: updatedMetadata });
            return updatedMetadata;
        } catch (error) {
            console.warn('Failed to update metadata:', error);
            return null;
        }
    }

    /**
     * Check storage quota and available space
     * 스토리지 할당량 및 사용 가능한 공간 확인
     */
    async checkStorageQuota() {
        try {
            const bytesInUse = await chrome.storage.local.getBytesInUse();
            const availableSpace = this.MAX_STORAGE_SIZE - bytesInUse;
            const usagePercentage = (bytesInUse / this.MAX_STORAGE_SIZE) * 100;
            
            return {
                bytesInUse,
                availableSpace,
                usagePercentage,
                isNearLimit: usagePercentage > 80,
                isOverLimit: usagePercentage > 95
            };
        } catch (error) {
            console.warn('Failed to check storage quota:', error);
            return {
                bytesInUse: 0,
                availableSpace: this.MAX_STORAGE_SIZE,
                usagePercentage: 0,
                isNearLimit: false,
                isOverLimit: false
            };
        }
    }

    /**
     * Create automatic backup before major operations
     * 주요 작업 전 자동 백업 생성
     */
    async createBackup(reason = 'auto') {
        try {
            const pages = await this.getPages();
            const settings = await this.getSettings();
            
            const backup = {
                version: '1.0.0',
                reason: reason,
                timestamp: Date.now(),
                pages: pages,
                settings: settings
            };
            
            // Store backup with timestamp key
            const backupKey = `${this.BACKUP_KEY}_${Date.now()}`;
            await chrome.storage.local.set({ [backupKey]: backup });
            
            // Update metadata
            await this.updateMetadata({ 
                lastBackup: Date.now(),
                backupReason: reason 
            });
            
            // Clean old backups
            await this.cleanOldBackups();
            
            return { success: true, backupKey: backupKey };
        } catch (error) {
            console.error('Failed to create backup:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clean old backups to save space
     * 공간 절약을 위한 오래된 백업 정리
     */
    async cleanOldBackups() {
        try {
            const result = await chrome.storage.local.get();
            const backupKeys = Object.keys(result).filter(key => key.startsWith(this.BACKUP_KEY));
            
            const cutoffTime = Date.now() - (this.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
            const keysToRemove = [];
            
            backupKeys.forEach(key => {
                const timestamp = parseInt(key.split('_')[1]);
                if (timestamp && timestamp < cutoffTime) {
                    keysToRemove.push(key);
                }
            });
            
            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                console.log(`Cleaned up ${keysToRemove.length} old backups`);
            }
        } catch (error) {
            console.warn('Failed to clean old backups:', error);
        }
    }

    /**
     * Recover from backup in case of data corruption
     * 데이터 손상 시 백업에서 복구
     */
    async recoverFromBackup(backupKey = null) {
        try {
            let backup = null;
            
            if (backupKey) {
                // Recover from specific backup
                const result = await chrome.storage.local.get([backupKey]);
                backup = result[backupKey];
            } else {
                // Find most recent backup
                const result = await chrome.storage.local.get();
                const backupKeys = Object.keys(result)
                    .filter(key => key.startsWith(this.BACKUP_KEY))
                    .sort((a, b) => {
                        const timestampA = parseInt(a.split('_')[1]);
                        const timestampB = parseInt(b.split('_')[1]);
                        return timestampB - timestampA;
                    });
                
                if (backupKeys.length > 0) {
                    backup = result[backupKeys[0]];
                }
            }
            
            if (!backup) {
                throw new Error('No backup found for recovery');
            }
            
            // Validate backup data
            if (!backup.pages || !Array.isArray(backup.pages)) {
                throw new Error('Invalid backup data structure');
            }
            
            // Restore data
            await chrome.storage.local.set({
                [this.PAGES_KEY]: backup.pages,
                [this.SETTINGS_KEY]: backup.settings || this.getDefaultSettings()
            });
            
            // Update metadata
            await this.updateMetadata({
                lastRecovery: Date.now(),
                recoveredFrom: backupKey || 'latest'
            });
            
            return {
                success: true,
                recoveredPages: backup.pages.length,
                backupTimestamp: backup.timestamp
            };
        } catch (error) {
            console.error('Failed to recover from backup:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Detect and handle data corruption
     * 데이터 손상 감지 및 처리
     */
    async detectDataCorruption() {
        try {
            const result = await chrome.storage.local.get([this.PAGES_KEY]);
            const rawPages = result[this.PAGES_KEY];
            
            if (!rawPages) {
                return { isCorrupted: false, issues: [] };
            }
            
            const issues = [];
            
            // Check if pages is an array
            if (!Array.isArray(rawPages)) {
                issues.push('Pages data is not an array');
                return { isCorrupted: true, issues };
            }
            
            // Check each page for basic structure
            let corruptedPages = 0;
            rawPages.forEach((page, index) => {
                if (!page || typeof page !== 'object') {
                    issues.push(`Page at index ${index} is not an object`);
                    corruptedPages++;
                } else if (!page.id || !page.url || !page.title) {
                    issues.push(`Page at index ${index} missing required fields`);
                    corruptedPages++;
                }
            });
            
            const corruptionPercentage = (corruptedPages / rawPages.length) * 100;
            const isCorrupted = corruptionPercentage > 10; // Consider corrupted if >10% of pages are invalid
            
            return {
                isCorrupted,
                issues,
                totalPages: rawPages.length,
                corruptedPages,
                corruptionPercentage
            };
        } catch (error) {
            console.error('Error detecting data corruption:', error);
            return {
                isCorrupted: true,
                issues: [`Storage access error: ${error.message}`]
            };
        }
    }

    /**
     * Perform automatic cleanup and maintenance
     * 자동 정리 및 유지보수 수행
     */
    async performMaintenance() {
        try {
            console.log('Starting storage maintenance...');
            
            // Check for data corruption
            const corruptionCheck = await this.detectDataCorruption();
            if (corruptionCheck.isCorrupted) {
                console.warn('Data corruption detected:', corruptionCheck.issues);
                
                // Attempt recovery from backup
                const recovery = await this.recoverFromBackup();
                if (!recovery.success) {
                    throw new Error('Failed to recover from corruption');
                }
            }
            
            // Check storage quota
            const quota = await this.checkStorageQuota();
            if (quota.isOverLimit) {
                console.warn('Storage quota exceeded, performing cleanup...');
                await this.performEmergencyCleanup();
            } else if (quota.isNearLimit) {
                console.log('Storage near limit, performing light cleanup...');
                await this.performLightCleanup();
            }
            
            // Clean old backups
            await this.cleanOldBackups();
            
            // Update maintenance metadata
            await this.updateMetadata({
                lastMaintenance: Date.now(),
                maintenanceStatus: 'completed'
            });
            
            console.log('Storage maintenance completed');
            return { success: true };
        } catch (error) {
            console.error('Storage maintenance failed:', error);
            await this.updateMetadata({
                lastMaintenance: Date.now(),
                maintenanceStatus: 'failed',
                maintenanceError: error.message
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Perform emergency cleanup when storage is full
     * 스토리지가 가득 찰 때 긴급 정리 수행
     */
    async performEmergencyCleanup() {
        try {
            const pages = await this.getPages();
            
            // Remove oldest 25% of pages
            const keepCount = Math.floor(pages.length * 0.75);
            const trimmedPages = pages.slice(0, keepCount);
            
            await chrome.storage.local.set({ [this.PAGES_KEY]: trimmedPages });
            
            console.log(`Emergency cleanup: removed ${pages.length - keepCount} pages`);
            return { success: true, removedCount: pages.length - keepCount };
        } catch (error) {
            console.error('Emergency cleanup failed:', error);
            throw error;
        }
    }

    /**
     * Perform light cleanup when storage is near limit
     * 스토리지가 한계에 가까울 때 가벼운 정리 수행
     */
    async performLightCleanup() {
        try {
            const pages = await this.getPages();
            
            // Remove pages older than 6 months
            const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
            const filteredPages = pages.filter(page => page.timestamp > sixMonthsAgo);
            
            if (filteredPages.length < pages.length) {
                await chrome.storage.local.set({ [this.PAGES_KEY]: filteredPages });
                console.log(`Light cleanup: removed ${pages.length - filteredPages.length} old pages`);
            }
            
            return { success: true, removedCount: pages.length - filteredPages.length };
        } catch (error) {
            console.error('Light cleanup failed:', error);
            throw error;
        }
    }

    /**
     * Save a page to storage
     * 페이지를 스토리지에 저장
     */
    async savePage(pageData) {
        try {
            // Check storage quota before saving
            const quota = await this.checkStorageQuota();
            if (quota.isOverLimit) {
                // Create backup before emergency cleanup
                await this.createBackup('before_emergency_cleanup');
                await this.performEmergencyCleanup();
            }
            
            // Create SavedPage instance and validate
            const page = new SavedPage(pageData);
            const validation = page.validate();
            
            if (!validation.isValid) {
                throw new Error(`Invalid page data: ${validation.errors.join(', ')}`);
            }
            
            // Log warnings if any
            if (validation.warnings.length > 0) {
                console.warn('Page validation warnings:', validation.warnings);
            }
            
            // Sanitize the page data
            page.sanitize();
            
            // Get current pages with corruption check
            const pages = await this.getPages();
            
            // Check for duplicate URLs (optional deduplication)
            const existingIndex = pages.findIndex(p => p.url === page.url);
            if (existingIndex !== -1) {
                // Update existing page instead of creating duplicate
                pages[existingIndex] = page.toJSON();
                console.log('Updated existing page with same URL');
            } else {
                // Add new page to beginning
                pages.unshift(page.toJSON());
            }
            
            // Save to storage with error handling
            try {
                await chrome.storage.local.set({ [this.PAGES_KEY]: pages });
            } catch (storageError) {
                if (storageError.message.includes('QUOTA_EXCEEDED')) {
                    // Handle quota exceeded error
                    await this.performEmergencyCleanup();
                    // Retry save after cleanup
                    const trimmedPages = pages.slice(0, Math.floor(pages.length * 0.9));
                    await chrome.storage.local.set({ [this.PAGES_KEY]: trimmedPages });
                } else {
                    throw storageError;
                }
            }
            
            // Update metadata
            await this.updateMetadata({
                totalPages: pages.length,
                lastPageAdded: Date.now()
            });
            
            return { success: true, data: page.toJSON() };
        } catch (error) {
            console.error('Error saving page:', error);
            
            // Attempt recovery if storage is corrupted
            if (error.message.includes('storage') || error.message.includes('corrupt')) {
                const recovery = await this.recoverFromBackup();
                if (recovery.success) {
                    console.log('Recovered from backup, retrying save...');
                    // Retry save after recovery
                    return await this.savePage(pageData);
                }
            }
            
            throw new Error(`Failed to save page: ${error.message}`);
        }
    }

    /**
     * Get all saved pages
     * 모든 저장된 페이지 가져오기
     */
    async getPages() {
        try {
            const result = await chrome.storage.local.get([this.PAGES_KEY]);
            const rawPages = result[this.PAGES_KEY] || [];
            
            // Check for data corruption
            const corruptionCheck = await this.detectDataCorruption();
            if (corruptionCheck.isCorrupted) {
                console.warn('Data corruption detected, attempting recovery...');
                const recovery = await this.recoverFromBackup();
                if (recovery.success) {
                    // Retry getting pages after recovery
                    const recoveredResult = await chrome.storage.local.get([this.PAGES_KEY]);
                    return recoveredResult[this.PAGES_KEY] || [];
                } else {
                    console.error('Failed to recover from corruption, returning empty array');
                    return [];
                }
            }
            
            // Convert raw data to SavedPage instances for validation
            const validPages = [];
            const invalidPages = [];
            
            rawPages.forEach((pageData, index) => {
                try {
                    const page = SavedPage.fromJSON(pageData);
                    const validation = page.validate();
                    
                    if (validation.isValid) {
                        // Apply any necessary migrations or updates
                        const sanitizedPage = page.sanitize();
                        validPages.push(sanitizedPage.toJSON());
                    } else {
                        console.warn(`Invalid page data at index ${index}:`, validation.errors);
                        invalidPages.push({ index, errors: validation.errors });
                    }
                } catch (error) {
                    console.warn(`Failed to parse page data at index ${index}:`, error);
                    invalidPages.push({ index, error: error.message });
                }
            });
            
            // If we filtered out invalid pages, update storage and create backup
            if (validPages.length !== rawPages.length) {
                console.log(`Found ${invalidPages.length} invalid pages, cleaning up...`);
                
                // Create backup before cleanup
                await this.createBackup('before_cleanup');
                
                // Update storage with valid pages only
                await chrome.storage.local.set({ [this.PAGES_KEY]: validPages });
                
                // Update metadata
                await this.updateMetadata({
                    totalPages: validPages.length,
                    lastCleanup: Date.now(),
                    cleanedInvalidPages: invalidPages.length
                });
            }
            
            // Sort pages by timestamp (newest first)
            validPages.sort((a, b) => b.timestamp - a.timestamp);
            
            return validPages;
        } catch (error) {
            console.error('Error getting pages:', error);
            
            // Attempt recovery as last resort
            try {
                const recovery = await this.recoverFromBackup();
                if (recovery.success) {
                    console.log('Recovered from backup after error');
                    const recoveredResult = await chrome.storage.local.get([this.PAGES_KEY]);
                    return recoveredResult[this.PAGES_KEY] || [];
                }
            } catch (recoveryError) {
                console.error('Recovery also failed:', recoveryError);
            }
            
            throw new Error(`Failed to get pages: ${error.message}`);
        }
    }

    /**
     * Delete a specific page by ID
     * ID로 특정 페이지 삭제
     */
    async deletePage(pageId) {
        try {
            if (!pageId || typeof pageId !== 'string') {
                throw new Error('Invalid page ID provided');
            }
            
            const pages = await this.getPages();
            const pageIndex = pages.findIndex(page => page.id === pageId);
            
            if (pageIndex === -1) {
                console.warn(`Page with ID ${pageId} not found`);
                return { success: true, found: false };
            }
            
            // Create backup before deletion
            await this.createBackup('before_delete');
            
            // Remove the page
            const filteredPages = pages.filter(page => page.id !== pageId);
            
            await chrome.storage.local.set({ [this.PAGES_KEY]: filteredPages });
            
            // Update metadata
            await this.updateMetadata({
                totalPages: filteredPages.length,
                lastPageDeleted: Date.now()
            });
            
            return { success: true, found: true, deletedPage: pages[pageIndex] };
        } catch (error) {
            console.error('Error deleting page:', error);
            throw new Error(`Failed to delete page: ${error.message}`);
        }
    }

    /**
     * Update a specific page by ID
     * ID로 특정 페이지 업데이트
     */
    async updatePage(pageId, updates) {
        try {
            if (!pageId || typeof pageId !== 'string') {
                throw new Error('Invalid page ID provided');
            }
            
            if (!updates || typeof updates !== 'object') {
                throw new Error('Invalid updates provided');
            }
            
            const pages = await this.getPages();
            const pageIndex = pages.findIndex(page => page.id === pageId);
            
            if (pageIndex === -1) {
                throw new Error(`Page with ID ${pageId} not found`);
            }
            
            // Create backup before update
            await this.createBackup('before_update');
            
            // Update the page
            const updatedPage = {
                ...pages[pageIndex],
                ...updates,
                id: pageId, // Ensure ID cannot be changed
                updatedAt: Date.now()
            };
            
            pages[pageIndex] = updatedPage;
            
            await chrome.storage.local.set({ [this.PAGES_KEY]: pages });
            
            // Update metadata
            await this.updateMetadata({
                lastPageUpdated: Date.now()
            });
            
            return { success: true, updatedPage: updatedPage };
        } catch (error) {
            console.error('Error updating page:', error);
            throw new Error(`Failed to update page: ${error.message}`);
        }
    }

    /**
     * Search pages by query
     * 쿼리로 페이지 검색
     */
    async searchPages(query) {
        try {
            const pages = await this.getPages();
            
            if (!query || query.trim() === '') {
                return pages;
            }

            const searchTerm = query.toLowerCase();
            return pages.filter(page => 
                page.title.toLowerCase().includes(searchTerm) ||
                page.summary.toLowerCase().includes(searchTerm) ||
                page.url.toLowerCase().includes(searchTerm) ||
                page.domain.toLowerCase().includes(searchTerm)
            );
        } catch (error) {
            console.error('Error searching pages:', error);
            throw new Error(`Failed to search pages: ${error.message}`);
        }
    }

    /**
     * Clear all saved pages
     * 모든 저장된 페이지 삭제
     */
    async clearAll() {
        try {
            const pages = await this.getPages();
            const pageCount = pages.length;
            
            if (pageCount === 0) {
                return { success: true, deletedCount: 0 };
            }
            
            // Create backup before clearing all data
            await this.createBackup('before_clear_all');
            
            // Clear all pages
            await chrome.storage.local.set({ [this.PAGES_KEY]: [] });
            
            // Update metadata
            await this.updateMetadata({
                totalPages: 0,
                lastClearAll: Date.now(),
                clearedPageCount: pageCount
            });
            
            console.log(`Cleared all ${pageCount} pages`);
            return { success: true, deletedCount: pageCount };
        } catch (error) {
            console.error('Error clearing pages:', error);
            throw new Error(`Failed to clear pages: ${error.message}`);
        }
    }

    /**
     * Get storage usage information
     * 스토리지 사용량 정보 가져오기
     */
    async getStorageInfo() {
        try {
            const pages = await this.getPages();
            const storageData = JSON.stringify(pages);
            
            return {
                pageCount: pages.length,
                storageUsed: new Blob([storageData]).size,
                lastUpdated: Date.now()
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            throw new Error(`Failed to get storage info: ${error.message}`);
        }
    }

    /**
     * Enforce storage limits
     * 스토리지 제한 적용
     */
    async enforceStorageLimit(maxItems = 1000) {
        try {
            const pages = await this.getPages();
            
            if (pages.length > maxItems) {
                // Keep only the most recent pages
                const trimmedPages = pages.slice(0, maxItems);
                await chrome.storage.local.set({ [this.PAGES_KEY]: trimmedPages });
                
                return {
                    success: true,
                    removedCount: pages.length - maxItems
                };
            }
            
            return { success: true, removedCount: 0 };
        } catch (error) {
            console.error('Error enforcing storage limit:', error);
            throw new Error(`Failed to enforce storage limit: ${error.message}`);
        }
    }

    /**
     * Get extension settings
     * 확장 프로그램 설정 가져오기
     */
    async getSettings() {
        try {
            const result = await chrome.storage.local.get([this.SETTINGS_KEY]);
            const rawSettings = result[this.SETTINGS_KEY];
            
            if (rawSettings) {
                // Validate and return settings
                const settings = ExtensionSettings.fromJSON(rawSettings);
                const validation = settings.validate();
                
                if (validation.isValid) {
                    return settings.toJSON();
                } else {
                    console.warn('Invalid settings found, using defaults:', validation.errors);
                }
            }
            
            // Return default settings if none exist or invalid
            return this.getDefaultSettings();
        } catch (error) {
            console.error('Error getting settings:', error);
            throw new Error(`Failed to get settings: ${error.message}`);
        }
    }

    /**
     * Save extension settings
     * 확장 프로그램 설정 저장
     */
    async saveSettings(settingsData) {
        try {
            // Create ExtensionSettings instance and validate
            const settings = ExtensionSettings.fromJSON(settingsData);
            const validation = settings.validate();
            
            if (!validation.isValid) {
                throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
            }
            
            // Log warnings if any
            if (validation.warnings.length > 0) {
                console.warn('Settings warnings:', validation.warnings);
            }
            
            await chrome.storage.local.set({ [this.SETTINGS_KEY]: settings.toJSON() });
            return { success: true, data: settings.toJSON() };
        } catch (error) {
            console.error('Error saving settings:', error);
            throw new Error(`Failed to save settings: ${error.message}`);
        }
    }

    /**
     * Get default settings
     * 기본 설정 가져오기
     */
    getDefaultSettings() {
        return ExtensionSettings.getDefaults().toJSON();
    }

    /**
     * Backup data to JSON
     * 데이터를 JSON으로 백업
     */
    async exportData() {
        try {
            const pages = await this.getPages();
            const settings = await this.getSettings();
            
            return {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                pages: pages,
                settings: settings
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw new Error(`Failed to export data: ${error.message}`);
        }
    }

    /**
     * Import data from JSON backup
     * JSON 백업에서 데이터 가져오기
     */
    async importData(backupData) {
        try {
            if (!backupData || typeof backupData !== 'object') {
                throw new Error('Invalid backup data format');
            }
            
            if (!backupData.pages || !Array.isArray(backupData.pages)) {
                throw new Error('Backup data must contain a pages array');
            }

            // Create backup of current data before import
            await this.createBackup('before_import');

            // Validate and process each page
            const validPages = [];
            const invalidPages = [];
            
            backupData.pages.forEach((pageData, index) => {
                try {
                    const page = new SavedPage(pageData);
                    const validation = page.validate();
                    
                    if (validation.isValid) {
                        validPages.push(page.sanitize().toJSON());
                    } else {
                        invalidPages.push({ 
                            index, 
                            errors: validation.errors,
                            data: pageData 
                        });
                    }
                } catch (error) {
                    invalidPages.push({ 
                        index, 
                        error: error.message,
                        data: pageData 
                    });
                }
            });

            // Merge with existing pages (avoid duplicates by URL)
            const existingPages = await this.getPages();
            const existingUrls = new Set(existingPages.map(p => p.url));
            
            const newPages = validPages.filter(page => !existingUrls.has(page.url));
            const duplicatePages = validPages.filter(page => existingUrls.has(page.url));
            
            // Combine and sort by timestamp
            const allPages = [...existingPages, ...newPages]
                .sort((a, b) => b.timestamp - a.timestamp);

            // Import settings if provided
            let importedSettings = null;
            if (backupData.settings) {
                try {
                    const settings = ExtensionSettings.fromJSON(backupData.settings);
                    const validation = settings.validate();
                    
                    if (validation.isValid) {
                        importedSettings = settings.toJSON();
                        await chrome.storage.local.set({ [this.SETTINGS_KEY]: importedSettings });
                    } else {
                        console.warn('Invalid settings in backup, skipping settings import');
                    }
                } catch (error) {
                    console.warn('Failed to import settings:', error);
                }
            }

            // Save imported pages
            await chrome.storage.local.set({ [this.PAGES_KEY]: allPages });

            // Update metadata
            await this.updateMetadata({
                totalPages: allPages.length,
                lastImport: Date.now(),
                importedPageCount: newPages.length
            });

            return {
                success: true,
                importedPages: newPages.length,
                duplicatePages: duplicatePages.length,
                skippedPages: invalidPages.length,
                totalPages: allPages.length,
                importedSettings: importedSettings !== null,
                invalidPages: invalidPages.length > 0 ? invalidPages : undefined
            };
        } catch (error) {
            console.error('Error importing data:', error);
            throw new Error(`Failed to import data: ${error.message}`);
        }
    }

    /**
     * Get pages with advanced filtering and sorting
     * 고급 필터링 및 정렬을 통한 페이지 가져오기
     */
    async getPagesWithFilter(options = {}) {
        try {
            const {
                query = '',
                tags = [],
                dateFrom = null,
                dateTo = null,
                domains = [],
                sortBy = 'timestamp',
                sortOrder = 'desc',
                limit = null,
                offset = 0
            } = options;

            let pages = await this.getPages();

            // Apply filters
            if (query) {
                const searchTerm = query.toLowerCase();
                pages = pages.filter(page => {
                    const searchableText = [
                        page.title,
                        page.summary,
                        page.url,
                        page.domain,
                        page.description,
                        ...(page.tags || [])
                    ].join(' ').toLowerCase();
                    
                    return searchableText.includes(searchTerm);
                });
            }

            if (tags.length > 0) {
                pages = pages.filter(page => 
                    page.tags && tags.some(tag => page.tags.includes(tag.toLowerCase()))
                );
            }

            if (dateFrom) {
                pages = pages.filter(page => page.timestamp >= dateFrom);
            }

            if (dateTo) {
                pages = pages.filter(page => page.timestamp <= dateTo);
            }

            if (domains.length > 0) {
                pages = pages.filter(page => domains.includes(page.domain));
            }

            // Apply sorting
            pages.sort((a, b) => {
                let aValue = a[sortBy];
                let bValue = b[sortBy];

                if (sortBy === 'title' || sortBy === 'domain') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (sortOrder === 'asc') {
                    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                } else {
                    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                }
            });

            // Apply pagination
            const totalCount = pages.length;
            if (offset > 0) {
                pages = pages.slice(offset);
            }
            if (limit && limit > 0) {
                pages = pages.slice(0, limit);
            }

            return {
                pages,
                totalCount,
                filteredCount: pages.length,
                hasMore: limit && totalCount > offset + limit
            };
        } catch (error) {
            console.error('Error getting filtered pages:', error);
            throw new Error(`Failed to get filtered pages: ${error.message}`);
        }
    }

    /**
     * Get storage statistics and analytics
     * 스토리지 통계 및 분석 정보 가져오기
     */
    async getStorageStats() {
        try {
            const pages = await this.getPages();
            const quota = await this.checkStorageQuota();
            const metadata = await chrome.storage.local.get([this.METADATA_KEY]);
            
            // Calculate statistics
            const now = Date.now();
            const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
            
            const recentPages = pages.filter(p => p.timestamp > oneWeekAgo);
            const monthlyPages = pages.filter(p => p.timestamp > oneMonthAgo);
            
            // Domain statistics
            const domainCounts = {};
            pages.forEach(page => {
                domainCounts[page.domain] = (domainCounts[page.domain] || 0) + 1;
            });
            
            const topDomains = Object.entries(domainCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([domain, count]) => ({ domain, count }));

            // Tag statistics
            const tagCounts = {};
            pages.forEach(page => {
                if (page.tags) {
                    page.tags.forEach(tag => {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    });
                }
            });
            
            const topTags = Object.entries(tagCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([tag, count]) => ({ tag, count }));

            return {
                totalPages: pages.length,
                recentPages: recentPages.length,
                monthlyPages: monthlyPages.length,
                storage: quota,
                topDomains,
                topTags,
                averagePagesPerDay: monthlyPages.length / 30,
                oldestPage: pages.length > 0 ? Math.min(...pages.map(p => p.timestamp)) : null,
                newestPage: pages.length > 0 ? Math.max(...pages.map(p => p.timestamp)) : null,
                metadata: metadata[this.METADATA_KEY] || {}
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            throw new Error(`Failed to get storage stats: ${error.message}`);
        }
    }

    /**
     * Batch operations for multiple pages
     * 여러 페이지에 대한 배치 작업
     */
    async batchOperation(operation, pageIds, data = {}) {
        try {
            if (!Array.isArray(pageIds) || pageIds.length === 0) {
                throw new Error('Invalid page IDs array');
            }

            const pages = await this.getPages();
            const results = [];
            let modified = false;

            // Create backup before batch operation
            await this.createBackup(`before_batch_${operation}`);

            switch (operation) {
                case 'delete':
                    const remainingPages = pages.filter(page => !pageIds.includes(page.id));
                    if (remainingPages.length !== pages.length) {
                        await chrome.storage.local.set({ [this.PAGES_KEY]: remainingPages });
                        modified = true;
                        results.push({
                            operation: 'delete',
                            success: true,
                            deletedCount: pages.length - remainingPages.length
                        });
                    }
                    break;

                case 'addTag':
                    if (!data.tag || typeof data.tag !== 'string') {
                        throw new Error('Tag is required for addTag operation');
                    }
                    
                    pages.forEach(page => {
                        if (pageIds.includes(page.id)) {
                            if (!page.tags) page.tags = [];
                            const cleanTag = data.tag.trim().toLowerCase();
                            if (!page.tags.includes(cleanTag)) {
                                page.tags.push(cleanTag);
                                modified = true;
                            }
                        }
                    });
                    
                    if (modified) {
                        await chrome.storage.local.set({ [this.PAGES_KEY]: pages });
                        results.push({
                            operation: 'addTag',
                            success: true,
                            tag: data.tag,
                            affectedPages: pageIds.length
                        });
                    }
                    break;

                case 'removeTag':
                    if (!data.tag || typeof data.tag !== 'string') {
                        throw new Error('Tag is required for removeTag operation');
                    }
                    
                    pages.forEach(page => {
                        if (pageIds.includes(page.id) && page.tags) {
                            const cleanTag = data.tag.trim().toLowerCase();
                            const index = page.tags.indexOf(cleanTag);
                            if (index > -1) {
                                page.tags.splice(index, 1);
                                modified = true;
                            }
                        }
                    });
                    
                    if (modified) {
                        await chrome.storage.local.set({ [this.PAGES_KEY]: pages });
                        results.push({
                            operation: 'removeTag',
                            success: true,
                            tag: data.tag,
                            affectedPages: pageIds.length
                        });
                    }
                    break;

                default:
                    throw new Error(`Unknown batch operation: ${operation}`);
            }

            if (modified) {
                await this.updateMetadata({
                    lastBatchOperation: Date.now(),
                    batchOperationType: operation
                });
            }

            return {
                success: true,
                results,
                modified
            };
        } catch (error) {
            console.error('Error in batch operation:', error);
            throw new Error(`Failed to perform batch operation: ${error.message}`);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
} else if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}