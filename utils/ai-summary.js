// AI Summary Service for LaterLens Chrome extension
// LaterLens 크롬 확장 프로그램용 AI 요약 서비스

/**
 * AI Summary Service with multiple provider support
 * 다중 제공업체 지원 AI 요약 서비스
 */
class AISummaryService {
    constructor() {
        this.providers = {
            openai: new OpenAIProvider(),
            anthropic: new AnthropicProvider(),
            gemini: new GeminiProvider(),
            ollama: new OllamaProvider()
        };
        
        this.defaultProvider = 'openai';
        this.maxRetries = 2;
        this.timeout = 30000; // 30 seconds
        
        // Summary configuration
        this.summaryConfig = {
            maxLength: 200,
            language: 'auto', // 'ko', 'en', 'auto'
            style: 'concise', // 'concise', 'detailed', 'bullet'
            includeKeyPoints: true
        };
    }

    /**
     * Check if AI summary service is configured
     * AI 요약 서비스가 구성되었는지 확인
     */
    async isConfigured(provider = null) {
        try {
            const settings = await this.getSettings();
            
            if (!settings.enableAISummary) {
                return false;
            }
            
            const targetProvider = provider || settings.aiProvider || this.defaultProvider;
            const providerInstance = this.providers[targetProvider];
            
            if (!providerInstance) {
                return false;
            }
            
            return await providerInstance.isConfigured(settings);
        } catch (error) {
            console.error('Error checking AI configuration:', error);
            return false;
        }
    }

    /**
     * Generate summary for given content
     * 주어진 콘텐츠에 대한 요약 생성
     */
    async generateSummary(content, options = {}) {
        try {
            const settings = await this.getSettings();
            
            if (!settings.enableAISummary) {
                return {
                    success: false,
                    error: 'AI summary is disabled',
                    fallback: '요약 없음'
                };
            }
            
            const config = { ...this.summaryConfig, ...options };
            const provider = settings.aiProvider || this.defaultProvider;
            
            // Validate content
            if (!content || typeof content !== 'string' || content.trim().length < 50) {
                return {
                    success: false,
                    error: 'Content too short for summarization',
                    fallback: '요약할 콘텐츠가 부족합니다'
                };
            }
            
            // Preprocess content
            const processedContent = this.preprocessContent(content, config);
            
            // Generate summary with retry logic
            let lastError = null;
            for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
                try {
                    const result = await this.attemptSummary(
                        processedContent, 
                        provider, 
                        settings, 
                        config
                    );
                    
                    if (result.success) {
                        return {
                            success: true,
                            summary: result.summary,
                            provider: provider,
                            metadata: {
                                originalLength: content.length,
                                processedLength: processedContent.length,
                                summaryLength: result.summary.length,
                                language: result.language || config.language,
                                generatedAt: Date.now(),
                                attempt: attempt + 1
                            }
                        };
                    }
                    
                    lastError = result.error;
                } catch (error) {
                    lastError = error.message;
                    console.warn(`Summary attempt ${attempt + 1} failed:`, error);
                }
                
                // Wait before retry
                if (attempt < this.maxRetries) {
                    await this.delay(1000 * (attempt + 1));
                }
            }
            
            return {
                success: false,
                error: lastError || 'Summary generation failed after retries',
                fallback: this.generateFallbackSummary(content)
            };
            
        } catch (error) {
            console.error('Error generating AI summary:', error);
            return {
                success: false,
                error: error.message,
                fallback: '요약 생성 중 오류가 발생했습니다'
            };
        }
    }

    /**
     * Attempt to generate summary with specific provider
     * 특정 제공업체로 요약 생성 시도
     */
    async attemptSummary(content, providerName, settings, config) {
        const provider = this.providers[providerName];
        
        if (!provider) {
            throw new Error(`Unknown provider: ${providerName}`);
        }
        
        if (!await provider.isConfigured(settings)) {
            throw new Error(`Provider ${providerName} is not configured`);
        }
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Summary generation timeout')), this.timeout);
        });
        
        // Race between summary generation and timeout
        const summaryPromise = provider.generateSummary(content, config, settings);
        
        return await Promise.race([summaryPromise, timeoutPromise]);
    }

    /**
     * Preprocess content for summarization
     * 요약을 위한 콘텐츠 전처리
     */
    preprocessContent(content, config) {
        let processed = content;
        
        // Remove excessive whitespace
        processed = processed.replace(/\s+/g, ' ').trim();
        
        // Remove URLs if not needed
        processed = processed.replace(/https?:\/\/[^\s]+/g, '');
        
        // Limit content length for API efficiency
        const maxContentLength = 4000; // Most APIs have token limits
        if (processed.length > maxContentLength) {
            // Try to cut at sentence boundary
            const sentences = processed.split(/[.!?]+/);
            let truncated = '';
            
            for (const sentence of sentences) {
                if (truncated.length + sentence.length > maxContentLength - 10) {
                    break;
                }
                truncated += sentence + '. ';
            }
            
            processed = truncated.trim() || processed.substring(0, maxContentLength - 3) + '...';
        }
        
        return processed;
    }

    /**
     * Generate fallback summary when AI fails
     * AI 실패 시 대체 요약 생성
     */
    generateFallbackSummary(content) {
        try {
            // Extract first few sentences as fallback
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
            
            if (sentences.length === 0) {
                return '요약을 생성할 수 없습니다';
            }
            
            // Take first 2-3 sentences, up to 150 characters
            let summary = '';
            for (let i = 0; i < Math.min(3, sentences.length); i++) {
                const sentence = sentences[i].trim();
                if (summary.length + sentence.length > 150) {
                    break;
                }
                summary += sentence + '. ';
            }
            
            return summary.trim() || '콘텐츠 요약';
        } catch (error) {
            return '요약 생성 실패';
        }
    }

    /**
     * Test API connection for a provider
     * 제공업체의 API 연결 테스트
     */
    async testConnection(providerName, apiKey, options = {}) {
        try {
            const provider = this.providers[providerName];
            
            if (!provider) {
                return {
                    success: false,
                    error: `Unknown provider: ${providerName}`
                };
            }
            
            const testSettings = {
                enableAISummary: true,
                aiProvider: providerName,
                apiKey: apiKey,
                ...options
            };
            
            return await provider.testConnection(testSettings);
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get available providers
     * 사용 가능한 제공업체 목록 가져오기
     */
    getAvailableProviders() {
        return Object.keys(this.providers).map(key => ({
            id: key,
            name: this.providers[key].getName(),
            description: this.providers[key].getDescription(),
            requiresApiKey: this.providers[key].requiresApiKey(),
            supportedLanguages: this.providers[key].getSupportedLanguages()
        }));
    }

    // Helper methods
    async getSettings() {
        // This will be implemented to get settings from storage
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.get(['enableAISummary', 'aiProvider', 'apiKey', 'aiSettings'], (result) => {
                    resolve({
                        enableAISummary: result.enableAISummary || false,
                        aiProvider: result.aiProvider || this.defaultProvider,
                        apiKey: result.apiKey || '',
                        ...result.aiSettings
                    });
                });
            });
        }
        
        // Fallback for testing
        return {
            enableAISummary: false,
            aiProvider: this.defaultProvider,
            apiKey: ''
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Base class for AI providers
 * AI 제공업체 기본 클래스
 */
class AIProvider {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }

    getName() {
        return this.name;
    }

    getDescription() {
        return this.description;
    }

    requiresApiKey() {
        return true;
    }

    getSupportedLanguages() {
        return ['ko', 'en', 'auto'];
    }

    async isConfigured(settings) {
        return !!(settings.apiKey && settings.apiKey.trim());
    }

    async testConnection(settings) {
        throw new Error('testConnection must be implemented by provider');
    }

    async generateSummary(content, config, settings) {
        throw new Error('generateSummary must be implemented by provider');
    }

    buildPrompt(content, config) {
        const languageInstruction = config.language === 'ko' ? 
            '한국어로 요약해주세요.' : 
            config.language === 'en' ? 
            'Please summarize in English.' : 
            '내용의 주요 언어로 요약해주세요.';

        const styleInstruction = {
            'concise': '간결하고 핵심적인 요약을 작성해주세요.',
            'detailed': '상세하고 포괄적인 요약을 작성해주세요.',
            'bullet': '주요 포인트를 불릿 포인트로 정리해주세요.'
        }[config.style] || '간결하고 핵심적인 요약을 작성해주세요.';

        return `다음 텍스트를 ${config.maxLength}자 이내로 요약해주세요.

${languageInstruction}
${styleInstruction}

텍스트:
${content}

요약:`;
    }
}

/**
 * OpenAI Provider (GPT-3.5/GPT-4)
 * OpenAI 제공업체 (GPT-3.5/GPT-4)
 */
class OpenAIProvider extends AIProvider {
    constructor() {
        super('OpenAI', 'OpenAI GPT models for text summarization');
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-3.5-turbo';
    }

    async isConfigured(settings) {
        return !!(settings.apiKey && settings.apiKey.startsWith('sk-'));
    }

    async testConnection(settings) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${settings.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'user',
                            content: 'Test connection. Please respond with "OK".'
                        }
                    ],
                    max_tokens: 10
                })
            });

            if (response.ok) {
                return { success: true, message: 'Connection successful' };
            } else {
                const error = await response.json();
                return { 
                    success: false, 
                    error: error.error?.message || 'API connection failed' 
                };
            }
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async generateSummary(content, config, settings) {
        try {
            const prompt = this.buildPrompt(content, config);
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${settings.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: settings.openaiModel || this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that creates concise, accurate summaries of web content.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: Math.ceil(config.maxLength * 1.5),
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'OpenAI API request failed');
            }

            const data = await response.json();
            const summary = data.choices[0]?.message?.content?.trim();

            if (!summary) {
                throw new Error('No summary generated');
            }

            return {
                success: true,
                summary: summary,
                language: config.language,
                tokensUsed: data.usage?.total_tokens
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

/**
 * Anthropic Provider (Claude)
 * Anthropic 제공업체 (Claude)
 */
class AnthropicProvider extends AIProvider {
    constructor() {
        super('Anthropic', 'Anthropic Claude models for text summarization');
        this.apiUrl = 'https://api.anthropic.com/v1/messages';
        this.model = 'claude-3-haiku-20240307';
    }

    async isConfigured(settings) {
        return !!(settings.anthropicApiKey && settings.anthropicApiKey.startsWith('sk-ant-'));
    }

    async testConnection(settings) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'x-api-key': settings.anthropicApiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 10,
                    messages: [
                        {
                            role: 'user',
                            content: 'Test connection. Please respond with "OK".'
                        }
                    ]
                })
            });

            if (response.ok) {
                return { success: true, message: 'Connection successful' };
            } else {
                const error = await response.json();
                return { 
                    success: false, 
                    error: error.error?.message || 'API connection failed' 
                };
            }
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async generateSummary(content, config, settings) {
        try {
            const prompt = this.buildPrompt(content, config);
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'x-api-key': settings.anthropicApiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: settings.anthropicModel || this.model,
                    max_tokens: Math.ceil(config.maxLength * 1.5),
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Anthropic API request failed');
            }

            const data = await response.json();
            const summary = data.content[0]?.text?.trim();

            if (!summary) {
                throw new Error('No summary generated');
            }

            return {
                success: true,
                summary: summary,
                language: config.language,
                tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

/**
 * Google Gemini Provider
 * Google Gemini 제공업체
 */
class GeminiProvider extends AIProvider {
    constructor() {
        super('Google Gemini', 'Google Gemini models for text summarization');
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    }

    async isConfigured(settings) {
        return !!(settings.geminiApiKey && settings.geminiApiKey.trim());
    }

    async testConnection(settings) {
        try {
            const response = await fetch(`${this.apiUrl}?key=${settings.geminiApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: 'Test connection. Please respond with "OK".'
                                }
                            ]
                        }
                    ]
                })
            });

            if (response.ok) {
                return { success: true, message: 'Connection successful' };
            } else {
                const error = await response.json();
                return { 
                    success: false, 
                    error: error.error?.message || 'API connection failed' 
                };
            }
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async generateSummary(content, config, settings) {
        try {
            const prompt = this.buildPrompt(content, config);
            
            const response = await fetch(`${this.apiUrl}?key=${settings.geminiApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: Math.ceil(config.maxLength * 1.5),
                        temperature: 0.3
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Gemini API request failed');
            }

            const data = await response.json();
            const summary = data.candidates[0]?.content?.parts[0]?.text?.trim();

            if (!summary) {
                throw new Error('No summary generated');
            }

            return {
                success: true,
                summary: summary,
                language: config.language
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

/**
 * Ollama Provider (Local AI)
 * Ollama 제공업체 (로컬 AI)
 */
class OllamaProvider extends AIProvider {
    constructor() {
        super('Ollama', 'Local Ollama models for text summarization');
        this.apiUrl = 'http://localhost:11434/api/generate';
        this.model = 'llama2';
    }

    requiresApiKey() {
        return false;
    }

    async isConfigured(settings) {
        // Check if Ollama is running locally
        try {
            const response = await fetch('http://localhost:11434/api/tags', {
                method: 'GET'
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async testConnection(settings) {
        try {
            const response = await fetch('http://localhost:11434/api/tags', {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                return { 
                    success: true, 
                    message: 'Connection successful',
                    models: data.models?.map(m => m.name) || []
                };
            } else {
                return { 
                    success: false, 
                    error: 'Ollama server not accessible' 
                };
            }
        } catch (error) {
            return { 
                success: false, 
                error: 'Ollama server not running' 
            };
        }
    }

    async generateSummary(content, config, settings) {
        try {
            const prompt = this.buildPrompt(content, config);
            const model = settings.ollamaModel || this.model;
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.3,
                        num_predict: Math.ceil(config.maxLength * 1.5)
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Ollama API request failed');
            }

            const data = await response.json();
            const summary = data.response?.trim();

            if (!summary) {
                throw new Error('No summary generated');
            }

            return {
                success: true,
                summary: summary,
                language: config.language,
                model: model
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AISummaryService, AIProvider, OpenAIProvider, AnthropicProvider, GeminiProvider, OllamaProvider };
} else if (typeof window !== 'undefined') {
    window.AISummaryService = AISummaryService;
    window.AIProvider = AIProvider;
    window.OpenAIProvider = OpenAIProvider;
    window.AnthropicProvider = AnthropicProvider;
    window.GeminiProvider = GeminiProvider;
    window.OllamaProvider = OllamaProvider;
}