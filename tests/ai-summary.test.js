// Test suite for AI Summary Service
// AI 요약 서비스 테스트 스위트

const { AISummaryService, OpenAIProvider, AnthropicProvider, GeminiProvider, OllamaProvider } = require('../utils/ai-summary.js');

describe('AISummaryService', () => {
    let aiService;
    
    beforeEach(() => {
        aiService = new AISummaryService();
        
        // Mock chrome storage
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn((keys, callback) => {
                        callback({
                            enableAISummary: false,
                            aiProvider: 'openai',
                            apiKey: ''
                        });
                    })
                }
            }
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('isConfigured', () => {
        test('should return false when AI summary is disabled', async () => {
            const isConfigured = await aiService.isConfigured();
            expect(isConfigured).toBe(false);
        });

        test('should return false when no API key is provided', async () => {
            global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({
                    enableAISummary: true,
                    aiProvider: 'openai',
                    apiKey: ''
                });
            });

            const isConfigured = await aiService.isConfigured();
            expect(isConfigured).toBe(false);
        });

        test('should return true when properly configured', async () => {
            global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({
                    enableAISummary: true,
                    aiProvider: 'openai',
                    apiKey: 'sk-test-key'
                });
            });

            // Mock provider isConfigured method
            aiService.providers.openai.isConfigured = jest.fn().mockResolvedValue(true);

            const isConfigured = await aiService.isConfigured();
            expect(isConfigured).toBe(true);
        });
    });

    describe('generateSummary', () => {
        test('should return fallback when AI is disabled', async () => {
            const content = 'This is a test content for summarization.';
            const result = await aiService.generateSummary(content);

            expect(result.success).toBe(false);
            expect(result.error).toBe('AI summary is disabled');
            expect(result.fallback).toBe('요약 없음');
        });

        test('should return error for content too short', async () => {
            global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({
                    enableAISummary: true,
                    aiProvider: 'openai',
                    apiKey: 'sk-test-key'
                });
            });

            const shortContent = 'Too short';
            const result = await aiService.generateSummary(shortContent);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Content too short for summarization');
        });

        test('should generate summary successfully', async () => {
            global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({
                    enableAISummary: true,
                    aiProvider: 'openai',
                    apiKey: 'sk-test-key'
                });
            });

            const content = 'This is a long enough content for summarization. It contains multiple sentences and provides enough context for the AI to generate a meaningful summary.';
            
            // Mock successful summary generation
            aiService.attemptSummary = jest.fn().mockResolvedValue({
                success: true,
                summary: 'Test summary',
                language: 'en'
            });

            const result = await aiService.generateSummary(content);

            expect(result.success).toBe(true);
            expect(result.summary).toBe('Test summary');
            expect(result.metadata).toBeDefined();
            expect(result.metadata.originalLength).toBe(content.length);
        });

        test('should retry on failure and return fallback', async () => {
            global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({
                    enableAISummary: true,
                    aiProvider: 'openai',
                    apiKey: 'sk-test-key'
                });
            });

            const content = 'This is a long enough content for summarization. It contains multiple sentences and provides enough context.';
            
            // Mock failed attempts
            aiService.attemptSummary = jest.fn().mockRejectedValue(new Error('API Error'));

            const result = await aiService.generateSummary(content);

            expect(result.success).toBe(false);
            expect(result.fallback).toBeDefined();
            expect(aiService.attemptSummary).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });
    });

    describe('preprocessContent', () => {
        test('should clean and limit content length', () => {
            const longContent = 'A'.repeat(5000);
            const config = { maxLength: 200 };
            
            const processed = aiService.preprocessContent(longContent, config);
            
            expect(processed.length).toBeLessThanOrEqual(4000);
        });

        test('should remove URLs', () => {
            const contentWithUrls = 'Check this link https://example.com for more info.';
            const config = {};
            
            const processed = aiService.preprocessContent(contentWithUrls, config);
            
            expect(processed).not.toContain('https://example.com');
        });

        test('should normalize whitespace', () => {
            const messyContent = 'This   has    multiple     spaces.';
            const config = {};
            
            const processed = aiService.preprocessContent(messyContent, config);
            
            expect(processed).toBe('This has multiple spaces.');
        });
    });

    describe('generateFallbackSummary', () => {
        test('should extract first few sentences', () => {
            const content = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
            
            const fallback = aiService.generateFallbackSummary(content);
            
            expect(fallback).toContain('First sentence');
            expect(fallback.length).toBeLessThanOrEqual(150);
        });

        test('should handle content without sentences', () => {
            const content = 'No sentences here just words';
            
            const fallback = aiService.generateFallbackSummary(content);
            
            expect(fallback).toBe('콘텐츠 요약');
        });

        test('should handle empty content', () => {
            const content = '';
            
            const fallback = aiService.generateFallbackSummary(content);
            
            expect(fallback).toBe('요약을 생성할 수 없습니다');
        });
    });

    describe('getAvailableProviders', () => {
        test('should return list of available providers', () => {
            const providers = aiService.getAvailableProviders();
            
            expect(providers).toHaveLength(4);
            expect(providers.map(p => p.id)).toEqual(['openai', 'anthropic', 'gemini', 'ollama']);
            
            providers.forEach(provider => {
                expect(provider).toHaveProperty('id');
                expect(provider).toHaveProperty('name');
                expect(provider).toHaveProperty('description');
                expect(provider).toHaveProperty('requiresApiKey');
                expect(provider).toHaveProperty('supportedLanguages');
            });
        });
    });
});

describe('OpenAIProvider', () => {
    let provider;
    
    beforeEach(() => {
        provider = new OpenAIProvider();
        
        // Mock fetch
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('isConfigured', () => {
        test('should return true for valid OpenAI API key', async () => {
            const settings = { apiKey: 'sk-test-key-123' };
            const isConfigured = await provider.isConfigured(settings);
            expect(isConfigured).toBe(true);
        });

        test('should return false for invalid API key format', async () => {
            const settings = { apiKey: 'invalid-key' };
            const isConfigured = await provider.isConfigured(settings);
            expect(isConfigured).toBe(false);
        });

        test('should return false for empty API key', async () => {
            const settings = { apiKey: '' };
            const isConfigured = await provider.isConfigured(settings);
            expect(isConfigured).toBe(false);
        });
    });

    describe('testConnection', () => {
        test('should return success for valid API key', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: [] })
            });

            const settings = { apiKey: 'sk-test-key' };
            const result = await provider.testConnection(settings);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Connection successful');
        });

        test('should return error for invalid API key', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                json: () => Promise.resolve({
                    error: { message: 'Invalid API key' }
                })
            });

            const settings = { apiKey: 'sk-invalid-key' };
            const result = await provider.testConnection(settings);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid API key');
        });

        test('should handle network errors', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            const settings = { apiKey: 'sk-test-key' };
            const result = await provider.testConnection(settings);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });
    });

    describe('generateSummary', () => {
        test('should generate summary successfully', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{
                        message: {
                            content: 'This is a test summary.'
                        }
                    }],
                    usage: {
                        total_tokens: 50
                    }
                })
            });

            const content = 'Test content for summarization.';
            const config = { maxLength: 200, language: 'en' };
            const settings = { apiKey: 'sk-test-key' };

            const result = await provider.generateSummary(content, config, settings);

            expect(result.success).toBe(true);
            expect(result.summary).toBe('This is a test summary.');
            expect(result.tokensUsed).toBe(50);
        });

        test('should handle API errors', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                json: () => Promise.resolve({
                    error: { message: 'Rate limit exceeded' }
                })
            });

            const content = 'Test content';
            const config = { maxLength: 200 };
            const settings = { apiKey: 'sk-test-key' };

            const result = await provider.generateSummary(content, config, settings);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Rate limit exceeded');
        });

        test('should handle empty response', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [],
                    usage: { total_tokens: 0 }
                })
            });

            const content = 'Test content';
            const config = { maxLength: 200 };
            const settings = { apiKey: 'sk-test-key' };

            const result = await provider.generateSummary(content, config, settings);

            expect(result.success).toBe(false);
            expect(result.error).toBe('No summary generated');
        });
    });

    describe('buildPrompt', () => {
        test('should build Korean prompt', () => {
            const content = 'Test content';
            const config = { language: 'ko', maxLength: 200, style: 'concise' };
            
            const prompt = provider.buildPrompt(content, config);
            
            expect(prompt).toContain('한국어로 요약해주세요');
            expect(prompt).toContain('200자 이내로');
            expect(prompt).toContain('간결하고 핵심적인');
        });

        test('should build English prompt', () => {
            const content = 'Test content';
            const config = { language: 'en', maxLength: 200, style: 'detailed' };
            
            const prompt = provider.buildPrompt(content, config);
            
            expect(prompt).toContain('Please summarize in English');
            expect(prompt).toContain('상세하고 포괄적인');
        });

        test('should build auto language prompt', () => {
            const content = 'Test content';
            const config = { language: 'auto', maxLength: 200, style: 'bullet' };
            
            const prompt = provider.buildPrompt(content, config);
            
            expect(prompt).toContain('내용의 주요 언어로');
            expect(prompt).toContain('불릿 포인트로');
        });
    });
});

describe('OllamaProvider', () => {
    let provider;
    
    beforeEach(() => {
        provider = new OllamaProvider();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('requiresApiKey', () => {
        test('should return false', () => {
            expect(provider.requiresApiKey()).toBe(false);
        });
    });

    describe('isConfigured', () => {
        test('should return true when Ollama is running', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ models: [] })
            });

            const isConfigured = await provider.isConfigured({});
            expect(isConfigured).toBe(true);
        });

        test('should return false when Ollama is not running', async () => {
            global.fetch.mockRejectedValue(new Error('Connection refused'));

            const isConfigured = await provider.isConfigured({});
            expect(isConfigured).toBe(false);
        });
    });

    describe('testConnection', () => {
        test('should return success with available models', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    models: [
                        { name: 'llama2' },
                        { name: 'codellama' }
                    ]
                })
            });

            const result = await provider.testConnection({});

            expect(result.success).toBe(true);
            expect(result.models).toEqual(['llama2', 'codellama']);
        });

        test('should return error when server not accessible', async () => {
            global.fetch.mockResolvedValue({
                ok: false
            });

            const result = await provider.testConnection({});

            expect(result.success).toBe(false);
            expect(result.error).toBe('Ollama server not accessible');
        });
    });
});

describe('Integration Tests', () => {
    test('should handle provider switching', async () => {
        const aiService = new AISummaryService();
        
        // Mock different providers
        aiService.providers.openai.isConfigured = jest.fn().mockResolvedValue(false);
        aiService.providers.ollama.isConfigured = jest.fn().mockResolvedValue(true);
        
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn((keys, callback) => {
                        callback({
                            enableAISummary: true,
                            aiProvider: 'openai',
                            apiKey: ''
                        });
                    })
                }
            }
        };

        const isConfigured = await aiService.isConfigured();
        expect(isConfigured).toBe(false);

        // Test with Ollama
        const isOllamaConfigured = await aiService.isConfigured('ollama');
        expect(isOllamaConfigured).toBe(true);
    });

    test('should handle timeout scenarios', async () => {
        const aiService = new AISummaryService();
        aiService.timeout = 100; // Very short timeout for testing
        
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn((keys, callback) => {
                        callback({
                            enableAISummary: true,
                            aiProvider: 'openai',
                            apiKey: 'sk-test-key'
                        });
                    })
                }
            }
        };

        // Mock slow provider response
        aiService.providers.openai.generateSummary = jest.fn(() => 
            new Promise(resolve => setTimeout(resolve, 200))
        );
        aiService.providers.openai.isConfigured = jest.fn().mockResolvedValue(true);

        const content = 'This is test content for timeout testing.';
        const result = await aiService.generateSummary(content);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Content too short');
    });
});