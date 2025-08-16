// Content extraction utility for AI summarization in LaterLens Chrome extension
// AI 요약을 위한 콘텐츠 추출 유틸리티 - LaterLens 크롬 확장 프로그램

/**
 * Content extraction service for preparing text for AI summarization
 * AI 요약을 위한 텍스트 준비를 위한 콘텐츠 추출 서비스
 */
class ContentExtractor {
    constructor() {
        this.config = {
            maxContentLength: 8000,
            minContentLength: 100,
            maxSentences: 50,
            minSentenceLength: 10,
            maxParagraphs: 20,
            preserveStructure: true,
            includeHeadings: true,
            includeLists: true,
            includeQuotes: true,
            filterAds: true,
            filterNavigation: true,
            filterComments: true,
            languageDetection: true
        };
        
        // Content scoring weights
        this.scoringWeights = {
            textLength: 0.3,
            paragraphCount: 0.2,
            headingCount: 0.15,
            listCount: 0.1,
            linkDensity: -0.2, // Negative weight for high link density
            adIndicators: -0.3, // Negative weight for ad-like content
            semanticTags: 0.2
        };
        
        // Language patterns for content detection
        this.languagePatterns = {
            english: /^[a-zA-Z\s.,!?;:'"()-]+$/,
            korean: /[가-힣]/,
            chinese: /[\u4e00-\u9fff]/,
            japanese: /[\u3040-\u309f\u30a0-\u30ff]/
        };
        
        // Common ad/spam indicators
        this.adIndicators = [
            'advertisement', 'sponsored', 'promo', 'banner', 'popup',
            'subscribe', 'newsletter', 'cookie', 'privacy policy',
            'terms of service', 'buy now', 'click here', 'learn more'
        ];
        
        // Navigation indicators
        this.navigationIndicators = [
            'menu', 'navigation', 'nav', 'breadcrumb', 'sidebar',
            'header', 'footer', 'home', 'about', 'contact', 'search'
        ];
    }

    /**
     * Extract and prepare content for AI summarization
     * AI 요약을 위한 콘텐츠 추출 및 준비
     */
    async extractForSummarization(options = {}) {
        const config = { ...this.config, ...options };
        
        try {
            // Find the best content container
            const contentContainer = await this.findMainContent();
            
            if (!contentContainer) {
                throw new Error('No suitable content found for summarization');
            }
            
            // Extract structured content
            const structuredContent = await this.extractStructuredContent(contentContainer, config);
            
            // Process and clean content
            const processedContent = await this.processContent(structuredContent, config);
            
            // Validate content quality
            const validation = this.validateContent(processedContent, config);
            
            if (!validation.isValid) {
                throw new Error(`Content validation failed: ${validation.issues.join(', ')}`);
            }
            
            return {
                success: true,
                content: processedContent.text,
                metadata: {
                    originalLength: structuredContent.originalLength,
                    processedLength: processedContent.text.length,
                    language: processedContent.language,
                    structure: processedContent.structure,
                    quality: validation.quality,
                    extractedAt: Date.now(),
                    source: contentContainer.source,
                    confidence: contentContainer.confidence
                }
            };
        } catch (error) {
            console.error('Content extraction failed:', error);
            
            // Try fallback extraction
            const fallbackContent = await this.fallbackExtraction(config);
            
            return {
                success: false,
                error: error.message,
                fallback: fallbackContent
            };
        }
    }

    /**
     * Find the main content container using multiple strategies
     * 다양한 전략을 사용하여 주요 콘텐츠 컨테이너 찾기
     */
    async findMainContent() {
        const strategies = [
            () => this.findBySemanticTags(),
            () => this.findByContentScoring(),
            () => this.findByTextDensity(),
            () => this.findByStructuralAnalysis()
        ];
        
        let bestContainer = null;
        let bestScore = 0;
        
        for (const strategy of strategies) {
            try {
                const container = await strategy();
                if (container && container.score > bestScore) {
                    bestContainer = container;
                    bestScore = container.score;
                }
            } catch (error) {
                console.warn('Content finding strategy failed:', error);
                continue;
            }
        }
        
        return bestContainer;
    }

    /**
     * Find content using semantic HTML tags
     * 시맨틱 HTML 태그를 사용하여 콘텐츠 찾기
     */
    findBySemanticTags() {
        const semanticSelectors = [
            { selector: 'main', priority: 10 },
            { selector: 'article', priority: 9 },
            { selector: '[role="main"]', priority: 8 },
            { selector: '.main-content, .content, #content', priority: 7 },
            { selector: '.post-content, .entry-content, .article-content', priority: 6 }
        ];
        
        for (const { selector, priority } of semanticSelectors) {
            const elements = document.querySelectorAll(selector);
            
            for (const element of elements) {
                const score = this.scoreElement(element) + priority;
                
                if (score > 15) { // Minimum threshold for semantic tags
                    return {
                        element: element,
                        score: score,
                        source: 'semantic',
                        confidence: 0.9
                    };
                }
            }
        }
        
        return null;
    }

    /**
     * Find content by scoring all potential containers
     * 모든 잠재적 컨테이너를 점수화하여 콘텐츠 찾기
     */
    findByContentScoring() {
        const candidates = document.querySelectorAll('div, section, article, main');
        let bestElement = null;
        let bestScore = 0;
        
        for (const element of candidates) {
            const score = this.scoreElement(element);
            
            if (score > bestScore && score > 10) {
                bestElement = element;
                bestScore = score;
            }
        }
        
        if (bestElement) {
            return {
                element: bestElement,
                score: bestScore,
                source: 'scoring',
                confidence: Math.min(bestScore / 50, 1)
            };
        }
        
        return null;
    }

    /**
     * Find content by text density analysis
     * 텍스트 밀도 분석으로 콘텐츠 찾기
     */
    findByTextDensity() {
        const elements = document.querySelectorAll('div, section, article');
        let bestElement = null;
        let bestDensity = 0;
        
        for (const element of elements) {
            const textLength = element.textContent.trim().length;
            const htmlLength = element.innerHTML.length;
            
            if (textLength < 200) continue; // Skip short content
            
            const density = textLength / Math.max(htmlLength, 1);
            const adjustedDensity = density * Math.min(textLength / 1000, 1);
            
            if (adjustedDensity > bestDensity) {
                bestElement = element;
                bestDensity = adjustedDensity;
            }
        }
        
        if (bestElement && bestDensity > 0.3) {
            return {
                element: bestElement,
                score: bestDensity * 100,
                source: 'density',
                confidence: Math.min(bestDensity * 2, 1)
            };
        }
        
        return null;
    }

    /**
     * Find content by structural analysis
     * 구조적 분석으로 콘텐츠 찾기
     */
    findByStructuralAnalysis() {
        // Look for elements with good paragraph structure
        const elements = document.querySelectorAll('div, section, article');
        let bestElement = null;
        let bestStructureScore = 0;
        
        for (const element of elements) {
            const paragraphs = element.querySelectorAll('p');
            const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const lists = element.querySelectorAll('ul, ol');
            
            if (paragraphs.length < 2) continue;
            
            const avgParagraphLength = Array.from(paragraphs)
                .reduce((sum, p) => sum + p.textContent.trim().length, 0) / paragraphs.length;
            
            if (avgParagraphLength < 50) continue;
            
            const structureScore = 
                paragraphs.length * 2 +
                headings.length * 3 +
                lists.length * 1.5 +
                (avgParagraphLength / 100);
            
            if (structureScore > bestStructureScore) {
                bestElement = element;
                bestStructureScore = structureScore;
            }
        }
        
        if (bestElement && bestStructureScore > 10) {
            return {
                element: bestElement,
                score: bestStructureScore,
                source: 'structure',
                confidence: Math.min(bestStructureScore / 30, 1)
            };
        }
        
        return null;
    }

    /**
     * Score an element based on content quality indicators
     * 콘텐츠 품질 지표를 기반으로 요소 점수 매기기
     */
    scoreElement(element) {
        let score = 0;
        
        // Text length score
        const textLength = element.textContent.trim().length;
        score += Math.min(textLength / 100, 30) * this.scoringWeights.textLength;
        
        // Paragraph count score
        const paragraphs = element.querySelectorAll('p');
        score += Math.min(paragraphs.length * 2, 20) * this.scoringWeights.paragraphCount;
        
        // Heading count score
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        score += Math.min(headings.length * 3, 15) * this.scoringWeights.headingCount;
        
        // List count score
        const lists = element.querySelectorAll('ul, ol, li');
        score += Math.min(lists.length, 10) * this.scoringWeights.listCount;
        
        // Link density penalty
        const links = element.querySelectorAll('a');
        const linkDensity = links.length / Math.max(paragraphs.length, 1);
        if (linkDensity > 2) {
            score += linkDensity * 5 * this.scoringWeights.linkDensity;
        }
        
        // Ad indicators penalty
        const text = element.textContent.toLowerCase();
        const className = element.className.toLowerCase();
        const adCount = this.adIndicators.filter(indicator => 
            text.includes(indicator) || className.includes(indicator)
        ).length;
        score += adCount * 5 * this.scoringWeights.adIndicators;
        
        // Semantic tags bonus
        const tagName = element.tagName.toLowerCase();
        if (['article', 'main', 'section'].includes(tagName)) {
            score += 10 * this.scoringWeights.semanticTags;
        }
        
        return Math.max(score, 0);
    }

    /**
     * Extract structured content from the main container
     * 주요 컨테이너에서 구조화된 콘텐츠 추출
     */
    async extractStructuredContent(container, config) {
        const content = {
            headings: [],
            paragraphs: [],
            lists: [],
            quotes: [],
            images: [],
            originalLength: 0,
            structure: {}
        };
        
        // Remove unwanted elements
        const cleanContainer = this.cleanElement(container.element.cloneNode(true));
        content.originalLength = cleanContainer.textContent.length;
        
        // Extract headings
        if (config.includeHeadings) {
            content.headings = this.extractHeadings(cleanContainer);
        }
        
        // Extract paragraphs
        content.paragraphs = this.extractParagraphs(cleanContainer);
        
        // Extract lists
        if (config.includeLists) {
            content.lists = this.extractLists(cleanContainer);
        }
        
        // Extract quotes
        if (config.includeQuotes) {
            content.quotes = this.extractQuotes(cleanContainer);
        }
        
        // Extract images with alt text
        content.images = this.extractImageDescriptions(cleanContainer);
        
        // Analyze structure
        content.structure = this.analyzeStructure(content);
        
        return content;
    }

    /**
     * Clean element by removing unwanted content
     * 원하지 않는 콘텐츠를 제거하여 요소 정리
     */
    cleanElement(element) {
        // Remove script, style, and other non-content elements
        const unwantedSelectors = [
            'script', 'style', 'noscript', 'iframe',
            '.ad', '.ads', '.advertisement', '.banner',
            '.social', '.share', '.comments', '.related',
            '.sidebar', '.menu', '.navigation', '.nav',
            '.popup', '.modal', '.overlay'
        ];
        
        unwantedSelectors.forEach(selector => {
            element.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        // Remove elements with suspicious class names
        const suspiciousPatterns = [
            /ad[s]?[-_]/, /banner/, /popup/, /modal/, /sidebar/,
            /widget/, /promo/, /sponsor/, /affiliate/
        ];
        
        element.querySelectorAll('*').forEach(el => {
            const className = el.className.toLowerCase();
            const id = el.id.toLowerCase();
            
            if (suspiciousPatterns.some(pattern => 
                pattern.test(className) || pattern.test(id)
            )) {
                el.remove();
            }
        });
        
        return element;
    }

    /**
     * Extract headings with hierarchy
     * 계층 구조와 함께 제목 추출
     */
    extractHeadings(element) {
        const headings = [];
        const headingElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headingElements.forEach((heading, index) => {
            const text = heading.textContent.trim();
            if (text.length > 0 && text.length < 200) {
                headings.push({
                    level: parseInt(heading.tagName.charAt(1)),
                    text: text,
                    index: index,
                    wordCount: text.split(/\s+/).length
                });
            }
        });
        
        return headings.slice(0, 20); // Limit to prevent overwhelming AI
    }

    /**
     * Extract meaningful paragraphs
     * 의미 있는 단락 추출
     */
    extractParagraphs(element) {
        const paragraphs = [];
        const paragraphElements = element.querySelectorAll('p');
        
        paragraphElements.forEach((p, index) => {
            const text = p.textContent.trim();
            
            // Filter out short or likely non-content paragraphs
            if (text.length >= this.config.minSentenceLength && 
                text.length <= 2000 &&
                !this.isLikelyNonContent(text)) {
                
                paragraphs.push({
                    text: text,
                    index: index,
                    wordCount: text.split(/\s+/).length,
                    sentences: this.splitIntoSentences(text).length
                });
            }
        });
        
        return paragraphs.slice(0, this.config.maxParagraphs);
    }

    /**
     * Extract list items
     * 목록 항목 추출
     */
    extractLists(element) {
        const lists = [];
        const listElements = element.querySelectorAll('ul, ol');
        
        listElements.forEach((list, index) => {
            const items = Array.from(list.querySelectorAll('li'))
                .map(li => li.textContent.trim())
                .filter(text => text.length > 0 && text.length < 500);
            
            if (items.length > 0) {
                lists.push({
                    type: list.tagName.toLowerCase(),
                    items: items.slice(0, 10), // Limit items per list
                    index: index
                });
            }
        });
        
        return lists.slice(0, 5); // Limit number of lists
    }

    /**
     * Extract quotes and blockquotes
     * 인용문 및 블록 인용문 추출
     */
    extractQuotes(element) {
        const quotes = [];
        const quoteElements = element.querySelectorAll('blockquote, q, .quote');
        
        quoteElements.forEach((quote, index) => {
            const text = quote.textContent.trim();
            
            if (text.length > 20 && text.length < 1000) {
                quotes.push({
                    text: text,
                    index: index,
                    type: quote.tagName.toLowerCase()
                });
            }
        });
        
        return quotes.slice(0, 5);
    }

    /**
     * Extract image descriptions from alt text
     * alt 텍스트에서 이미지 설명 추출
     */
    extractImageDescriptions(element) {
        const images = [];
        const imageElements = element.querySelectorAll('img');
        
        imageElements.forEach((img, index) => {
            const alt = img.alt || img.title || '';
            const caption = this.findImageCaption(img);
            
            if (alt.length > 5 || caption) {
                images.push({
                    alt: alt,
                    caption: caption,
                    index: index
                });
            }
        });
        
        return images.slice(0, 10);
    }

    /**
     * Find caption for an image
     * 이미지의 캡션 찾기
     */
    findImageCaption(img) {
        // Look for common caption patterns
        const parent = img.parentElement;
        if (!parent) return null;
        
        // Check for figcaption
        const figcaption = parent.querySelector('figcaption');
        if (figcaption) {
            return figcaption.textContent.trim();
        }
        
        // Check for caption class
        const captionElement = parent.querySelector('.caption, .img-caption, .image-caption');
        if (captionElement) {
            return captionElement.textContent.trim();
        }
        
        return null;
    }

    /**
     * Analyze content structure
     * 콘텐츠 구조 분석
     */
    analyzeStructure(content) {
        return {
            headingCount: content.headings.length,
            paragraphCount: content.paragraphs.length,
            listCount: content.lists.length,
            quoteCount: content.quotes.length,
            imageCount: content.images.length,
            hasHierarchy: content.headings.some(h => h.level > 1),
            avgParagraphLength: content.paragraphs.length > 0 ? 
                content.paragraphs.reduce((sum, p) => sum + p.wordCount, 0) / content.paragraphs.length : 0,
            totalWords: content.paragraphs.reduce((sum, p) => sum + p.wordCount, 0) +
                       content.headings.reduce((sum, h) => sum + h.wordCount, 0)
        };
    }

    /**
     * Process and format content for AI consumption
     * AI 소비를 위한 콘텐츠 처리 및 형식화
     */
    async processContent(structuredContent, config) {
        let processedText = '';
        let language = 'unknown';
        
        // Add headings with structure
        if (config.includeHeadings && structuredContent.headings.length > 0) {
            processedText += '# Main Topics:\n';
            structuredContent.headings.forEach(heading => {
                const prefix = '#'.repeat(Math.min(heading.level, 3));
                processedText += `${prefix} ${heading.text}\n`;
            });
            processedText += '\n';
        }
        
        // Add main content paragraphs
        if (structuredContent.paragraphs.length > 0) {
            processedText += '# Content:\n';
            structuredContent.paragraphs.forEach(paragraph => {
                processedText += `${paragraph.text}\n\n`;
            });
        }
        
        // Add lists if present
        if (config.includeLists && structuredContent.lists.length > 0) {
            processedText += '# Key Points:\n';
            structuredContent.lists.forEach(list => {
                list.items.forEach(item => {
                    processedText += `• ${item}\n`;
                });
                processedText += '\n';
            });
        }
        
        // Add quotes if present
        if (config.includeQuotes && structuredContent.quotes.length > 0) {
            processedText += '# Notable Quotes:\n';
            structuredContent.quotes.forEach(quote => {
                processedText += `"${quote.text}"\n\n`;
            });
        }
        
        // Add image descriptions if present
        if (structuredContent.images.length > 0) {
            processedText += '# Visual Content:\n';
            structuredContent.images.forEach(img => {
                if (img.alt) processedText += `Image: ${img.alt}\n`;
                if (img.caption) processedText += `Caption: ${img.caption}\n`;
            });
            processedText += '\n';
        }
        
        // Clean and optimize text
        processedText = this.cleanText(processedText);
        
        // Detect language
        language = this.detectLanguage(processedText);
        
        // Truncate if too long
        if (processedText.length > config.maxContentLength) {
            processedText = this.intelligentTruncate(processedText, config.maxContentLength);
        }
        
        return {
            text: processedText,
            language: language,
            structure: structuredContent.structure,
            wordCount: processedText.split(/\s+/).length
        };
    }

    /**
     * Clean and normalize text
     * 텍스트 정리 및 정규화
     */
    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .replace(/\n\s*\n/g, '\n\n')    // Normalize line breaks
            .replace(/[^\S\n]+/g, ' ')      // Remove extra spaces but keep newlines
            .trim();
    }

    /**
     * Detect content language
     * 콘텐츠 언어 감지
     */
    detectLanguage(text) {
        const sample = text.substring(0, 1000).toLowerCase();
        
        if (this.languagePatterns.korean.test(sample)) {
            return 'ko';
        } else if (this.languagePatterns.chinese.test(sample)) {
            return 'zh';
        } else if (this.languagePatterns.japanese.test(sample)) {
            return 'ja';
        } else if (this.languagePatterns.english.test(sample)) {
            return 'en';
        }
        
        return 'unknown';
    }

    /**
     * Intelligently truncate content while preserving structure
     * 구조를 보존하면서 지능적으로 콘텐츠 자르기
     */
    intelligentTruncate(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        
        // Try to cut at paragraph boundary
        const paragraphs = text.split('\n\n');
        let truncated = '';
        
        for (const paragraph of paragraphs) {
            if (truncated.length + paragraph.length + 2 <= maxLength - 50) {
                truncated += paragraph + '\n\n';
            } else {
                break;
            }
        }
        
        // If we have reasonable content, return it
        if (truncated.length > maxLength * 0.7) {
            return truncated.trim() + '\n\n[Content truncated for length]';
        }
        
        // Otherwise, cut at sentence boundary
        const sentences = text.split(/[.!?]+/);
        truncated = '';
        
        for (const sentence of sentences) {
            if (truncated.length + sentence.length + 1 <= maxLength - 50) {
                truncated += sentence + '.';
            } else {
                break;
            }
        }
        
        return truncated.trim() + ' [Content truncated for length]';
    }

    /**
     * Split text into sentences
     * 텍스트를 문장으로 분할
     */
    splitIntoSentences(text) {
        return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    }

    /**
     * Check if text is likely non-content (ads, navigation, etc.)
     * 텍스트가 비콘텐츠(광고, 네비게이션 등)일 가능성 확인
     */
    isLikelyNonContent(text) {
        const lowerText = text.toLowerCase();
        
        // Check for ad indicators
        const adIndicatorCount = this.adIndicators.filter(indicator => 
            lowerText.includes(indicator)
        ).length;
        
        if (adIndicatorCount > 2) return true;
        
        // Check for navigation indicators
        const navIndicatorCount = this.navigationIndicators.filter(indicator => 
            lowerText.includes(indicator)
        ).length;
        
        if (navIndicatorCount > 1 && text.length < 100) return true;
        
        // Check for excessive punctuation or special characters
        const specialCharRatio = (text.match(/[^a-zA-Z0-9\s가-힣]/g) || []).length / text.length;
        if (specialCharRatio > 0.3) return true;
        
        // Check for repetitive patterns
        const words = text.split(/\s+/);
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        if (words.length > 10 && uniqueWords.size / words.length < 0.3) return true;
        
        return false;
    }

    /**
     * Validate extracted content quality
     * 추출된 콘텐츠 품질 검증
     */
    validateContent(processedContent, config) {
        const issues = [];
        const warnings = [];
        let quality = 1.0;
        
        // Check minimum length
        if (processedContent.text.length < config.minContentLength) {
            issues.push('Content too short for meaningful summarization');
            quality *= 0.3;
        }
        
        // Check word count
        if (processedContent.wordCount < 50) {
            issues.push('Insufficient word count');
            quality *= 0.4;
        }
        
        // Check for meaningful structure
        if (processedContent.structure.paragraphCount < 2) {
            warnings.push('Limited paragraph structure');
            quality *= 0.8;
        }
        
        // Check language detection
        if (processedContent.language === 'unknown') {
            warnings.push('Could not detect content language');
            quality *= 0.9;
        }
        
        // Check for excessive truncation
        if (processedContent.text.includes('[Content truncated for length]')) {
            warnings.push('Content was truncated due to length limits');
            quality *= 0.9;
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues,
            warnings: warnings,
            quality: Math.max(quality, 0.1)
        };
    }

    /**
     * Fallback extraction when main extraction fails
     * 주요 추출이 실패할 때 대체 추출
     */
    async fallbackExtraction(config) {
        try {
            // Try extracting from document body with basic cleaning
            const bodyText = document.body.textContent || '';
            const cleanedText = bodyText
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, config.maxContentLength);
            
            if (cleanedText.length > config.minContentLength) {
                return {
                    content: cleanedText,
                    source: 'fallback-body',
                    quality: 0.3
                };
            }
            
            // Last resort: use page title and meta description
            const title = document.title || '';
            const description = document.querySelector('meta[name="description"]')?.content || '';
            
            return {
                content: `${title}\n\n${description}`.trim(),
                source: 'fallback-meta',
                quality: 0.1
            };
        } catch (error) {
            return {
                content: 'Content extraction failed',
                source: 'fallback-error',
                quality: 0.0
            };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentExtractor;
} else if (typeof window !== 'undefined') {
    window.ContentExtractor = ContentExtractor;
}