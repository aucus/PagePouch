// Test setup for LaterLens Chrome extension
// LaterLens Chrome 확장 프로그램 테스트 설정

// Mock Chrome APIs
global.chrome = {
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn(),
            getBytesInUse: jest.fn()
        },
        sync: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn()
        }
    },
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn()
        },
        lastError: null,
        getURL: jest.fn((path) => `chrome-extension://test-id/${path}`)
    },
    tabs: {
        query: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        captureVisibleTab: jest.fn(),
        sendMessage: jest.fn()
    },
    scripting: {
        executeScript: jest.fn()
    },
    notifications: {
        create: jest.fn(),
        clear: jest.fn()
    },
    i18n: {
        getMessage: jest.fn((key, substitutions) => {
            // Mock i18n messages
            const messages = {
                'extensionName': 'LaterLens',
                'extensionDescription': 'Save pages for later reading',
                'popup_title': 'LaterLens - Saved Pages',
                'popup_empty_title': 'No saved pages yet',
                'popup_save_current': 'Save Current Page',
                'loading_pages': 'Loading pages...',
                'loading_saving': 'Saving page...',
                'error_network': 'Network error occurred',
                'error_storage': 'Storage error occurred'
            };
            
            let message = messages[key] || key;
            
            // Handle substitutions
            if (substitutions && Array.isArray(substitutions)) {
                substitutions.forEach((sub, index) => {
                    message = message.replace(`$${index + 1}`, sub);
                });
            }
            
            return message;
        }),
        getUILanguage: jest.fn(() => 'en-US')
    }
};

// Mock DOM APIs
global.document = {
    createElement: jest.fn(() => ({
        id: '',
        className: '',
        innerHTML: '',
        textContent: '',
        style: {},
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(),
            toggle: jest.fn()
        },
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        removeAttribute: jest.fn(),
        focus: jest.fn(),
        blur: jest.fn(),
        click: jest.fn(),
        parentNode: null,
        children: [],
        value: '',
        checked: false,
        disabled: false
    })),
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    head: {
        appendChild: jest.fn()
    },
    body: {
        appendChild: jest.fn(),
        style: {}
    },
    readyState: 'complete'
};

global.window = {
    location: {
        href: 'https://example.com',
        origin: 'https://example.com',
        pathname: '/',
        search: '',
        hash: ''
    },
    navigator: {
        userAgent: 'Mozilla/5.0 (Test Browser) Chrome/91.0.4472.124'
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setTimeout: jest.fn((fn, delay) => {
        if (typeof fn === 'function') {
            return setTimeout(fn, delay);
        }
        return 1;
    }),
    clearTimeout: jest.fn(),
    setInterval: jest.fn(),
    clearInterval: jest.fn(),
    requestAnimationFrame: jest.fn((fn) => {
        if (typeof fn === 'function') {
            setTimeout(fn, 16);
        }
        return 1;
    }),
    cancelAnimationFrame: jest.fn(),
    fetch: jest.fn(),
    URL: {
        createObjectURL: jest.fn(() => 'blob:test-url'),
        revokeObjectURL: jest.fn()
    }
};

// Mock console methods to avoid noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

// Mock Intl APIs
global.Intl = {
    DateTimeFormat: jest.fn().mockImplementation((locale, options) => ({
        format: jest.fn((date) => {
            if (locale === 'ko-KR') {
                return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
            } else {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
            }
        })
    })),
    RelativeTimeFormat: jest.fn().mockImplementation((locale, options) => ({
        format: jest.fn((value, unit) => {
            if (locale === 'ko-KR') {
                return `${Math.abs(value)}${unit === 'day' ? '일' : unit === 'hour' ? '시간' : '분'} ${value < 0 ? '전' : '후'}`;
            } else {
                const suffix = value < 0 ? ' ago' : ' from now';
                return `${Math.abs(value)} ${unit}${Math.abs(value) !== 1 ? 's' : ''}${suffix}`;
            }
        })
    })),
    NumberFormat: jest.fn().mockImplementation((locale, options) => ({
        format: jest.fn((number) => number.toLocaleString())
    }))
};

// Mock File and Blob APIs
global.File = jest.fn();
global.Blob = jest.fn();
global.FileReader = jest.fn(() => ({
    readAsText: jest.fn(),
    readAsDataURL: jest.fn(),
    onload: null,
    onerror: null,
    result: null
}));

// Mock Image API
global.Image = jest.fn(() => ({
    onload: null,
    onerror: null,
    src: '',
    width: 0,
    height: 0
}));

// Mock Canvas API
global.HTMLCanvasElement = jest.fn();
global.CanvasRenderingContext2D = jest.fn();

// Mock localStorage and sessionStorage
const createMockStorage = () => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: jest.fn((index) => Object.keys(store)[index] || null)
    };
};

global.localStorage = createMockStorage();
global.sessionStorage = createMockStorage();

// Mock crypto API
global.crypto = {
    getRandomValues: jest.fn((array) => {
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    }),
    randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9))
};

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => [])
};

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock MutationObserver
global.MutationObserver = jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(() => [])
}));

// Helper functions for tests
global.createMockElement = (tagName = 'div', properties = {}) => {
    const element = {
        tagName: tagName.toUpperCase(),
        id: '',
        className: '',
        innerHTML: '',
        textContent: '',
        value: '',
        checked: false,
        disabled: false,
        style: {},
        dataset: {},
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(),
            toggle: jest.fn()
        },
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        removeAttribute: jest.fn(),
        focus: jest.fn(),
        blur: jest.fn(),
        click: jest.fn(),
        parentNode: null,
        children: [],
        ...properties
    };
    
    return element;
};

global.createMockChromeStorage = () => ({
    get: jest.fn((keys, callback) => {
        const result = {};
        if (typeof keys === 'string') {
            result[keys] = null;
        } else if (Array.isArray(keys)) {
            keys.forEach(key => {
                result[key] = null;
            });
        } else if (typeof keys === 'object') {
            Object.assign(result, keys);
        }
        callback(result);
    }),
    set: jest.fn((items, callback) => {
        if (callback) callback();
    }),
    remove: jest.fn((keys, callback) => {
        if (callback) callback();
    }),
    clear: jest.fn((callback) => {
        if (callback) callback();
    }),
    getBytesInUse: jest.fn((keys, callback) => {
        callback(1024); // Mock 1KB usage
    })
});

global.createMockSavedPage = (overrides = {}) => ({
    id: 'test-page-id',
    url: 'https://example.com/test-page',
    title: 'Test Page Title',
    content: 'Test page content for testing purposes.',
    summary: 'Test summary',
    thumbnail: 'data:image/png;base64,test-thumbnail-data',
    createdAt: new Date('2023-01-01T12:00:00Z'),
    updatedAt: new Date('2023-01-01T12:00:00Z'),
    tags: ['test', 'example'],
    metadata: {
        description: 'Test page description',
        author: 'Test Author',
        siteName: 'Test Site'
    },
    ...overrides
});

// Setup Jest environment
beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Ensure Chrome API is properly mocked
    global.chrome = {
        storage: {
            local: {
                get: jest.fn(),
                set: jest.fn(),
                remove: jest.fn(),
                clear: jest.fn(),
                getBytesInUse: jest.fn()
            },
            sync: {
                get: jest.fn(),
                set: jest.fn(),
                remove: jest.fn(),
                clear: jest.fn()
            }
        },
        runtime: {
            sendMessage: jest.fn(),
            onMessage: {
                addListener: jest.fn(),
                removeListener: jest.fn()
            },
            lastError: null,
            getURL: jest.fn((path) => `chrome-extension://test-id/${path}`)
        },
        tabs: {
            query: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            captureVisibleTab: jest.fn(),
            sendMessage: jest.fn()
        },
        scripting: {
            executeScript: jest.fn()
        },
        notifications: {
            create: jest.fn(),
            clear: jest.fn()
        },
        i18n: {
            getMessage: jest.fn((key, substitutions) => {
                const messages = {
                    'extensionName': 'LaterLens',
                    'extensionDescription': 'Save pages for later reading',
                    'popup_title': 'LaterLens - Saved Pages',
                    'popup_empty_title': 'No saved pages yet',
                    'popup_save_current': 'Save Current Page',
                    'loading_pages': 'Loading pages...',
                    'loading_saving': 'Saving page...',
                    'error_network': 'Network error occurred',
                    'error_storage': 'Storage error occurred'
                };
                
                let message = messages[key] || key;
                
                if (substitutions && Array.isArray(substitutions)) {
                    substitutions.forEach((sub, index) => {
                        message = message.replace(`${index + 1}`, sub);
                    });
                }
                
                return message;
            }),
            getUILanguage: jest.fn(() => 'en-US')
        }
    };
});

afterEach(() => {
    // Clean up any global state
    if (global.loadingManager) {
        global.loadingManager.hideAll();
    }
    
    if (global.toastManager) {
        global.toastManager.hideAll();
    }
    
    if (global.modalManager) {
        global.modalManager.closeAll();
    }
});

// Export for use in test files
module.exports = {
    createMockElement: global.createMockElement,
    createMockChromeStorage: global.createMockChromeStorage,
    createMockSavedPage: global.createMockSavedPage
};