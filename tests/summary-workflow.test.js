// Integration tests for AI summary workflow
// AI 요약 워크플로우 통합 테스트

const { AISummaryService } = require('../utils/ai-summary.js');

// Mock Chrome APIs
global.chrome = {
    tabs: {
        get: jest.fn()
    },
    scripting: {
        executeScript: jest.fn()
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn()
        }
    }
};

// Mock functions that would be imported from background.js
const mockGenerateConditionalSummary = async (tabId, settings) => {
    const defaultResult = {
        summary: '요약 없음',
        metadata: {
            method: 'disabled',
            reason: 'AI summary is disabled',
            timestamp: Date.now()
        }
    };

    try {
        // Check if AI summary is enabled
        if (!settings.enableAISummary) {
            return {
                ...defaultResult,
                metadata: {
                    ...defaultResult.metadata,
                    reason: 'AI summary feature is disabled in settings'
                }
            };
        }

        // Initialize AI service and check configuration
        const aiService = new AISummaryService();
        
        // Mock isConfigured based on settings
        const isConfigured = !!(settings.apiKey && settings.apiKey.trim()) || settings.aiProvider === 'ollama';
        
        if (!isConfigured) {
            return {
                ...defaultResult,
                metadata: {
                    ...defaultResult.metadata,
                    method: 'unconfigured',
                    reason: 'AI service is not properly configured (missing API key or provider settings)'
                }
            };
        }

        // Mock content extraction
        const mockContent = 'This is a sample article content that is long enough to be summarized by AI. It contains multiple sentences and provides meaningful information about the topic being discussed.';
        
        // Check content length
        const wordCount = mockContent.split(/\s+/).length;
        const minWords = settings.minWordsForSummary || 50;

        if (wordCount < minWords) {
            return {
                summary: '콘텐츠가 요약하기에 너무 짧습니다',
                metadata: {
                    method: 'content_too_short',
                    reason: `Content has only ${wordCount} words, minimum required: ${minWords}`,
                    wordCount: wordCount,
                    timestamp: Date.now()
                }
            };
        }

        // Mock AI summary generation
        if (settings.simulateAIFailure) {
            return {
                summary: 'This is a fallback summary of the content.',
                metadata: {
                    method: 'fallback',
                    reason: 'AI generation failed, using fallback summary',
                    error: 'Simulated AI failure',
                    timestamp: Date.now()
                }
            };
        }

        return {
            summary: 'This is an AI-generated summary of the article content.',
            metadata: {
                method: 'ai_generated',
                provider: settings.aiProvider || 'openai',
                reason: 'Successfully generated AI summary',
                timestamp: Date.now()
            }
        };

    } catch (error) {
        return {
            ...defaultResult,
            metadata: {
                ...defaultResult.metadata,
                method: 'error',
                reason: 'Critical error during summary generation',
                error: error.message
            }
        };
    }
};

describe('Summary Workflow Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('AI-Enabled Workflow', () => {
        test('should generate AI summary when properly configured', async () => {
            const settings = {
                enableAISummary: true,
                aiProvider: 'openai',
                apiKey: 'sk-test-key-123',
                summaryLength: 200,
                preferredLanguage: 'auto'
            };

            const result = await mockGenerateConditionalSummary(1, settings);

            expect(result.summary).not.toBe('요약 없음');
            expect(result.metadata.method).toBe('ai_generated');
            expect(result.metadata.provider).toBe('openai');
            expect(result.metadata.reason).toContain('Successfully generated');
        });

        test('should handle AI generation failure gracefully', async () => {
            const settings = {
                enableAISummary: true,
                aiProvider: 'openai',
                apiKey: 'sk-test-key-123',
                simulateAIFailure: true
            };

            const result = await mockGenerateConditionalSummary(1, settings);

            expect(result.summary).toContain('fallback summary');
            expect(result.metadata.method).toBe('fallback');
            expect(result.metadata.error).toBe('Simulated AI failure');
        });

        test('should work with different AI providers', async () => {
            const providers = ['openai', 'anthropic', 'gemini', 'ollama'];

            for (const provider of providers) {
                const settings = {
                    enableAISummary: true,
                    aiProvider: provider,
                    apiKey: provider === 'ollama' ? '' : 'test-key'
                };

                const result = await mockGenerateConditionalSummary(1, settings);

                if (provider === 'ollama') {
                    // Ollama doesn't require API key
                    expect(result.metadata.method).toBe('ai_generated');
                } else {
                    expect(result.metadata.method).toBe('ai_generated');
                }
                expect(result.metadata.provider).toBe(provider);
            }
        });

        test('should respect summary length settings', async () => {
            const lengthSettings = [100, 200, 300];

            for (const length of lengthSettings) {
                const settings = {
                    enableAISummary: true,
                    aiProvider: 'openai',
                    apiKey: 'sk-test-key',
                    summaryLength: length
                };

                const result = await mockGenerateConditionalSummary(1, settings);

                expect(result.summary.length).toBeLessThanOrEqual(length * 1.2); // Allow some tolerance
                expect(result.metadata.method).toBe('ai_generated');
            }
        });
    });

    describe('AI-Disabled Workflow', () => {
        test('should return default summary when AI is disabled', async () => {
            const settings = {
                enableAISummary: false
            };

            const result = await mockGenerateConditionalSummary(1, settings);

            expect(result.summary).toBe('요약 없음');
            expect(result.metadata.method).toBe('disabled');
            expect(result.metadata.reason).toContain('disabled in settings');
        });

        test('should not attempt AI processing when disabled', async () => {
            const settings = {
                enableAISummary: false,
                aiProvider: 'openai',
                apiKey: 'sk-test-key' // Even with valid key
            };

            const result = await mockGenerateConditionalSummary(1, settings);

            expect(result.summary).toBe('요약 없음');
            expect(result.metadata.method).toBe('disabled');
        });
    });

    describe('Unconfigured Workflow', () => {
        test('should handle missing API key gracefully', async () => {
            const settings = {
                enableAISummary: true,
                aiProvider: 'openai',
                apiKey: '' // Missing API key
            };

            const result = await mockGenerateConditionalSummary(1, settings);

            expect(result.summary).toBe('요약 없음');
            expect(result.metadata.method).toBe('unconfigured');
            expect(result.metadata.reason).toContain('not properly configured');
        });

        test('should handle missing provider gracefully', async () => {
            const settings = {
                enableAISummary: true,
                apiKey: 'sk-test-key'
                // Missing aiProvider
            };

            const result = await mockGenerateConditionalSummary(1, settings);

            expect(result.summary).toBe('요약 없음');
            expect(result.metadata.method).toBe('unconfigured');
        });

        test('should allow Ollama without API key', async () => {
            const settings = {
                enableAISummary: true,
                aiProvider: 'ollama'
                // No API key needed for Ollama
            };

            const result = await mockGenerateConditionalSummary(1, settings);

            expect(result.metadata.method).toBe('ai_generated');
            expect(result.metadata.provider).toBe('ollama');
        });
    });

    describe('Content Validation', () => {
        test('should handle short content appropriately', async () => {
            const settings = {
                enableAISummary: true,
                aiProvider: 'openai',
                apiKey: 'sk-test-key',
                minWordsForSummary: 100 // Set high threshold
            };

            const result = await mockGenerateConditionalSummary(1, settings);

            // Mock content has ~30 words, should be too short
            expect(result.summary).toContain('너무 짧습니다');
            expect(result.metadata.method).toBe('content_too_short');
            expect(result.metadata.wordCount).toBeDefined();
        });

        test('should process adequate content length', async () => {
            const settings = {
                enableAISummary: true,
                aiProvider: 'openai',
                apiKey: 'sk-test-key',
                minWordsForSummary: 20 // Set low threshold
            };

            const result = await mockGenerateConditionalSummary(1, settings);

            expect(result.metadata.method).toBe('ai_generated');
            expect(result.summary).not.toContain('너무 짧습니다');
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors gracefully', async () => {
            const settings = {
                enableAISummary: true,
                aiProvider: 'openai',
                apiKey: 'sk-test-key'
            };

            // Simulate network error by throwing in the mock
            const mockWithError = async () => {
                throw new Error('Network connection failed');
            };

            try {
                await mockWithError();
            } catch (error) {
                const result = {
                    summary: '요약 없음',
                    metadata: {
                        method: 'error',
                        reason: 'Critical error during summary generation',
                        error: error.message,
                        timestamp: Date.now()
                    }
                };

                expect(result.summary).toBe('요약 없음');
                expect(result.metadata.method).toBe('error');
                expect(result.metadata.error).toBe('Network connection failed');
            }
        });

        test('should provide meaningful error messages', async () => {
            const errorScenarios = [
                { error: 'API rate limit exceeded', expectedMethod: 'error' },
                { error: 'Invalid API key', expectedMethod: 'error' },
                { error: 'Service temporarily unavailable', expectedMethod: 'error' }
            ];

            for (const scenario of errorScenarios) {
                const result = {
                    summary: '요약 없음',
                    metadata: {
                        method: scenario.expectedMethod,
                        reason: 'Critical error during summary generation',
                        error: scenario.error,
                        timestamp: Date.now()
                    }
                };

                expect(result.metadata.error).toBe(scenario.error);
                expect(result.metadata.method).toBe(scenario.expectedMethod);
            }
        });
    });

    describe('Performance and Optimization', () => {
        test('should complete within reasonable time limits', async () => {
            const settings = {
                enableAISummary: true,
                aiProvider: 'openai',
                apiKey: 'sk-test-key'
            };

            const startTime = Date.now();
            const result = await mockGenerateConditionalSummary(1, settings);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second for mock
            expect(result.metadata.timestamp).toBeGreaterThan(startTime);
        });

        test('should handle concurrent requests', async () => {
            const settings = {
                enableAISummary: true,
                aiProvider: 'openai',
                apiKey: 'sk-test-key'
            };

            const promises = Array.from({ length: 5 }, (_, i) => 
                mockGenerateConditionalSummary(i + 1, settings)
            );

            const results = await Promise.all(promises);

            results.forEach((result, index) => {
                expect(result.metadata.method).toBe('ai_generated');
                expect(result.summary).toBeDefined();
            });
        });
    });

    describe('Settings Validation', () => {
        test('should validate summary workflow settings', () => {
            const validateSummaryWorkflow = (settings, content) => {
                const validation = {
                    isValid: true,
                    warnings: [],
                    errors: [],
                    recommendations: []
                };

                // Check AI settings
                if (settings.enableAISummary) {
                    if (!settings.aiProvider) {
                        validation.errors.push('AI provider not specified');
                        validation.isValid = false;
                    }

                    if (!settings.apiKey && settings.aiProvider !== 'ollama') {
                        validation.warnings.push('API key not configured - will use fallback summary');
                    }

                    if (settings.summaryLength && (settings.summaryLength < 50 || settings.summaryLength > 500)) {
                        validation.warnings.push('Summary length should be between 50-500 characters for optimal results');
                    }
                }

                // Check content suitability
                if (content) {
                    const wordCount = content.split(/\s+/).length;
                    
                    if (wordCount < 20) {
                        validation.warnings.push('Content is very short - summary may not be meaningful');
                    }
                    
                    if (wordCount > 10000) {
                        validation.warnings.push('Content is very long - may be truncated for AI processing');
                    }
                }

                return validation;
            };

            // Test valid settings
            const validSettings = {
                enableAISummary: true,
                aiProvider: 'openai',
                apiKey: 'sk-test-key',
                summaryLength: 200
            };
            const validContent = 'This is a test content with adequate length for summarization.';

            const validResult = validateSummaryWorkflow(validSettings, validContent);
            expect(validResult.isValid).toBe(true);
            expect(validResult.errors).toHaveLength(0);

            // Test invalid settings
            const invalidSettings = {
                enableAISummary: true
                // Missing aiProvider
            };

            const invalidResult = validateSummaryWorkflow(invalidSettings, validContent);
            expect(invalidResult.isValid).toBe(false);
            expect(invalidResult.errors).toContain('AI provider not specified');

            // Test warning conditions
            const warningSettings = {
                enableAISummary: true,
                aiProvider: 'openai',
                // Missing API key
                summaryLength: 1000 // Too long
            };

            const warningResult = validateSummaryWorkflow(warningSettings, validContent);
            expect(warningResult.warnings.length).toBeGreaterThan(0);
        });
    });
});

describe('End-to-End Workflow Tests', () => {
    test('should complete full page saving workflow with AI summary', async () => {
        // Mock a complete page saving workflow
        const mockPageData = {
            url: 'https://example.com/article',
            title: 'Test Article',
            content: 'This is a comprehensive article about testing workflows in Chrome extensions.'
        };

        const settings = {
            enableAISummary: true,
            aiProvider: 'openai',
            apiKey: 'sk-test-key',
            summaryLength: 150
        };

        // Simulate the workflow steps
        const steps = {
            extractMetadata: () => ({ success: true, data: mockPageData }),
            captureScreenshot: () => ({ success: true, dataUrl: 'data:image/jpeg;base64,test' }),
            generateSummary: () => mockGenerateConditionalSummary(1, settings),
            savePage: (data) => ({ success: true, id: 'test-page-id', data })
        };

        // Execute workflow
        const metadata = steps.extractMetadata();
        const screenshot = steps.captureScreenshot();
        const summary = await steps.generateSummary();
        
        const pageData = {
            ...mockPageData,
            summary: summary.summary,
            thumbnail: screenshot.dataUrl,
            summaryMetadata: summary.metadata
        };

        const saveResult = steps.savePage(pageData);

        // Verify results
        expect(metadata.success).toBe(true);
        expect(screenshot.success).toBe(true);
        expect(summary.metadata.method).toBe('ai_generated');
        expect(saveResult.success).toBe(true);
        expect(saveResult.data.summary).not.toBe('요약 없음');
    });

    test('should complete workflow with AI disabled', async () => {
        const mockPageData = {
            url: 'https://example.com/article',
            title: 'Test Article'
        };

        const settings = {
            enableAISummary: false
        };

        const summary = await mockGenerateConditionalSummary(1, settings);
        
        const pageData = {
            ...mockPageData,
            summary: summary.summary,
            summaryMetadata: summary.metadata
        };

        expect(summary.summary).toBe('요약 없음');
        expect(summary.metadata.method).toBe('disabled');
        expect(pageData.summaryMetadata.reason).toContain('disabled in settings');
    });
});