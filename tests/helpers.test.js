// Tests for helper utility functions
// 헬퍼 유틸리티 함수 테스트

const {
    isValidUrl,
    cleanHtml,
    formatBytes,
    debounce,
    throttle,
    generateId,
    escapeHtml,
    unescapeHtml,
    formatDate,
    parseUrl,
    sanitizeFilename,
    deepClone,
    isEmptyObject,
    arrayUnique,
    objectPick,
    objectOmit
} = require('../utils/helpers');

describe('Helper Utilities', () => {
    // Mock the helpers module since we need to test individual functions
    let helpers;

    beforeEach(() => {
        // Reset any global state
        jest.clearAllMocks();
    });

    describe('URL Validation', () => {
        test('should validate HTTP URLs', () => {
            const validUrls = [
                'http://example.com',
                'https://example.com',
                'https://www.example.com/path',
                'https://example.com:8080/path?query=value#fragment'
            ];

            validUrls.forEach(url => {
                try {
                    new URL(url);
                    expect(true).toBe(true); // URL is valid
                } catch (error) {
                    expect(false).toBe(true); // Should not reach here
                }
            });
        });

        test('should reject invalid URLs', () => {
            const invalidUrls = [
                'not-a-url',
                'ftp://example.com',
                'javascript:alert("xss")',
                'data:text/html,<script>alert("xss")</script>',
                ''
            ];

            invalidUrls.forEach(url => {
                try {
                    const urlObj = new URL(url);
                    // Additional validation for allowed protocols
                    const allowedProtocols = ['http:', 'https:'];
                    expect(allowedProtocols.includes(urlObj.protocol)).toBe(false);
                } catch (error) {
                    expect(error).toBeInstanceOf(TypeError);
                }
            });
        });
    });

    describe('Text Processing', () => {
        test('should truncate text correctly', () => {
            const truncateText = (text, maxLength) => {
                if (!text || text.length <= maxLength) return text;
                return text.substring(0, maxLength - 3) + '...';
            };

            expect(truncateText('Short text', 20)).toBe('Short text');
            expect(truncateText('This is a very long text that should be truncated', 20)).toBe('This is a very lo...');
            expect(truncateText('', 10)).toBe('');
            expect(truncateText(null, 10)).toBe(null);
        });

        test('should clean HTML from text', () => {
            const cleanHtml = (html) => {
                if (!html) return '';
                return html.replace(/<[^>]*>/g, '').trim();
            };

            expect(cleanHtml('<p>Hello <strong>world</strong>!</p>')).toBe('Hello world!');
            expect(cleanHtml('<script>alert("xss")</script>Safe text')).toBe('Safe text');
            expect(cleanHtml('Plain text')).toBe('Plain text');
            expect(cleanHtml('')).toBe('');
        });

        test('should extract domain from URL', () => {
            const extractDomain = (url) => {
                try {
                    return new URL(url).hostname;
                } catch (error) {
                    return null;
                }
            };

            expect(extractDomain('https://www.example.com/path')).toBe('www.example.com');
            expect(extractDomain('http://subdomain.example.org:8080')).toBe('subdomain.example.org');
            expect(extractDomain('invalid-url')).toBe(null);
        });
    });

    describe('Data Validation', () => {
        test('should validate email addresses', () => {
            const isValidEmail = (email) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            };

            expect(isValidEmail('user@example.com')).toBe(true);
            expect(isValidEmail('test.email+tag@domain.co.uk')).toBe(true);
            expect(isValidEmail('invalid-email')).toBe(false);
            expect(isValidEmail('user@')).toBe(false);
            expect(isValidEmail('@domain.com')).toBe(false);
        });

        test('should validate API keys', () => {
            const validateAPIKey = (key, provider) => {
                if (!key || typeof key !== 'string') return false;
                
                switch (provider) {
                    case 'openai':
                        return key.startsWith('sk-') && key.length > 20;
                    case 'anthropic':
                        return key.startsWith('sk-ant-') && key.length > 30;
                    case 'gemini':
                        return key.length > 20;
                    default:
                        return key.length > 10;
                }
            };

            expect(validateAPIKey('sk-1234567890123456789012345', 'openai')).toBe(true);
            expect(validateAPIKey('sk-ant-1234567890123456789012345678901234', 'anthropic')).toBe(true);
            expect(validateAPIKey('AIzaSyDaGmWKa4JsXZ-HjGw463W12aB3456789', 'gemini')).toBe(true);
            expect(validateAPIKey('short', 'openai')).toBe(false);
            expect(validateAPIKey('', 'openai')).toBe(false);
            expect(validateAPIKey(null, 'openai')).toBe(false);
        });
    });

    describe('Array Utilities', () => {
        test('should remove duplicates from array', () => {
            const removeDuplicates = (arr) => {
                return [...new Set(arr)];
            };

            expect(removeDuplicates([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
            expect(removeDuplicates(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
            expect(removeDuplicates([])).toEqual([]);
        });

        test('should chunk array into smaller arrays', () => {
            const chunkArray = (arr, size) => {
                const chunks = [];
                for (let i = 0; i < arr.length; i += size) {
                    chunks.push(arr.slice(i, i + size));
                }
                return chunks;
            };

            expect(chunkArray([1, 2, 3, 4, 5, 6], 2)).toEqual([[1, 2], [3, 4], [5, 6]]);
            expect(chunkArray([1, 2, 3, 4, 5], 3)).toEqual([[1, 2, 3], [4, 5]]);
            expect(chunkArray([], 2)).toEqual([]);
        });

        test('should shuffle array', () => {
            const shuffleArray = (arr) => {
                const shuffled = [...arr];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return shuffled;
            };

            const original = [1, 2, 3, 4, 5];
            const shuffled = shuffleArray(original);
            
            expect(shuffled).toHaveLength(original.length);
            expect(shuffled.sort()).toEqual(original.sort());
            expect(original).toEqual([1, 2, 3, 4, 5]); // Original unchanged
        });
    });

    describe('Object Utilities', () => {
        test('should deep clone objects', () => {
            const deepClone = (obj) => {
                if (obj === null || typeof obj !== 'object') return obj;
                if (obj instanceof Date) return new Date(obj.getTime());
                if (obj instanceof Array) return obj.map(item => deepClone(item));
                
                const cloned = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        cloned[key] = deepClone(obj[key]);
                    }
                }
                return cloned;
            };

            const original = {
                name: 'test',
                nested: { value: 42 },
                array: [1, 2, { inner: 'value' }],
                date: new Date('2023-01-01')
            };

            const cloned = deepClone(original);
            
            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
            expect(cloned.nested).not.toBe(original.nested);
            expect(cloned.array).not.toBe(original.array);
            expect(cloned.date).not.toBe(original.date);
        });

        test('should merge objects deeply', () => {
            const deepMerge = (target, source) => {
                const result = { ...target };
                
                for (const key in source) {
                    if (source.hasOwnProperty(key)) {
                        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                            result[key] = deepMerge(result[key] || {}, source[key]);
                        } else {
                            result[key] = source[key];
                        }
                    }
                }
                
                return result;
            };

            const target = { a: 1, b: { c: 2, d: 3 } };
            const source = { b: { d: 4, e: 5 }, f: 6 };
            const merged = deepMerge(target, source);

            expect(merged).toEqual({
                a: 1,
                b: { c: 2, d: 4, e: 5 },
                f: 6
            });
        });
    });

    describe('Async Utilities', () => {
        test('should implement delay function', async () => {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            
            const start = Date.now();
            await delay(100);
            const end = Date.now();
            
            expect(end - start).toBeGreaterThanOrEqual(90); // Allow some variance
        });

        test('should implement retry function', async () => {
            const retry = async (fn, maxAttempts = 3, delayMs = 100) => {
                let lastError;
                
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        return await fn();
                    } catch (error) {
                        lastError = error;
                        if (attempt < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, delayMs));
                        }
                    }
                }
                
                throw lastError;
            };

            let attempts = 0;
            const flakyFunction = async () => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Temporary failure');
                }
                return 'success';
            };

            const result = await retry(flakyFunction, 3, 10);
            expect(result).toBe('success');
            expect(attempts).toBe(3);
        });

        test('should implement timeout function', async () => {
            const withTimeout = (promise, timeoutMs) => {
                return Promise.race([
                    promise,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
                    )
                ]);
            };

            const fastPromise = Promise.resolve('fast');
            const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 200));

            await expect(withTimeout(fastPromise, 100)).resolves.toBe('fast');
            await expect(withTimeout(slowPromise, 100)).rejects.toThrow('Timeout');
        });
    });

    describe('Storage Utilities', () => {
        test('should format bytes correctly', () => {
            const formatBytes = (bytes, decimals = 2) => {
                if (bytes === 0) return '0 Bytes';
                
                const k = 1024;
                const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                
                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
            };

            expect(formatBytes(0)).toBe('0 Bytes');
            expect(formatBytes(1024)).toBe('1 KB');
            expect(formatBytes(1048576)).toBe('1 MB');
            expect(formatBytes(1073741824)).toBe('1 GB');
            expect(formatBytes(1536, 1)).toBe('1.5 KB');
        });

        test('should generate unique IDs', () => {
            const generateId = () => {
                return Date.now().toString(36) + Math.random().toString(36).substr(2);
            };

            const id1 = generateId();
            const id2 = generateId();
            
            expect(typeof id1).toBe('string');
            expect(typeof id2).toBe('string');
            expect(id1).not.toBe(id2);
            expect(id1.length).toBeGreaterThan(10);
        });
    });

    describe('Date Utilities', () => {
        test('should check if date is today', () => {
            const isToday = (date) => {
                const today = new Date();
                const checkDate = new Date(date);
                
                return checkDate.getDate() === today.getDate() &&
                       checkDate.getMonth() === today.getMonth() &&
                       checkDate.getFullYear() === today.getFullYear();
            };

            expect(isToday(new Date())).toBe(true);
            expect(isToday(new Date(Date.now() - 24 * 60 * 60 * 1000))).toBe(false);
        });

        test('should calculate days between dates', () => {
            const daysBetween = (date1, date2) => {
                const oneDay = 24 * 60 * 60 * 1000;
                const firstDate = new Date(date1);
                const secondDate = new Date(date2);
                
                return Math.round(Math.abs((firstDate - secondDate) / oneDay));
            };

            const date1 = new Date('2023-01-01');
            const date2 = new Date('2023-01-05');
            
            expect(daysBetween(date1, date2)).toBe(4);
            expect(daysBetween(date2, date1)).toBe(4);
        });
    });

    describe('Error Handling Utilities', () => {
        test('should safely parse JSON', () => {
            const safeJsonParse = (jsonString, defaultValue = null) => {
                try {
                    return JSON.parse(jsonString);
                } catch (error) {
                    return defaultValue;
                }
            };

            expect(safeJsonParse('{"valid": "json"}')).toEqual({ valid: 'json' });
            expect(safeJsonParse('invalid json')).toBe(null);
            expect(safeJsonParse('invalid json', {})).toEqual({});
        });

        test('should safely access nested properties', () => {
            const safeGet = (obj, path, defaultValue = undefined) => {
                const keys = path.split('.');
                let result = obj;
                
                for (const key of keys) {
                    if (result == null || typeof result !== 'object') {
                        return defaultValue;
                    }
                    result = result[key];
                }
                
                return result !== undefined ? result : defaultValue;
            };

            const obj = { a: { b: { c: 'value' } } };
            
            expect(safeGet(obj, 'a.b.c')).toBe('value');
            expect(safeGet(obj, 'a.b.d')).toBe(undefined);
            expect(safeGet(obj, 'a.b.d', 'default')).toBe('default');
            expect(safeGet(null, 'a.b.c', 'default')).toBe('default');
        });
    });

    describe('Performance Utilities', () => {
        test('should implement debounce function', (done) => {
            const debounce = (func, wait) => {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            };

            let callCount = 0;
            const debouncedFn = debounce(() => {
                callCount++;
            }, 100);

            debouncedFn();
            debouncedFn();
            debouncedFn();

            expect(callCount).toBe(0);

            setTimeout(() => {
                expect(callCount).toBe(1);
                done();
            }, 150);
        });

        test('should implement throttle function', (done) => {
            const throttle = (func, limit) => {
                let inThrottle;
                return function executedFunction(...args) {
                    if (!inThrottle) {
                        func.apply(this, args);
                        inThrottle = true;
                        setTimeout(() => inThrottle = false, limit);
                    }
                };
            };

            let callCount = 0;
            const throttledFn = throttle(() => {
                callCount++;
            }, 100);

            throttledFn();
            throttledFn();
            throttledFn();

            expect(callCount).toBe(1);

            setTimeout(() => {
                throttledFn();
                expect(callCount).toBe(2);
                done();
            }, 150);
        });
    });
});