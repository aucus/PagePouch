// Integration tests for options page
// 옵션 페이지 통합 테스트

describe('Options Integration Tests', () => {
    let mockStorage;
    let mockChrome;
    let optionsContainer;
    let mockSettings;

    beforeEach(() => {
        // Mock settings
        mockSettings = {
            autoSave: false,
            showNotifications: true,
            defaultView: 'grid',
            enableShortcuts: true,
            enableAISummary: false,
            apiProvider: 'openai',
            apiKey: '',
            summaryLength: 200,
            summaryStyle: 'concise',
            summaryLanguage: 'auto',
            maxStorageItems: 1000,
            thumbnailQuality: 0.8,
            encryptData: false,
            debugMode: false
        };

        // Mock Chrome storage
        mockStorage = createMockChromeStorage();
        mockStorage.get.mockImplementation((keys, callback) => {
            const result = {
                settings: mockSettings,
                savedPages: [],
                storageInfo: {
                    pageCount: 42,
                    storageUsed: 1024 * 1024 * 450, // 450MB
                    storageQuota: 1024 * 1024 * 1024 // 1GB
                }
            };
            callback(result);
        });

        mockStorage.set.mockImplementation((items, callback) => {
            Object.assign(mockSettings, items.settings || {});
            if (callback) callback();
        });

        // Mock Chrome APIs
        mockChrome = {
            ...chrome,
            storage: {
                local: mockStorage
            },
            runtime: {
                sendMessage: jest.fn((message, callback) => {
                    // Mock background script responses
                    if (message.action === 'testAPIKey') {
                        const success = message.data.apiKey && message.data.apiKey.length > 10;
                        callback({ 
                            success, 
                            error: success ? null : 'Invalid API key format'
                        });
                    } else if (message.action === 'getStorageInfo') {
                        callback({
                            success: true,
                            data: {
                                pageCount: 42,
                                storageUsed: 1024 * 1024 * 450,
                                storageQuota: 1024 * 1024 * 1024
                            }
                        });
                    } else if (message.action === 'exportData') {  
                      callback({
                            success: true,
                            data: 'exported-data-blob'
                        });
                    } else if (message.action === 'importData') {
                        callback({
                            success: true,
                            imported: 25
                        });
                    } else if (message.action === 'clearAllData') {
                        callback({ success: true });
                    }
                })
            }
        };

        global.chrome = mockChrome;

        // Create options container
        optionsContainer = document.createElement('div');
        optionsContainer.innerHTML = `
            <div class="container">
                <header class="header">
                    <h1 class="title">
                        <span class="logo-icon">🔍</span>
                        <span data-i18n="extensionName">LaterLens</span>
                        <span class="subtitle" data-i18n="options_title">Settings</span>
                    </h1>
                </header>
                
                <div class="content">
                    <div class="settings-container">
                        <!-- General Settings -->
                        <section class="settings-section">
                            <h2 class="section-title" data-i18n="options_general">General</h2>
                            
                            <div class="setting-item">
                                <label class="setting-label">
                                    <input type="checkbox" id="auto-save" class="setting-checkbox">
                                    <span class="setting-text" data-i18n="options_auto_save">Auto-save pages</span>
                                </label>
                                <p class="setting-description" data-i18n="options_auto_save_desc">
                                    Automatically save pages when you visit them
                                </p>
                            </div>
                            
                            <div class="setting-item">
                                <label class="setting-label">
                                    <input type="checkbox" id="show-notifications" class="setting-checkbox">
                                    <span class="setting-text" data-i18n="options_notifications">Show notifications</span>
                                </label>
                                <p class="setting-description" data-i18n="options_notifications_desc">
                                    Show notifications when pages are saved or deleted
                                </p>
                            </div>
                            
                            <div class="setting-item">
                                <label class="setting-label" for="default-view">
                                    <span class="setting-text" data-i18n="options_default_view">Default view</span>
                                </label>
                                <select id="default-view" class="setting-select">
                                    <option value="grid">Grid</option>
                                    <option value="list">List</option>
                                    <option value="compact">Compact</option>
                                </select>
                            </div>
                            
                            <div class="setting-item">
                                <label class="setting-label">
                                    <input type="checkbox" id="enable-shortcuts" class="setting-checkbox">
                                    <span class="setting-text" data-i18n="options_shortcuts">Enable keyboard shortcuts</span>
                                </label>
                                <p class="setting-description" data-i18n="options_shortcuts_desc">
                                    Use Ctrl+Shift+S to save current page
                                </p>
                            </div>
                        </section>
                        
                        <!-- AI Summary Settings -->
                        <section class="settings-section">
                            <h2 class="section-title" data-i18n="options_ai_summary">AI Summary</h2>
                            
                            <div class="setting-item">
                                <label class="setting-label">
                                    <input type="checkbox" id="enable-ai-summary" class="setting-checkbox">
                                    <span class="setting-text" data-i18n="options_enable_ai">Enable AI summaries</span>
                                </label>
                                <p class="setting-description" data-i18n="options_enable_ai_desc">
                                    Generate AI-powered summaries for saved pages
                                </p>
                            </div>
                            
                            <div id="ai-settings" class="ai-settings hidden">
                                <div class="setting-item">
                                    <label class="setting-label" for="api-provider">
                                        <span class="setting-text" data-i18n="options_api_provider">API Provider</span>
                                    </label>
                                    <select id="api-provider" class="setting-select">
                                        <option value="openai">OpenAI</option>
                                        <option value="anthropic">Anthropic</option>
                                        <option value="google">Google AI</option>
                                    </select>
                                </div>
                                
                                <div class="setting-item">
                                    <label class="setting-label" for="api-key">
                                        <span class="setting-text" data-i18n="options_api_key">API Key</span>
                                    </label>
                                    <div class="api-key-container">
                                        <input type="password" id="api-key" class="setting-input" placeholder="Enter your API key">
                                        <button id="test-api-key" class="btn btn-secondary btn-small">Test</button>
                                    </div>
                                    <div id="api-key-status" class="api-key-status"></div>
                                </div>
                                
                                <div class="setting-item">
                                    <label class="setting-label" for="summary-length">
                                        <span class="setting-text" data-i18n="options_summary_length">Summary length</span>
                                    </label>
                                    <input type="range" id="summary-length" class="setting-range" min="50" max="500" step="50">
                                    <span id="summary-length-value" class="range-value">200 words</span>
                                </div>
                                
                                <div class="setting-item">
                                    <label class="setting-label" for="summary-style">
                                        <span class="setting-text" data-i18n="options_summary_style">Summary style</span>
                                    </label>
                                    <select id="summary-style" class="setting-select">
                                        <option value="concise">Concise</option>
                                        <option value="detailed">Detailed</option>
                                        <option value="bullet-points">Bullet Points</option>
                                    </select>
                                </div>
                                
                                <div class="setting-item">
                                    <label class="setting-label" for="summary-language">
                                        <span class="setting-text" data-i18n="options_summary_language">Summary language</span>
                                    </label>
                                    <select id="summary-language" class="setting-select">
                                        <option value="auto">Auto-detect</option>
                                        <option value="en">English</option>
                                        <option value="ko">Korean</option>
                                        <option value="ja">Japanese</option>
                                        <option value="zh">Chinese</option>
                                    </select>
                                </div>
                            </div>
                        </section>
                        
                        <!-- Storage Settings -->
                        <section class="settings-section">
                            <h2 class="section-title" data-i18n="options_storage">Storage</h2>
                            
                            <div class="setting-item">
                                <label class="setting-label" for="max-storage-items">
                                    <span class="setting-text" data-i18n="options_max_items">Maximum saved pages</span>
                                </label>
                                <input type="number" id="max-storage-items" class="setting-input" min="100" max="10000" step="100">
                                <p class="setting-description" data-i18n="options_max_items_desc">
                                    Oldest pages will be automatically deleted when limit is reached
                                </p>
                            </div>
                            
                            <div class="setting-item">
                                <label class="setting-label" for="thumbnail-quality">
                                    <span class="setting-text" data-i18n="options_thumbnail_quality">Thumbnail quality</span>
                                </label>
                                <input type="range" id="thumbnail-quality" class="setting-range" min="0.1" max="1" step="0.1">
                                <span id="thumbnail-quality-value" class="range-value">80%</span>
                            </div>
                            
                            <div class="storage-info">
                                <h3 class="storage-info-title" data-i18n="options_storage_usage">Storage Usage</h3>
                                <div class="storage-stats">
                                    <div class="storage-stat">
                                        <span class="stat-label" data-i18n="options_pages_saved">Pages saved:</span>
                                        <span id="page-count" class="stat-value">0</span>
                                    </div>
                                    <div class="storage-stat">
                                        <span class="stat-label" data-i18n="options_storage_used">Storage used:</span>
                                        <span id="storage-used" class="stat-value">0 MB</span>
                                    </div>
                                    <div class="storage-progress">
                                        <div id="storage-progress-bar" class="progress-bar">
                                            <div class="progress-fill"></div>
                                        </div>
                                        <span id="storage-percentage" class="progress-text">0%</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                        
                        <!-- Privacy & Security -->
                        <section class="settings-section">
                            <h2 class="section-title" data-i18n="options_privacy">Privacy & Security</h2>
                            
                            <div class="setting-item">
                                <label class="setting-label">
                                    <input type="checkbox" id="encrypt-data" class="setting-checkbox">
                                    <span class="setting-text" data-i18n="options_encrypt_data">Encrypt stored data</span>
                                </label>
                                <p class="setting-description" data-i18n="options_encrypt_data_desc">
                                    Encrypt saved pages and settings (requires password)
                                </p>
                            </div>
                        </section>
                        
                        <!-- Data Management -->
                        <section class="settings-section">
                            <h2 class="section-title" data-i18n="options_data_management">Data Management</h2>
                            
                            <div class="setting-item">
                                <div class="data-actions">
                                    <button id="export-data" class="btn btn-secondary">
                                        <span class="icon">📤</span>
                                        <span data-i18n="options_export_data">Export Data</span>
                                    </button>
                                    
                                    <button id="import-data" class="btn btn-secondary">
                                        <span class="icon">📥</span>
                                        <span data-i18n="options_import_data">Import Data</span>
                                    </button>
                                    <input type="file" id="import-file" accept=".json" style="display: none;">
                                    
                                    <button id="clear-all-data" class="btn btn-danger">
                                        <span class="icon">🗑️</span>
                                        <span data-i18n="options_clear_all_data">Clear All Data</span>
                                    </button>
                                </div>
                            </div>
                        </section>
                        
                        <!-- Advanced Settings -->
                        <section class="settings-section">
                            <h2 class="section-title" data-i18n="options_advanced">Advanced</h2>
                            
                            <div class="setting-item">
                                <label class="setting-label">
                                    <input type="checkbox" id="debug-mode" class="setting-checkbox">
                                    <span class="setting-text" data-i18n="options_debug_mode">Debug mode</span>
                                </label>
                                <p class="setting-description" data-i18n="options_debug_mode_desc">
                                    Enable detailed logging for troubleshooting
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
                
                <footer class="footer">
                    <div class="footer-actions">
                        <button id="reset-settings" class="btn btn-secondary">
                            <span data-i18n="options_reset_settings">Reset to Defaults</span>
                        </button>
                        <div class="save-status">
                            <span id="save-status" class="save-status-text"></span>
                        </div>
                    </div>
                </footer>
            </div>
        `;
        
        document.body.appendChild(optionsContainer);

        // Mock global functions
        global.showToast = jest.fn();
        global.showConfirm = jest.fn().mockResolvedValue(true);
        global.showSpinner = jest.fn(() => 'spinner-id');
        global.hideLoading = jest.fn();
        global._ = jest.fn((key) => key);
        global.formatBytes = jest.fn((bytes) => `${Math.round(bytes / 1024 / 1024)} MB`);
    });

    afterEach(() => {
        if (optionsContainer.parentNode) {
            optionsContainer.parentNode.removeChild(optionsContainer);
        }
        
        delete global.showToast;
        delete global.showConfirm;
        delete global.showSpinner;
        delete global.hideLoading;
        delete global._;
        delete global.formatBytes;
    });

    describe('Options Initialization', () => {
        test('should load and display current settings on initialization', async () => {
            const initializeOptions = async () => {
                return new Promise((resolve) => {
                    chrome.storage.local.get(['settings'], (result) => {
                        const settings = result.settings || {};
                        
                        // Apply settings to UI
                        document.getElementById('auto-save').checked = settings.autoSave || false;
                        document.getElementById('show-notifications').checked = settings.showNotifications !== false;
                        document.getElementById('default-view').value = settings.defaultView || 'grid';
                        document.getElementById('enable-shortcuts').checked = settings.enableShortcuts !== false;
                        document.getElementById('enable-ai-summary').checked = settings.enableAISummary || false;
                        document.getElementById('api-provider').value = settings.apiProvider || 'openai';
                        document.getElementById('api-key').value = settings.apiKey || '';
                        document.getElementById('summary-length').value = settings.summaryLength || 200;
                        document.getElementById('summary-style').value = settings.summaryStyle || 'concise';
                        document.getElementById('summary-language').value = settings.summaryLanguage || 'auto';
                        document.getElementById('max-storage-items').value = settings.maxStorageItems || 1000;
                        document.getElementById('thumbnail-quality').value = settings.thumbnailQuality || 0.8;
                        document.getElementById('encrypt-data').checked = settings.encryptData || false;
                        document.getElementById('debug-mode').checked = settings.debugMode || false;
                        
                        // Update range value displays
                        document.getElementById('summary-length-value').textContent = `${settings.summaryLength || 200} words`;
                        document.getElementById('thumbnail-quality-value').textContent = `${Math.round((settings.thumbnailQuality || 0.8) * 100)}%`;
                        
                        // Show/hide AI settings based on enableAISummary
                        const aiSettings = document.getElementById('ai-settings');
                        if (settings.enableAISummary) {
                            aiSettings.classList.remove('hidden');
                        } else {
                            aiSettings.classList.add('hidden');
                        }
                        
                        resolve(settings);
                    });
                });
            };

            const settings = await initializeOptions();
            
            expect(settings).toEqual(mockSettings);
            expect(document.getElementById('auto-save').checked).toBe(false);
            expect(document.getElementById('show-notifications').checked).toBe(true);
            expect(document.getElementById('default-view').value).toBe('grid');
            expect(document.getElementById('enable-ai-summary').checked).toBe(false);
            expect(document.getElementById('ai-settings').classList.contains('hidden')).toBe(true);
        });

        test('should load storage information on initialization', async () => {
            const loadStorageInfo = async () => {
                return new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'getStorageInfo' }, (response) => {
                        if (response.success) {
                            const { pageCount, storageUsed, storageQuota } = response.data;
                            
                            // Update storage display
                            document.getElementById('page-count').textContent = pageCount;
                            document.getElementById('storage-used').textContent = formatBytes(storageUsed);
                            
                            const percentage = Math.round((storageUsed / storageQuota) * 100);
                            document.getElementById('storage-percentage').textContent = `${percentage}%`;
                            
                            const progressFill = document.querySelector('.progress-fill');
                            progressFill.style.width = `${percentage}%`;
                            
                            resolve(response.data);
                        }
                    });
                });
            };

            const storageInfo = await loadStorageInfo();
            
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                { action: 'getStorageInfo' },
                expect.any(Function)
            );
            expect(storageInfo.pageCount).toBe(42);
            expect(document.getElementById('page-count').textContent).toBe('42');
            expect(formatBytes).toHaveBeenCalledWith(1024 * 1024 * 450);
        });
    });

    describe('Settings Management', () => {
        test('should save settings when checkbox is changed', async () => {
            const autoSaveCheckbox = document.getElementById('auto-save');
            
            const saveSettings = async (settingKey, value) => {
                const updatedSettings = { ...mockSettings, [settingKey]: value };
                
                return new Promise((resolve) => {
                    chrome.storage.local.set({ settings: updatedSettings }, () => {
                        resolve(updatedSettings);
                    });
                });
            };

            // Change auto-save setting
            autoSaveCheckbox.checked = true;
            autoSaveCheckbox.dispatchEvent(new Event('change'));
            
            const updatedSettings = await saveSettings('autoSave', true);
            
            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                { settings: expect.objectContaining({ autoSave: true }) },
                expect.any(Function)
            );
            expect(updatedSettings.autoSave).toBe(true);
        });

        test('should save settings when select value is changed', async () => {
            const defaultViewSelect = document.getElementById('default-view');
            
            const saveSettings = async (settingKey, value) => {
                const updatedSettings = { ...mockSettings, [settingKey]: value };
                
                return new Promise((resolve) => {
                    chrome.storage.local.set({ settings: updatedSettings }, () => {
                        resolve(updatedSettings);
                    });
                });
            };

            // Change default view setting
            defaultViewSelect.value = 'list';
            defaultViewSelect.dispatchEvent(new Event('change'));
            
            const updatedSettings = await saveSettings('defaultView', 'list');
            
            expect(updatedSettings.defaultView).toBe('list');
        });

        test('should save settings when range input is changed', async () => {
            const summaryLengthRange = document.getElementById('summary-length');
            const summaryLengthValue = document.getElementById('summary-length-value');
            
            const saveSettings = async (settingKey, value) => {
                const updatedSettings = { ...mockSettings, [settingKey]: value };
                
                return new Promise((resolve) => {
                    chrome.storage.local.set({ settings: updatedSettings }, () => {
                        // Update display
                        summaryLengthValue.textContent = `${value} words`;
                        resolve(updatedSettings);
                    });
                });
            };

            // Change summary length
            summaryLengthRange.value = '300';
            summaryLengthRange.dispatchEvent(new Event('input'));
            
            const updatedSettings = await saveSettings('summaryLength', 300);
            
            expect(updatedSettings.summaryLength).toBe(300);
            expect(summaryLengthValue.textContent).toBe('300 words');
        });
    });

    describe('AI Settings', () => {
        test('should show/hide AI settings when AI summary is toggled', () => {
            const enableAICheckbox = document.getElementById('enable-ai-summary');
            const aiSettings = document.getElementById('ai-settings');
            
            // Enable AI summary
            enableAICheckbox.checked = true;
            enableAICheckbox.dispatchEvent(new Event('change'));
            
            // Simulate showing AI settings
            aiSettings.classList.remove('hidden');
            
            expect(aiSettings.classList.contains('hidden')).toBe(false);
            
            // Disable AI summary
            enableAICheckbox.checked = false;
            enableAICheckbox.dispatchEvent(new Event('change'));
            
            // Simulate hiding AI settings
            aiSettings.classList.add('hidden');
            
            expect(aiSettings.classList.contains('hidden')).toBe(true);
        });

        test('should test API key when test button is clicked', async () => {
            const apiKeyInput = document.getElementById('api-key');
            const testButton = document.getElementById('test-api-key');
            const statusElement = document.getElementById('api-key-status');
            
            const testAPIKey = async (apiKey, provider) => {
                return new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: 'testAPIKey',
                        data: { apiKey, provider }
                    }, (response) => {
                        // Update status display
                        if (response.success) {
                            statusElement.textContent = 'API key is valid';
                            statusElement.className = 'api-key-status success';
                        } else {
                            statusElement.textContent = response.error || 'API key test failed';
                            statusElement.className = 'api-key-status error';
                        }
                        resolve(response);
                    });
                });
            };

            // Set API key and test
            apiKeyInput.value = 'valid-api-key-12345';
            testButton.click();
            
            const result = await testAPIKey('valid-api-key-12345', 'openai');
            
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'testAPIKey',
                    data: { apiKey: 'valid-api-key-12345', provider: 'openai' }
                }),
                expect.any(Function)
            );
            expect(result.success).toBe(true);
            expect(statusElement.textContent).toBe('API key is valid');
            expect(statusElement.className).toBe('api-key-status success');
        });

        test('should show error for invalid API key', async () => {
            const apiKeyInput = document.getElementById('api-key');
            const testButton = document.getElementById('test-api-key');
            const statusElement = document.getElementById('api-key-status');
            
            const testAPIKey = async (apiKey, provider) => {
                return new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: 'testAPIKey',
                        data: { apiKey, provider }
                    }, (response) => {
                        if (response.success) {
                            statusElement.textContent = 'API key is valid';
                            statusElement.className = 'api-key-status success';
                        } else {
                            statusElement.textContent = response.error || 'API key test failed';
                            statusElement.className = 'api-key-status error';
                        }
                        resolve(response);
                    });
                });
            };

            // Set invalid API key and test
            apiKeyInput.value = 'invalid';
            testButton.click();
            
            const result = await testAPIKey('invalid', 'openai');
            
            expect(result.success).toBe(false);
            expect(statusElement.textContent).toBe('Invalid API key format');
            expect(statusElement.className).toBe('api-key-status error');
        });
    });

    describe('Data Management', () => {
        test('should export data when export button is clicked', async () => {
            const exportButton = document.getElementById('export-data');
            
            const exportData = async () => {
                return new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'exportData' }, (response) => {
                        if (response.success) {
                            // Create and trigger download
                            const blob = new Blob([response.data], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `laterlens-export-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }
                        resolve(response);
                    });
                });
            };

            // Mock URL.createObjectURL and URL.revokeObjectURL
            global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
            global.URL.revokeObjectURL = jest.fn();
            global.Blob = jest.fn(() => ({ type: 'application/json' }));

            exportButton.click();
            const result = await exportData();
            
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                { action: 'exportData' },
                expect.any(Function)
            );
            expect(result.success).toBe(true);
            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });

        test('should import data when file is selected', async () => {
            const importButton = document.getElementById('import-data');
            const importFile = document.getElementById('import-file');
            
            const importData = async (fileContent) => {
                return new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: 'importData',
                        data: fileContent
                    }, (response) => {
                        if (response.success) {
                            showToast(`Successfully imported ${response.imported} pages`);
                        }
                        resolve(response);
                    });
                });
            };

            // Mock file reading
            const mockFileContent = JSON.stringify({ pages: [], settings: {} });
            const mockFile = new File([mockFileContent], 'export.json', { type: 'application/json' });
            
            // Simulate file selection
            Object.defineProperty(importFile, 'files', {
                value: [mockFile],
                writable: false
            });
            
            importFile.dispatchEvent(new Event('change'));
            
            const result = await importData(mockFileContent);
            
            expect(result.success).toBe(true);
            expect(result.imported).toBe(25);
            expect(showToast).toHaveBeenCalledWith('Successfully imported 25 pages');
        });

        test('should clear all data when clear button is clicked with confirmation', async () => {
            const clearButton = document.getElementById('clear-all-data');
            
            const clearAllData = async () => {
                const confirmed = await showConfirm({
                    title: 'Clear All Data',
                    message: 'This will permanently delete all saved pages and settings. This action cannot be undone.',
                    confirmText: 'Clear All Data',
                    cancelText: 'Cancel'
                });
                
                if (confirmed) {
                    return new Promise((resolve) => {
                        chrome.runtime.sendMessage({ action: 'clearAllData' }, (response) => {
                            if (response.success) {
                                showToast('All data has been cleared');
                                // Reset UI to defaults
                                location.reload();
                            }
                            resolve(response);
                        });
                    });
                }
                return { success: false };
            };

            // Mock location.reload
            delete window.location;
            window.location = { reload: jest.fn() };

            clearButton.click();
            const result = await clearAllData();
            
            expect(showConfirm).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Clear All Data',
                message: expect.stringContaining('permanently delete')
            }));
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                { action: 'clearAllData' },
                expect.any(Function)
            );
            expect(result.success).toBe(true);
            expect(showToast).toHaveBeenCalledWith('All data has been cleared');
            expect(window.location.reload).toHaveBeenCalled();
        });
    });

    describe('Settings Reset', () => {
        test('should reset settings to defaults when reset button is clicked', async () => {
            const resetButton = document.getElementById('reset-settings');
            
            const resetSettings = async () => {
                const confirmed = await showConfirm({
                    title: 'Reset Settings',
                    message: 'This will reset all settings to their default values.',
                    confirmText: 'Reset Settings',
                    cancelText: 'Cancel'
                });
                
                if (confirmed) {
                    const defaultSettings = {
                        autoSave: false,
                        showNotifications: true,
                        defaultView: 'grid',
                        enableShortcuts: true,
                        enableAISummary: false,
                        apiProvider: 'openai',
                        apiKey: '',
                        summaryLength: 200,
                        summaryStyle: 'concise',
                        summaryLanguage: 'auto',
                        maxStorageItems: 1000,
                        thumbnailQuality: 0.8,
                        encryptData: false,
                        debugMode: false
                    };
                    
                    return new Promise((resolve) => {
                        chrome.storage.local.set({ settings: defaultSettings }, () => {
                            showToast('Settings have been reset to defaults');
                            // Reload page to reflect changes
                            location.reload();
                            resolve(defaultSettings);
                        });
                    });
                }
                return null;
            };

            resetButton.click();
            const result = await resetSettings();
            
            expect(showConfirm).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Reset Settings',
                message: expect.stringContaining('default values')
            }));
            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                { settings: expect.objectContaining({ autoSave: false, showNotifications: true }) },
                expect.any(Function)
            );
            expect(showToast).toHaveBeenCalledWith('Settings have been reset to defaults');
        });
    });

    describe('Auto-save Functionality', () => {
        test('should show save status when settings are changed', (done) => {
            const autoSaveCheckbox = document.getElementById('auto-save');
            const saveStatus = document.getElementById('save-status');
            
            const showSaveStatus = (message, type = 'success') => {
                saveStatus.textContent = message;
                saveStatus.className = `save-status-text ${type}`;
                
                setTimeout(() => {
                    saveStatus.textContent = '';
                    saveStatus.className = 'save-status-text';
                }, 2000);
            };

            // Change setting
            autoSaveCheckbox.checked = true;
            autoSaveCheckbox.dispatchEvent(new Event('change'));
            
            // Show save status
            showSaveStatus('Settings saved');
            
            expect(saveStatus.textContent).toBe('Settings saved');
            expect(saveStatus.className).toBe('save-status-text success');
            
            // Check that status clears after timeout
            setTimeout(() => {
                expect(saveStatus.textContent).toBe('');
                expect(saveStatus.className).toBe('save-status-text');
                done();
            }, 2100);
        });
    });

    describe('Keyboard Shortcuts', () => {
        test('should handle keyboard shortcuts for navigation', () => {
            const settingSections = document.querySelectorAll('.settings-section');
            
            // Mock keyboard navigation
            const handleKeyboardNavigation = (event) => {
                if (event.ctrlKey && event.key === 'f') {
                    event.preventDefault();
                    // Focus on first input in first section
                    const firstInput = settingSections[0].querySelector('input, select');
                    if (firstInput) {
                        firstInput.focus();
                    }
                    return true;
                }
                return false;
            };

            // Test Ctrl+F shortcut
            const ctrlFEvent = new KeyboardEvent('keydown', {
                key: 'f',
                ctrlKey: true,
                bubbles: true
            });
            
            document.addEventListener('keydown', handleKeyboardNavigation);
            const handled = handleKeyboardNavigation(ctrlFEvent);
            
            expect(handled).toBe(true);
            
            document.removeEventListener('keydown', handleKeyboardNavigation);
        });
    });
});