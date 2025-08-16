// Options page script for LaterLens Chrome extension
// 옵션 페이지 스크립트 - 설정 관리 및 구성

class OptionsManager {
    constructor() {
        this.settings = {};
        this.settingsManager = new SettingsManager();
        this.currentTab = 'general';
        
        // Integration helpers
        this.integration = null;
        this.helpers = null;
        
        this.init();
    }

    async init() {
        try {
            // Initialize integration first
            this.integration = await initializeIntegration();
            this.helpers = getIntegrationHelpers();
            
            // Setup integration event listeners
            this.setupIntegrationEvents();
            
            await this.loadSettings();
            this.initTabs();
            this.bindEvents();
            this.updateUI();
            this.loadStorageInfo();
        } catch (error) {
            console.error('Failed to initialize options:', error);
            this.showNotification('Failed to initialize options page', 'error');
        }
    }

    /**
     * Setup integration event listeners
     * 통합 이벤트 리스너 설정
     */
    setupIntegrationEvents() {
        this.integration.on('unhealthy', (data) => {
            console.warn('Background script connection unhealthy');
            this.showConnectionWarning();
        });

        this.integration.on('recovered', (data) => {
            console.log('Background script connection recovered');
            this.hideConnectionWarning();
        });

        this.integration.on('recovery-failed', (data) => {
            console.error('Background script recovery failed');
            this.showConnectionError();
        });
    }

    async loadSettings() {
        try {
            this.settings = await this.settingsManager.getSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = ExtensionSettings.getDefaults().toJSON();
        }
    }

    initTabs() {
        const tabs = document.querySelectorAll('.nav-tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabId}-tab`) {
                        content.classList.add('active');
                    }
                });
                
                this.currentTab = tabId;
            });
        });
    }

    bindEvents() {
        // General Settings
        this.bindGeneralEvents();
        
        // AI Settings
        this.bindAIEvents();
        
        // Storage Settings
        this.bindStorageEvents();
        
        // Privacy Settings
        this.bindPrivacyEvents();
        
        // Advanced Settings
        this.bindAdvancedEvents();
        
        // Footer Actions
        this.bindFooterEvents();
        
        // Modal Events
        this.bindModalEvents();
    }

    bindGeneralEvents() {
        // Auto-save checkbox
        const autoSave = document.getElementById('auto-save');
        if (autoSave) {
            autoSave.addEventListener('change', (e) => {
                this.settings.autoSave = e.target.checked;
            });
        }

        // Show notifications
        const showNotifications = document.getElementById('show-notifications');
        if (showNotifications) {
            showNotifications.addEventListener('change', (e) => {
                this.settings.showNotifications = e.target.checked;
            });
        }

        // Default view
        const defaultView = document.getElementById('default-view');
        if (defaultView) {
            defaultView.addEventListener('change', (e) => {
                this.settings.defaultView = e.target.value;
            });
        }

        // Enable shortcuts
        const enableShortcuts = document.getElementById('enable-shortcuts');
        if (enableShortcuts) {
            enableShortcuts.addEventListener('change', (e) => {
                this.settings.enableShortcuts = e.target.checked;
            });
        }
    }

    bindAIEvents() {
        // AI Summary toggle - main feature toggle
        const enableAI = document.getElementById('enable-ai-summary');
        if (enableAI) {
            enableAI.addEventListener('change', (e) => {
                this.toggleAISettings(e.target.checked);
                this.settings.enableAISummary = e.target.checked;
            });
        }

        // AI Provider selection
        const aiProvider = document.getElementById('ai-provider');
        if (aiProvider) {
            aiProvider.addEventListener('change', (e) => {
                this.settings.apiProvider = e.target.value;
                this.updateProviderInfo(e.target.value);
                this.updateAPIKeyHelp(e.target.value);
            });
        }

        // API Key input with optional validation
        const apiKey = document.getElementById('api-key');
        if (apiKey) {
            apiKey.addEventListener('input', (e) => {
                this.handleAPIKeyInput(e.target.value);
            });
        }

        // Toggle API key visibility
        const toggleApiKey = document.getElementById('toggle-api-key');
        if (toggleApiKey) {
            toggleApiKey.addEventListener('click', () => {
                this.toggleAPIKeyVisibility();
            });
        }

        // Test API connection (optional)
        const testApi = document.getElementById('test-api');
        if (testApi) {
            testApi.addEventListener('click', () => {
                this.testAPIConnection();
            });
        }

        // Summary length slider
        const summaryLength = document.getElementById('summary-length');
        if (summaryLength) {
            summaryLength.addEventListener('input', (e) => {
                this.settings.summaryLength = parseInt(e.target.value);
                this.updateRangeValue('summary-length-value', e.target.value + ' chars');
            });
        }

        // Summary style radio buttons
        const summaryStyleInputs = document.querySelectorAll('input[name="summary-style"]');
        summaryStyleInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.settings.summaryStyle = e.target.value;
                }
            });
        });

        // Summary language
        const summaryLanguage = document.getElementById('summary-language');
        if (summaryLanguage) {
            summaryLanguage.addEventListener('change', (e) => {
                this.settings.summaryLanguage = e.target.value;
            });
        }

        // Content processing settings
        const minContentLength = document.getElementById('min-content-length');
        if (minContentLength) {
            minContentLength.addEventListener('input', (e) => {
                this.settings.minContentLength = parseInt(e.target.value);
                this.updateRangeValue('min-content-value', e.target.value + ' words');
            });
        }

        const extractImages = document.getElementById('extract-images');
        if (extractImages) {
            extractImages.addEventListener('change', (e) => {
                this.settings.extractImages = e.target.checked;
            });
        }

        const extractLinks = document.getElementById('extract-links');
        if (extractLinks) {
            extractLinks.addEventListener('change', (e) => {
                this.settings.extractLinks = e.target.checked;
            });
        }
    }

    bindStorageEvents() {
        // Max pages
        const maxPages = document.getElementById('max-pages');
        if (maxPages) {
            maxPages.addEventListener('change', (e) => {
                this.settings.maxStorageItems = parseInt(e.target.value);
            });
        }

        // Auto cleanup
        const autoCleanup = document.getElementById('auto-cleanup');
        if (autoCleanup) {
            autoCleanup.addEventListener('change', (e) => {
                this.settings.autoCleanupDays = e.target.value === 'never' ? 0 : parseInt(e.target.value);
            });
        }

        // Thumbnail quality
        const thumbnailQuality = document.getElementById('thumbnail-quality');
        if (thumbnailQuality) {
            thumbnailQuality.addEventListener('input', (e) => {
                this.settings.thumbnailQuality = parseFloat(e.target.value);
                this.updateRangeValue('thumbnail-quality-value', Math.round(e.target.value * 100) + '%');
            });
        }

        // Thumbnail size
        const thumbnailSize = document.getElementById('thumbnail-size');
        if (thumbnailSize) {
            thumbnailSize.addEventListener('change', (e) => {
                this.settings.thumbnailSize = e.target.value;
            });
        }

        // Capture full page
        const captureFullPage = document.getElementById('capture-full-page');
        if (captureFullPage) {
            captureFullPage.addEventListener('change', (e) => {
                this.settings.captureFullPage = e.target.checked;
            });
        }

        // Data management buttons
        const exportData = document.getElementById('export-data');
        if (exportData) {
            exportData.addEventListener('click', () => this.exportData());
        }

        const importData = document.getElementById('import-data');
        if (importData) {
            importData.addEventListener('click', () => this.importData());
        }

        const clearCache = document.getElementById('clear-cache');
        if (clearCache) {
            clearCache.addEventListener('click', () => this.clearCache());
        }

        const deleteAllData = document.getElementById('delete-all-data');
        if (deleteAllData) {
            deleteAllData.addEventListener('click', () => this.deleteAllData());
        }
    }

    bindPrivacyEvents() {
        // Privacy settings
        const encryptData = document.getElementById('encrypt-data');
        if (encryptData) {
            encryptData.addEventListener('change', (e) => {
                this.settings.encryptData = e.target.checked;
            });
        }

        const incognitoMode = document.getElementById('incognito-mode');
        if (incognitoMode) {
            incognitoMode.addEventListener('change', (e) => {
                this.settings.incognitoMode = e.target.checked;
            });
        }

        const analyticsOptOut = document.getElementById('analytics-opt-out');
        if (analyticsOptOut) {
            analyticsOptOut.addEventListener('change', (e) => {
                this.settings.analyticsOptOut = e.target.checked;
            });
        }

        // Content filtering
        const blockedDomains = document.getElementById('blocked-domains');
        if (blockedDomains) {
            blockedDomains.addEventListener('input', (e) => {
                this.settings.blockedDomains = e.target.value.split('\n').filter(domain => domain.trim());
            });
        }

        const filterAdultContent = document.getElementById('filter-adult-content');
        if (filterAdultContent) {
            filterAdultContent.addEventListener('change', (e) => {
                this.settings.filterAdultContent = e.target.checked;
            });
        }

        const requireHttps = document.getElementById('require-https');
        if (requireHttps) {
            requireHttps.addEventListener('change', (e) => {
                this.settings.requireHttps = e.target.checked;
            });
        }
    }

    bindAdvancedEvents() {
        // Performance settings
        const concurrentSaves = document.getElementById('concurrent-saves');
        if (concurrentSaves) {
            concurrentSaves.addEventListener('change', (e) => {
                this.settings.concurrentSaves = parseInt(e.target.value);
            });
        }

        const cacheDuration = document.getElementById('cache-duration');
        if (cacheDuration) {
            cacheDuration.addEventListener('change', (e) => {
                this.settings.cacheDuration = parseInt(e.target.value);
            });
        }

        const preloadContent = document.getElementById('preload-content');
        if (preloadContent) {
            preloadContent.addEventListener('change', (e) => {
                this.settings.preloadContent = e.target.checked;
            });
        }

        // Developer options
        const debugMode = document.getElementById('debug-mode');
        if (debugMode) {
            debugMode.addEventListener('change', (e) => {
                this.settings.debugMode = e.target.checked;
            });
        }

        const experimentalFeatures = document.getElementById('experimental-features');
        if (experimentalFeatures) {
            experimentalFeatures.addEventListener('change', (e) => {
                this.settings.experimentalFeatures = e.target.checked;
            });
        }

        // Developer actions
        const viewLogs = document.getElementById('view-logs');
        if (viewLogs) {
            viewLogs.addEventListener('click', () => this.viewLogs());
        }

        const resetExtension = document.getElementById('reset-extension');
        if (resetExtension) {
            resetExtension.addEventListener('click', () => this.resetExtension());
        }

        // Backup settings
        const autoBackup = document.getElementById('auto-backup');
        if (autoBackup) {
            autoBackup.addEventListener('change', (e) => {
                this.settings.autoBackup = e.target.checked;
            });
        }

        const backupFrequency = document.getElementById('backup-frequency');
        if (backupFrequency) {
            backupFrequency.addEventListener('change', (e) => {
                this.settings.backupFrequency = e.target.value;
            });
        }

        const createBackup = document.getElementById('create-backup');
        if (createBackup) {
            createBackup.addEventListener('click', () => this.createBackup());
        }

        const restoreBackup = document.getElementById('restore-backup');
        if (restoreBackup) {
            restoreBackup.addEventListener('click', () => this.restoreBackup());
        }
    }

    bindFooterEvents() {
        // Save settings
        const saveSettings = document.getElementById('save-settings');
        if (saveSettings) {
            saveSettings.addEventListener('click', () => this.saveSettings());
        }

        // Reset settings
        const resetSettings = document.getElementById('reset-settings');
        if (resetSettings) {
            resetSettings.addEventListener('click', () => this.resetSettings());
        }

        // Import/Export settings
        const importSettings = document.getElementById('import-settings');
        if (importSettings) {
            importSettings.addEventListener('click', () => this.importSettings());
        }

        const exportSettings = document.getElementById('export-settings');
        if (exportSettings) {
            exportSettings.addEventListener('click', () => this.exportSettings());
        }
    }

    bindModalEvents() {
        // Close modals
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || 
                e.target.classList.contains('modal-backdrop')) {
                this.closeModal();
            }
        });

        // Modal buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-cancel')) {
                this.closeModal();
            }
        });

        // Toast close
        const toastClose = document.querySelector('.toast-close');
        if (toastClose) {
            toastClose.addEventListener('click', () => this.hideToast());
        }
    }

    // AI Settings Methods
    toggleAISettings(enabled) {
        const aiSettingsPanel = document.getElementById('ai-settings-panel');
        if (aiSettingsPanel) {
            if (enabled) {
                aiSettingsPanel.style.display = 'block';
                aiSettingsPanel.style.opacity = '1';
            } else {
                aiSettingsPanel.style.display = 'none';
                aiSettingsPanel.style.opacity = '0.5';
            }
        }
        
        // Clear API key if AI is disabled (optional behavior)
        if (!enabled) {
            this.clearAPIKeyStatus();
        }
    }

    handleAPIKeyInput(apiKey) {
        this.settings.apiKey = apiKey;
        
        // Optional validation - only validate if key is provided
        if (apiKey && apiKey.trim().length > 0) {
            this.validateAPIKey(apiKey);
        } else {
            this.clearAPIKeyStatus();
        }
    }

    validateAPIKey(apiKey) {
        const provider = this.settings.apiProvider || 'openai';
        
        // Basic format validation (optional)
        let isValidFormat = false;
        let formatMessage = '';
        
        switch (provider) {
            case 'openai':
                isValidFormat = apiKey.startsWith('sk-') && apiKey.length > 20;
                formatMessage = isValidFormat ? 'API key format looks valid' : 'OpenAI keys should start with "sk-"';
                break;
            case 'anthropic':
                isValidFormat = apiKey.startsWith('sk-ant-') && apiKey.length > 30;
                formatMessage = isValidFormat ? 'API key format looks valid' : 'Anthropic keys should start with "sk-ant-"';
                break;
            case 'gemini':
                isValidFormat = apiKey.length > 20;
                formatMessage = isValidFormat ? 'API key format looks valid' : 'Please enter a valid Gemini API key';
                break;
            default:
                isValidFormat = apiKey.length > 10;
                formatMessage = 'API key provided';
        }
        
        this.updateProviderStatus(formatMessage, isValidFormat ? 'valid' : 'warning');
        
        // Enable test button if format looks valid
        const testButton = document.getElementById('test-api');
        if (testButton) {
            testButton.disabled = !isValidFormat;
        }
    }

    clearAPIKeyStatus() {
        this.updateProviderStatus('Not configured', 'default');
        const testButton = document.getElementById('test-api');
        if (testButton) {
            testButton.disabled = true;
        }
    }

    updateProviderStatus(message, type = 'default') {
        const statusElement = document.getElementById('provider-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `provider-status ${type}`;
        }
    }

    updateProviderInfo(provider) {
        // Update provider-specific information
        const providerInfo = document.getElementById('provider-info');
        if (providerInfo) {
            // Could add provider-specific info here
        }
    }

    updateAPIKeyHelp(provider) {
        const helpLink = document.getElementById('get-api-key-link');
        if (helpLink) {
            const urls = {
                'openai': 'https://platform.openai.com/api-keys',
                'anthropic': 'https://console.anthropic.com/account/keys',
                'gemini': 'https://makersuite.google.com/app/apikey',
                'ollama': '#'
            };
            
            helpLink.href = urls[provider] || '#';
            
            if (provider === 'ollama') {
                helpLink.textContent = 'Learn about Ollama setup';
            } else {
                helpLink.textContent = 'How to get an API key';
            }
        }
    }

    toggleAPIKeyVisibility() {
        const apiKeyInput = document.getElementById('api-key');
        const toggleButton = document.getElementById('toggle-api-key');
        
        if (apiKeyInput && toggleButton) {
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            
            const icon = toggleButton.querySelector('.icon');
            if (icon) {
                icon.textContent = isPassword ? '🙈' : '👁️';
            }
        }
    }

    async testAPIConnection() {
        const apiKey = this.settings.apiKey;
        const provider = this.settings.apiProvider;
        
        if (!apiKey || !apiKey.trim()) {
            this.showToast('Please enter an API key first', 'warning');
            return;
        }

        const testButton = document.getElementById('test-api');
        const originalText = testButton.textContent;
        
        // Show loading state
        testButton.disabled = true;
        testButton.textContent = 'Testing...';
        this.updateProviderStatus('Testing API connection...', 'testing');

        try {
            // Test the API connection through background script
            const response = await chrome.runtime.sendMessage({
                action: 'testAPIKey',
                data: { apiKey, provider }
            });

            if (response && response.success) {
                this.updateProviderStatus('✅ API connection successful!', 'success');
                this.showToast('API connection test successful!', 'success');
            } else {
                const errorMsg = response?.error || 'Unknown error occurred';
                this.updateProviderStatus(`❌ Test failed: ${errorMsg}`, 'error');
                this.showToast(`API test failed: ${errorMsg}`, 'error');
            }
        } catch (error) {
            console.error('Error testing API:', error);
            this.updateProviderStatus('❌ Connection test failed', 'error');
            this.showToast('Failed to test API connection', 'error');
        } finally {
            // Reset button state
            testButton.disabled = false;
            testButton.textContent = originalText;
        }
    }

    // UI Update Methods
    updateUI() {
        // General settings
        this.setCheckboxValue('auto-save', this.settings.autoSave);
        this.setCheckboxValue('show-notifications', this.settings.showNotifications);
        this.setSelectValue('default-view', this.settings.defaultView || 'grid');
        this.setCheckboxValue('enable-shortcuts', this.settings.enableShortcuts);

        // AI settings
        this.setCheckboxValue('enable-ai-summary', this.settings.enableAISummary);
        this.setSelectValue('ai-provider', this.settings.apiProvider || 'openai');
        this.setInputValue('api-key', this.settings.apiKey || '');
        this.setRangeValue('summary-length', this.settings.summaryLength || 200);
        this.setRadioValue('summary-style', this.settings.summaryStyle || 'concise');
        this.setSelectValue('summary-language', this.settings.summaryLanguage || 'auto');
        this.setRangeValue('min-content-length', this.settings.minContentLength || 500);
        this.setCheckboxValue('extract-images', this.settings.extractImages);
        this.setCheckboxValue('extract-links', this.settings.extractLinks);

        // Storage settings
        this.setInputValue('max-pages', this.settings.maxStorageItems || 1000);
        this.setSelectValue('auto-cleanup', this.settings.autoCleanupDays === 0 ? 'never' : this.settings.autoCleanupDays?.toString() || 'never');
        this.setRangeValue('thumbnail-quality', this.settings.thumbnailQuality || 0.8);
        this.setSelectValue('thumbnail-size', this.settings.thumbnailSize || 'medium');
        this.setCheckboxValue('capture-full-page', this.settings.captureFullPage);

        // Privacy settings
        this.setCheckboxValue('encrypt-data', this.settings.encryptData);
        this.setCheckboxValue('incognito-mode', this.settings.incognitoMode);
        this.setCheckboxValue('analytics-opt-out', this.settings.analyticsOptOut);
        this.setTextareaValue('blocked-domains', this.settings.blockedDomains?.join('\n') || '');
        this.setCheckboxValue('filter-adult-content', this.settings.filterAdultContent);
        this.setCheckboxValue('require-https', this.settings.requireHttps);

        // Advanced settings
        this.setInputValue('concurrent-saves', this.settings.concurrentSaves || 3);
        this.setSelectValue('cache-duration', this.settings.cacheDuration?.toString() || '1800');
        this.setCheckboxValue('preload-content', this.settings.preloadContent);
        this.setCheckboxValue('debug-mode', this.settings.debugMode);
        this.setCheckboxValue('experimental-features', this.settings.experimentalFeatures);
        this.setCheckboxValue('auto-backup', this.settings.autoBackup);
        this.setSelectValue('backup-frequency', this.settings.backupFrequency || 'weekly');

        // Update range value displays
        this.updateRangeValue('summary-length-value', (this.settings.summaryLength || 200) + ' chars');
        this.updateRangeValue('min-content-value', (this.settings.minContentLength || 500) + ' words');
        this.updateRangeValue('thumbnail-quality-value', Math.round((this.settings.thumbnailQuality || 0.8) * 100) + '%');

        // Toggle AI settings visibility
        this.toggleAISettings(this.settings.enableAISummary);

        // Update provider info
        this.updateProviderInfo(this.settings.apiProvider || 'openai');
        this.updateAPIKeyHelp(this.settings.apiProvider || 'openai');

        // Validate API key if present
        if (this.settings.apiKey && this.settings.apiKey.trim()) {
            this.validateAPIKey(this.settings.apiKey);
        } else {
            this.clearAPIKeyStatus();
        }
    }

    // Helper methods for setting form values
    setCheckboxValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.checked = !!value;
    }

    setInputValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value || '';
    }

    setSelectValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value || '';
    }

    setTextareaValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value || '';
    }

    setRangeValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value || element.min || 0;
    }

    setRadioValue(name, value) {
        const element = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (element) element.checked = true;
    }

    updateRangeValue(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    // Storage and Data Management
    async loadStorageInfo() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getStorageInfo'
            });

            if (response && response.success) {
                const { pageCount, storageUsed, storageQuota } = response.data;
                
                // Update storage usage display
                const usageElement = document.querySelector('.usage-text');
                if (usageElement) {
                    const usedMB = Math.round(storageUsed / (1024 * 1024));
                    const quotaMB = Math.round(storageQuota / (1024 * 1024));
                    usageElement.textContent = `${usedMB} MB / ${quotaMB} MB used`;
                }

                // Update usage bar
                const usageFill = document.querySelector('.usage-fill');
                if (usageFill) {
                    const percentage = Math.min((storageUsed / storageQuota) * 100, 100);
                    usageFill.style.width = `${percentage}%`;
                }
            }
        } catch (error) {
            console.error('Error loading storage info:', error);
        }
    }

    async exportData() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'exportData'
            });

            if (response && response.success) {
                const dataStr = JSON.stringify(response.data, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `laterlens-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showToast('Data exported successfully!', 'success');
            } else {
                throw new Error(response?.error || 'Export failed');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showToast('Failed to export data', 'error');
        }
    }

    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                const response = await chrome.runtime.sendMessage({
                    action: 'importData',
                    data: data
                });
                
                if (response && response.success) {
                    this.showToast('Data imported successfully!', 'success');
                    this.loadStorageInfo();
                } else {
                    throw new Error(response?.error || 'Import failed');
                }
            } catch (error) {
                console.error('Error importing data:', error);
                this.showToast('Failed to import data', 'error');
            }
        };
        
        input.click();
    }

    async clearCache() {
        if (!confirm('Are you sure you want to clear the cache? This will not delete your saved pages.')) {
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'clearCache'
            });

            if (response && response.success) {
                this.showToast('Cache cleared successfully!', 'success');
            } else {
                throw new Error(response?.error || 'Clear cache failed');
            }
        } catch (error) {
            console.error('Error clearing cache:', error);
            this.showToast('Failed to clear cache', 'error');
        }
    }

    async deleteAllData() {
        const confirmed = await this.showConfirmModal(
            'Delete All Data',
            'Are you sure you want to delete all saved pages and data?',
            'This action cannot be undone and will permanently remove all your saved pages, settings, and data.',
            'Delete All',
            'danger'
        );

        if (!confirmed) return;

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'clearAll'
            });

            if (response && response.success) {
                this.showToast('All data deleted successfully!', 'success');
                this.loadStorageInfo();
            } else {
                throw new Error(response?.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting data:', error);
            this.showToast('Failed to delete data', 'error');
        }
    }

    // Settings Management
    async saveSettings() {
        const saveButton = document.getElementById('save-settings');
        const statusElement = document.getElementById('save-status-text');
        
        if (saveButton) {
            saveButton.disabled = true;
            const originalText = saveButton.textContent;
            saveButton.textContent = 'Saving...';
        }

        if (statusElement) {
            statusElement.textContent = 'Saving settings...';
            statusElement.className = 'status-text';
        }

        try {
            const result = await this.settingsManager.saveSettings(this.settings);
            
            if (result.success) {
                if (statusElement) {
                    statusElement.textContent = 'Settings saved successfully!';
                    statusElement.className = 'status-text success';
                }
                this.showToast('Settings saved successfully!', 'success');
                
                // Clear success message after 3 seconds
                setTimeout(() => {
                    if (statusElement) {
                        statusElement.textContent = 'Ready';
                        statusElement.className = 'status-text';
                    }
                }, 3000);
            } else {
                throw new Error(result.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            if (statusElement) {
                statusElement.textContent = 'Failed to save settings';
                statusElement.className = 'status-text error';
            }
            this.showToast('Failed to save settings', 'error');
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = saveButton.querySelector('.icon') ? saveButton.innerHTML.replace('Saving...', 'Save Settings') : 'Save Settings';
            }
        }
    }

    async resetSettings() {
        const confirmed = await this.showConfirmModal(
            'Reset Settings',
            'Are you sure you want to reset all settings to their default values?',
            'This will not delete your saved pages, only reset your preferences.',
            'Reset Settings',
            'warning'
        );

        if (!confirmed) return;

        try {
            const result = await this.settingsManager.resetToDefaults();
            if (result.success) {
                this.settings = result.data;
                this.updateUI();
                this.showToast('Settings reset to defaults!', 'success');
            } else {
                throw new Error(result.error || 'Failed to reset settings');
            }
        } catch (error) {
            console.error('Error resetting settings:', error);
            this.showToast('Failed to reset settings', 'error');
        }
    }

    async exportSettings() {
        try {
            const settingsData = {
                settings: this.settings,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };

            const dataStr = JSON.stringify(settingsData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `laterlens-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Settings exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting settings:', error);
            this.showToast('Failed to export settings', 'error');
        }
    }

    async importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                    this.updateUI();
                    this.showToast('Settings imported successfully!', 'success');
                } else {
                    throw new Error('Invalid settings file format');
                }
            } catch (error) {
                console.error('Error importing settings:', error);
                this.showToast('Failed to import settings', 'error');
            }
        };
        
        input.click();
    }

    // Advanced Features (placeholder implementations)
    viewLogs() {
        // Open browser console or show logs modal
        console.log('LaterLens Debug Logs:', this.settings);
        this.showToast('Check browser console for debug logs', 'info');
    }

    async resetExtension() {
        const confirmed = await this.showConfirmModal(
            'Reset Extension',
            'Are you sure you want to completely reset the extension?',
            'This will delete all data and settings, returning the extension to its initial state.',
            'Reset Extension',
            'danger'
        );

        if (!confirmed) return;

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'resetExtension'
            });

            if (response && response.success) {
                this.showToast('Extension reset successfully!', 'success');
                // Reload the page to reflect changes
                setTimeout(() => window.location.reload(), 1000);
            } else {
                throw new Error(response?.error || 'Reset failed');
            }
        } catch (error) {
            console.error('Error resetting extension:', error);
            this.showToast('Failed to reset extension', 'error');
        }
    }

    async createBackup() {
        this.showToast('Creating backup...', 'info');
        await this.exportData();
    }

    async restoreBackup() {
        await this.importData();
    }

    // Modal and Toast Methods
    showConfirmModal(title, message, details, confirmText, type = 'default') {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmation-modal');
            if (!modal) {
                resolve(false);
                return;
            }

            // Set modal content
            const titleElement = modal.querySelector('.modal-title');
            const messageElement = modal.querySelector('.modal-message');
            const detailsElement = modal.querySelector('.modal-details');
            const confirmButton = modal.querySelector('.modal-confirm');

            if (titleElement) titleElement.textContent = title;
            if (messageElement) messageElement.textContent = message;
            if (detailsElement) detailsElement.textContent = details || '';
            if (confirmButton) {
                confirmButton.textContent = confirmText;
                confirmButton.className = `btn btn-${type} modal-confirm`;
            }

            // Show modal
            modal.classList.remove('hidden');

            // Handle confirm/cancel
            const handleConfirm = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                if (confirmButton) confirmButton.removeEventListener('click', handleConfirm);
                modal.removeEventListener('click', handleCancel);
            };

            if (confirmButton) confirmButton.addEventListener('click', handleConfirm);
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-cancel') || 
                    e.target.classList.contains('modal-backdrop') ||
                    e.target.classList.contains('modal-close')) {
                    handleCancel();
                }
            });
        });
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.add('hidden'));
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('notification-toast');
        if (!toast) return;

        const messageElement = toast.querySelector('.toast-message');
        const iconElement = toast.querySelector('.toast-icon');

        if (messageElement) messageElement.textContent = message;
        
        if (iconElement) {
            const icons = {
                'success': '✅',
                'error': '❌',
                'warning': '⚠️',
                'info': 'ℹ️'
            };
            iconElement.textContent = icons[type] || icons.info;
        }

        toast.className = `toast notification-toast ${type}`;
        toast.classList.remove('hidden');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideToast();
        }, 5000);
    }

    hideToast() {
        const toast = document.getElementById('notification-toast');
        if (toast) {
            toast.classList.add('hidden');
        }
    }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
});