// Tests for internationalization functionality
// 국제화 기능 테스트

const { I18nManager } = require('../utils/i18n');

describe('I18nManager', () => {
    let i18nManager;

    beforeEach(() => {
        // Mock Chrome i18n API
        global.chrome = {
            i18n: {
                getUILanguage: jest.fn(() => 'en-US'),
                getMessage: jest.fn((key, substitutions) => {
                    const messages = {
                        'extensionName': 'LaterLens',
                        'popup_title': 'LaterLens - Saved Pages',
                        'popup_empty_title': 'No saved pages yet',
                        'popup_save_current': 'Save Current Page',
                        'options_title': 'LaterLens Settings',
                        'general_settings_title': 'General Settings',
                        'ai_settings_title': 'AI & Summary Settings'
                    };
                    
                    let message = messages[key] || key;
                    
                    // Handle substitutions
                    if (substitutions && substitutions.length > 0) {
                        substitutions.forEach((sub, index) => {
                            message = message.replace(`$${index + 1}`, sub);
                        });
                    }
                    
                    return message;
                })
            }
        };

        // Create new instance for each test
        i18nManager = new I18nManager();
    });

    afterEach(() => {
        delete global.chrome;
    });

    describe('Language Detection', () => {
        test('should detect English as default language', () => {
            expect(i18nManager.getCurrentLanguage()).toBe('en');
        });

        test('should detect Korean when browser language is ko-KR', () => {
            chrome.i18n.getUILanguage.mockReturnValue('ko-KR');
            const manager = new I18nManager();
            expect(manager.getCurrentLanguage()).toBe('ko');
        });

        test('should fallback to English for unsupported languages', () => {
            chrome.i18n.getUILanguage.mockReturnValue('fr-FR');
            const manager = new I18nManager();
            expect(manager.getCurrentLanguage()).toBe('en');
        });
    });

    describe('Message Retrieval', () => {
        test('should get message by key', () => {
            const message = i18nManager.getMessage('extensionName');
            expect(message).toBe('LaterLens');
        });

        test('should return key as fallback for missing messages', () => {
            chrome.i18n.getMessage.mockReturnValue('');
            const message = i18nManager.getMessage('nonexistent_key');
            expect(message).toBe('nonexistent_key');
        });

        test('should handle substitutions', () => {
            chrome.i18n.getMessage.mockImplementation((key, subs) => {
                if (key === 'test_message' && subs) {
                    return `Hello $1, you have $2 messages`;
                }
                return key;
            });

            const message = i18nManager.getMessage('test_message', ['John', '5']);
            expect(chrome.i18n.getMessage).toHaveBeenCalledWith('test_message', ['John', '5']);
        });
    });

    describe('Language Support', () => {
        test('should return supported languages', () => {
            const languages = i18nManager.getSupportedLanguages();
            expect(languages).toEqual(['en', 'ko']);
        });

        test('should check if language is supported', () => {
            expect(i18nManager.isLanguageSupported('en')).toBe(true);
            expect(i18nManager.isLanguageSupported('ko')).toBe(true);
            expect(i18nManager.isLanguageSupported('fr')).toBe(false);
        });

        test('should set language manually', () => {
            const result = i18nManager.setLanguage('ko');
            expect(result).toBe(true);
            expect(i18nManager.getCurrentLanguage()).toBe('ko');
        });

        test('should not set unsupported language', () => {
            const result = i18nManager.setLanguage('fr');
            expect(result).toBe(false);
            expect(i18nManager.getCurrentLanguage()).toBe('en'); // Should remain unchanged
        });
    });

    describe('Language Display Names', () => {
        test('should return correct display names', () => {
            expect(i18nManager.getLanguageDisplayName('en')).toBe('English');
            expect(i18nManager.getLanguageDisplayName('ko')).toBe('한국어');
            expect(i18nManager.getLanguageDisplayName('ja')).toBe('日本語');
        });

        test('should return uppercase code for unknown languages', () => {
            expect(i18nManager.getLanguageDisplayName('xyz')).toBe('XYZ');
        });
    });

    describe('Text Direction', () => {
        test('should return LTR for supported languages', () => {
            expect(i18nManager.getTextDirection()).toBe('ltr');
            
            i18nManager.setLanguage('ko');
            expect(i18nManager.getTextDirection()).toBe('ltr');
        });
    });

    describe('Number Formatting', () => {
        test('should format numbers according to locale', () => {
            const number = 1234.56;
            const formatted = i18nManager.formatNumber(number);
            expect(typeof formatted).toBe('string');
            expect(formatted).toContain('1');
        });

        test('should handle formatting errors gracefully', () => {
            // Mock Intl.NumberFormat to throw error
            const originalNumberFormat = Intl.NumberFormat;
            Intl.NumberFormat = jest.fn(() => {
                throw new Error('Formatting error');
            });

            const result = i18nManager.formatNumber(123);
            expect(result).toBe('123');

            // Restore original
            Intl.NumberFormat = originalNumberFormat;
        });
    });

    describe('Message Formatting', () => {
        test('should format messages with named substitutions', () => {
            i18nManager.getMessage = jest.fn(() => 'Hello {name}, you have {count} messages');
            
            const formatted = i18nManager.formatMessage('test_key', {
                name: 'John',
                count: '5'
            });
            
            expect(formatted).toBe('Hello John, you have 5 messages');
        });
    });

    describe('Common Texts', () => {
        test('should return common UI texts', () => {
            const commonTexts = i18nManager.getCommonTexts();
            
            expect(commonTexts).toHaveProperty('save');
            expect(commonTexts).toHaveProperty('cancel');
            expect(commonTexts).toHaveProperty('loading');
            expect(commonTexts).toHaveProperty('ready');
        });
    });
});

describe('Localization Functions', () => {
    beforeEach(() => {
        // Mock DOM
        document.body.innerHTML = '';
        
        // Mock Chrome i18n API
        global.chrome = {
            i18n: {
                getUILanguage: jest.fn(() => 'en-US'),
                getMessage: jest.fn((key) => {
                    const messages = {
                        'popup_title': 'LaterLens - Saved Pages',
                        'popup_save_current': 'Save Current Page',
                        'popup_search_placeholder': 'Search saved pages...'
                    };
                    return messages[key] || key;
                })
            }
        };

        // Mock i18n global
        global.i18n = new I18nManager();
    });

    afterEach(() => {
        delete global.chrome;
        delete global.i18n;
    });

    describe('Element Localization', () => {
        test('should localize elements with data-i18n attribute', () => {
            document.body.innerHTML = `
                <div data-i18n="popup_title">Original Text</div>
                <button data-i18n="popup_save_current">Save</button>
            `;

            const container = document.body;
            i18n.localizeContainer(container);

            expect(document.querySelector('[data-i18n="popup_title"]').textContent)
                .toBe('LaterLens - Saved Pages');
            expect(document.querySelector('[data-i18n="popup_save_current"]').textContent)
                .toBe('Save Current Page');
        });

        test('should localize input placeholders', () => {
            document.body.innerHTML = `
                <input type="text" data-i18n-placeholder="popup_search_placeholder" placeholder="Original">
            `;

            i18n.localizeContainer(document.body);

            expect(document.querySelector('input').placeholder)
                .toBe('Search saved pages...');
        });

        test('should localize element titles', () => {
            document.body.innerHTML = `
                <button data-i18n-title="popup_save_current" title="Original">Button</button>
            `;

            i18n.localizeContainer(document.body);

            expect(document.querySelector('button').title)
                .toBe('Save Current Page');
        });
    });

    describe('Dynamic Content Localization', () => {
        test('should update element text with localized content', () => {
            document.body.innerHTML = '<div id="test-element">Original</div>';

            updateElementText('test-element', 'popup_title');

            expect(document.getElementById('test-element').textContent)
                .toBe('LaterLens - Saved Pages');
        });

        test('should handle missing elements gracefully', () => {
            expect(() => {
                updateElementText('nonexistent-element', 'popup_title');
            }).not.toThrow();
        });
    });

    describe('HTML Template Localization', () => {
        test('should create localized HTML from template', () => {
            const template = '<h1>{{popup_title}}</h1><p>Welcome {name}!</p>';
            const data = { name: 'John' };

            const result = createLocalizedHTML(template, data);

            expect(result).toBe('<h1>LaterLens - Saved Pages</h1><p>Welcome John!</p>');
        });
    });

    describe('Select Options Localization', () => {
        test('should localize select options', () => {
            document.body.innerHTML = '<select id="test-select"></select>';

            const options = [
                { value: 'en', messageKey: 'language_english' },
                { value: 'ko', messageKey: 'language_korean' }
            ];

            // Mock additional messages
            chrome.i18n.getMessage.mockImplementation((key) => {
                const messages = {
                    'language_english': 'English',
                    'language_korean': '한국어'
                };
                return messages[key] || key;
            });

            localizeSelectOptions('test-select', options);

            const select = document.getElementById('test-select');
            expect(select.children.length).toBe(2);
            expect(select.children[0].textContent).toBe('English');
            expect(select.children[1].textContent).toBe('한국어');
        });
    });

    describe('Error Message Localization', () => {
        test('should return localized error messages', () => {
            // Test English error messages
            expect(getLocalizedErrorMessage('network')).toContain('network error');
            expect(getLocalizedErrorMessage('storage')).toContain('storage error');
            expect(getLocalizedErrorMessage('unknown')).toContain('unknown error');
        });

        test('should include error details when provided', () => {
            const details = { message: 'Connection timeout' };
            const errorMessage = getLocalizedErrorMessage('network', details);
            
            expect(errorMessage).toContain('network error');
            expect(errorMessage).toContain('Connection timeout');
        });
    });

    describe('Language Detection Helpers', () => {
        test('should detect current language correctly', () => {
            expect(getCurrentLanguage()).toBe('en');
            expect(isEnglish()).toBe(true);
            expect(isKorean()).toBe(false);
        });
    });
});

describe('Date and Number Formatting', () => {
    beforeEach(() => {
        global.chrome = {
            i18n: {
                getUILanguage: jest.fn(() => 'en-US'),
                getMessage: jest.fn((key) => key)
            }
        };
        global.i18n = new I18nManager();
    });

    afterEach(() => {
        delete global.chrome;
        delete global.i18n;
    });

    test('should format dates according to locale', () => {
        const date = new Date('2023-12-25');
        const formatted = formatDate(date);
        
        expect(typeof formatted).toBe('string');
        expect(formatted).toContain('2023');
    });

    test('should format numbers according to locale', () => {
        const number = 1234.56;
        const formatted = formatNumber(number);
        
        expect(typeof formatted).toBe('string');
        expect(formatted).toContain('1');
    });

    test('should format relative time', () => {
        const pastDate = new Date(Date.now() - 60000); // 1 minute ago
        const formatted = formatRelativeTime(pastDate);
        
        expect(typeof formatted).toBe('string');
    });
});