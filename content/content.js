// Content script for LaterLens Chrome extension
// 콘텐츠 스크립트 - 웹페이지에서 데이터 추출 및 조작

(function() {
    'use strict';
    
    // Prevent multiple injections
    if (window.laterLensContentScript) {
        return;
    }
    window.laterLensContentScript = true;
    
    console.log('LaterLens content script loaded on:', window.location.href);
    
    // Content extraction configuration
    const EXTRACTION_CONFIG = {
        maxContentLength: 8000,
        maxDescriptionLength: 500,
        imageTimeout: 3000,
        retryAttempts: 3,
        waitForImages: true
    };
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Content script received message:', message);
        
        // Handle async operations
        handleMessage(message)
            .then(response => sendResponse(response))
            .catch(error => {
                console.error('Content script error:', error);
                sendResponse({ error: error.message });
            });
        
        // Return true to indicate we'll send a response asynchronously
        return true;
    });

    /**
     * Handle incoming messages asynchronously
     * 들어오는 메시지를 비동기적으로 처리
     */
    async function handleMessage(message) {
        const { action, options = {} } = message;
        
        switch (action) {
            case 'extractMetadata':
                return await extractPageMetadata(options);
                
            case 'extractContent':
                return await extractPageContent(options);
                
            case 'getPageInfo':
                return await getPageInfo(options);
                
            case 'extractStructuredData':
                return await extractStructuredData();
                
            case 'detectPageType':
                return detectPageType();
                
            case 'extractImages':
                return await extractImages(options);
                
            case 'extractForAI':
                return await extractForAISummarization(options);
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
    
    /**
     * Extract comprehensive page metadata
     * 포괄적인 페이지 메타데이터 추출
     */
    async function extractPageMetadata(options = {}) {
        const metadata = {
            // Basic metadata
            title: '',
            description: '',
            keywords: [],
            author: '',
            publishedDate: null,
            modifiedDate: null,
            language: '',
            
            // Open Graph metadata
            ogTitle: '',
            ogDescription: '',
            ogImage: null,
            ogType: '',
            ogSiteName: '',
            ogUrl: '',
            
            // Twitter Card metadata
            twitterCard: '',
            twitterTitle: '',
            twitterDescription: '',
            twitterImage: null,
            twitterSite: '',
            twitterCreator: '',
            
            // Technical metadata
            favicon: null,
            canonical: window.location.href,
            robots: '',
            viewport: '',
            charset: '',
            
            // Additional metadata
            generator: '',
            theme: '',
            appleTouchIcon: null,
            msApplicationTileImage: null,
            
            // Page structure info
            headings: [],
            images: [],
            links: [],
            
            // Extraction metadata
            extractedAt: Date.now(),
            userAgent: navigator.userAgent,
            pageUrl: window.location.href,
            domain: window.location.hostname
        };
        
        try {
            // Wait for page to be ready
            await waitForPageReady();
            
            // Extract basic metadata
            metadata.title = extractTitle();
            metadata.description = extractDescription();
            metadata.keywords = extractKeywords();
            metadata.author = extractAuthor();
            metadata.language = extractLanguage();
            
            // Extract dates
            const dates = extractDates();
            metadata.publishedDate = dates.published;
            metadata.modifiedDate = dates.modified;
            
            // Extract Open Graph metadata
            const ogData = extractOpenGraphData();
            Object.assign(metadata, ogData);
            
            // Extract Twitter Card metadata
            const twitterData = extractTwitterCardData();
            Object.assign(metadata, twitterData);
            
            // Extract technical metadata
            const technicalData = extractTechnicalMetadata();
            Object.assign(metadata, technicalData);
            
            // Extract additional metadata
            const additionalData = extractAdditionalMetadata();
            Object.assign(metadata, additionalData);
            
            // Extract page structure if requested
            if (options.includeStructure) {
                metadata.headings = extractHeadings();
                metadata.images = await extractImages({ limit: 10 });
                metadata.links = extractLinks({ limit: 20 });
            }
            
            // Apply fallbacks and cleanup
            metadata = applyMetadataFallbacks(metadata);
            metadata = cleanupMetadata(metadata);
            
        } catch (error) {
            console.error('Error extracting metadata:', error);
            // Return basic metadata even if extraction fails
            metadata.title = document.title || '';
            metadata.description = getMetaContent('description') || '';
        }
        
        return metadata;
    }

    /**
     * Wait for page to be ready for extraction
     * 추출을 위해 페이지가 준비될 때까지 대기
     */
    function waitForPageReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                const handleReady = () => {
                    document.removeEventListener('DOMContentLoaded', handleReady);
                    window.removeEventListener('load', handleReady);
                    resolve();
                };
                
                document.addEventListener('DOMContentLoaded', handleReady);
                window.addEventListener('load', handleReady);
                
                // Fallback timeout
                setTimeout(resolve, 2000);
            }
        });
    }

    /**
     * Extract page title with fallbacks
     * 대체 방법을 포함한 페이지 제목 추출
     */
    function extractTitle() {
        // Try different sources in order of preference
        const sources = [
            () => getMetaContent('og:title'),
            () => getMetaContent('twitter:title'),
            () => document.title,
            () => document.querySelector('h1')?.textContent,
            () => document.querySelector('.title, .headline, .post-title')?.textContent
        ];
        
        for (const source of sources) {
            try {
                const title = source()?.trim();
                if (title && title.length > 0) {
                    return title.length > 200 ? title.substring(0, 200) + '...' : title;
                }
            } catch (error) {
                continue;
            }
        }
        
        return 'Untitled Page';
    }

    /**
     * Extract page description with fallbacks
     * 대체 방법을 포함한 페이지 설명 추출
     */
    function extractDescription() {
        const sources = [
            () => getMetaContent('description'),
            () => getMetaContent('og:description'),
            () => getMetaContent('twitter:description'),
            () => document.querySelector('.excerpt, .summary, .description')?.textContent,
            () => extractFirstParagraph()
        ];
        
        for (const source of sources) {
            try {
                const description = source()?.trim();
                if (description && description.length > 10) {
                    return description.length > EXTRACTION_CONFIG.maxDescriptionLength ? 
                           description.substring(0, EXTRACTION_CONFIG.maxDescriptionLength) + '...' : 
                           description;
                }
            } catch (error) {
                continue;
            }
        }
        
        return '';
    }

    /**
     * Extract first meaningful paragraph
     * 첫 번째 의미 있는 단락 추출
     */
    function extractFirstParagraph() {
        const paragraphs = document.querySelectorAll('p');
        for (const p of paragraphs) {
            const text = p.textContent.trim();
            if (text.length > 50 && !text.match(/^(cookie|privacy|terms|subscribe)/i)) {
                return text;
            }
        }
        return '';
    }

    /**
     * Extract keywords from meta tags and content
     * 메타 태그와 콘텐츠에서 키워드 추출
     */
    function extractKeywords() {
        const keywords = new Set();
        
        // From meta keywords
        const metaKeywords = getMetaContent('keywords');
        if (metaKeywords) {
            metaKeywords.split(',').forEach(keyword => {
                const cleaned = keyword.trim().toLowerCase();
                if (cleaned.length > 2) {
                    keywords.add(cleaned);
                }
            });
        }
        
        // From headings
        document.querySelectorAll('h1, h2, h3').forEach(heading => {
            const words = heading.textContent.toLowerCase().match(/\b\w{4,}\b/g);
            if (words) {
                words.slice(0, 3).forEach(word => keywords.add(word));
            }
        });
        
        return Array.from(keywords).slice(0, 10);
    }

    /**
     * Extract author information
     * 작성자 정보 추출
     */
    function extractAuthor() {
        const sources = [
            () => getMetaContent('author'),
            () => getMetaContent('article:author'),
            () => document.querySelector('[rel="author"]')?.textContent,
            () => document.querySelector('.author, .byline, .writer')?.textContent,
            () => document.querySelector('[itemprop="author"]')?.textContent
        ];
        
        for (const source of sources) {
            try {
                const author = source()?.trim();
                if (author && author.length > 0 && author.length < 100) {
                    return author;
                }
            } catch (error) {
                continue;
            }
        }
        
        return '';
    }

    /**
     * Extract language information
     * 언어 정보 추출
     */
    function extractLanguage() {
        return document.documentElement.lang || 
               getMetaContent('language') || 
               navigator.language || 
               'en';
    }

    /**
     * Extract publication and modification dates
     * 게시 및 수정 날짜 추출
     */
    function extractDates() {
        const dates = {
            published: null,
            modified: null
        };
        
        // Published date sources
        const publishedSources = [
            () => getMetaContent('article:published_time'),
            () => getMetaContent('datePublished'),
            () => document.querySelector('[itemprop="datePublished"]')?.getAttribute('datetime'),
            () => document.querySelector('time[pubdate]')?.getAttribute('datetime'),
            () => document.querySelector('.published, .date, .post-date')?.textContent
        ];
        
        // Modified date sources
        const modifiedSources = [
            () => getMetaContent('article:modified_time'),
            () => getMetaContent('dateModified'),
            () => document.querySelector('[itemprop="dateModified"]')?.getAttribute('datetime'),
            () => document.querySelector('time[datetime]')?.getAttribute('datetime')
        ];
        
        // Extract published date
        for (const source of publishedSources) {
            try {
                const dateStr = source();
                if (dateStr) {
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        dates.published = date.getTime();
                        break;
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        // Extract modified date
        for (const source of modifiedSources) {
            try {
                const dateStr = source();
                if (dateStr) {
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        dates.modified = date.getTime();
                        break;
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        return dates;
    }

    /**
     * Extract Open Graph metadata
     * Open Graph 메타데이터 추출
     */
    function extractOpenGraphData() {
        return {
            ogTitle: getMetaContent('og:title') || '',
            ogDescription: getMetaContent('og:description') || '',
            ogImage: makeAbsoluteUrl(getMetaContent('og:image')),
            ogType: getMetaContent('og:type') || '',
            ogSiteName: getMetaContent('og:site_name') || '',
            ogUrl: getMetaContent('og:url') || window.location.href
        };
    }

    /**
     * Extract Twitter Card metadata
     * Twitter Card 메타데이터 추출
     */
    function extractTwitterCardData() {
        return {
            twitterCard: getMetaContent('twitter:card') || '',
            twitterTitle: getMetaContent('twitter:title') || '',
            twitterDescription: getMetaContent('twitter:description') || '',
            twitterImage: makeAbsoluteUrl(getMetaContent('twitter:image')),
            twitterSite: getMetaContent('twitter:site') || '',
            twitterCreator: getMetaContent('twitter:creator') || ''
        };
    }

    /**
     * Extract technical metadata
     * 기술적 메타데이터 추출
     */
    function extractTechnicalMetadata() {
        const canonical = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
        const favicon = extractFavicon();
        
        return {
            canonical: canonical,
            favicon: favicon,
            robots: getMetaContent('robots') || '',
            viewport: getMetaContent('viewport') || '',
            charset: document.characterSet || document.charset || 'UTF-8'
        };
    }

    /**
     * Extract additional metadata
     * 추가 메타데이터 추출
     */
    function extractAdditionalMetadata() {
        return {
            generator: getMetaContent('generator') || '',
            theme: getMetaContent('theme-color') || '',
            appleTouchIcon: makeAbsoluteUrl(document.querySelector('link[rel="apple-touch-icon"]')?.href),
            msApplicationTileImage: makeAbsoluteUrl(getMetaContent('msapplication-TileImage'))
        };
    }

    /**
     * Extract favicon with fallbacks
     * 대체 방법을 포함한 파비콘 추출
     */
    function extractFavicon() {
        const sources = [
            () => document.querySelector('link[rel="icon"]')?.href,
            () => document.querySelector('link[rel="shortcut icon"]')?.href,
            () => document.querySelector('link[rel="apple-touch-icon"]')?.href,
            () => window.location.origin + '/favicon.ico'
        ];
        
        for (const source of sources) {
            try {
                const favicon = source();
                if (favicon) {
                    return makeAbsoluteUrl(favicon);
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }

    /**
     * Get meta tag content by name or property
     * 이름 또는 속성으로 메타 태그 콘텐츠 가져오기
     */
    function getMetaContent(name) {
        const meta = document.querySelector(`meta[name="${name}"]`) ||
                    document.querySelector(`meta[property="${name}"]`) ||
                    document.querySelector(`meta[itemprop="${name}"]`);
        return meta ? meta.content : null;
    }

    /**
     * Convert relative URL to absolute URL
     * 상대 URL을 절대 URL로 변환
     */
    function makeAbsoluteUrl(url) {
        if (!url) return null;
        
        try {
            if (url.startsWith('http')) {
                return url;
            } else if (url.startsWith('//')) {
                return window.location.protocol + url;
            } else if (url.startsWith('/')) {
                return window.location.origin + url;
            } else {
                return new URL(url, window.location.href).href;
            }
        } catch (error) {
            console.warn('Failed to make absolute URL:', url, error);
            return url;
        }
    }

    /**
     * Apply fallbacks for missing metadata
     * 누락된 메타데이터에 대한 대체 적용
     */
    function applyMetadataFallbacks(metadata) {
        // Use Open Graph data as fallback
        if (!metadata.title && metadata.ogTitle) {
            metadata.title = metadata.ogTitle;
        }
        if (!metadata.description && metadata.ogDescription) {
            metadata.description = metadata.ogDescription;
        }
        
        // Use Twitter Card data as fallback
        if (!metadata.title && metadata.twitterTitle) {
            metadata.title = metadata.twitterTitle;
        }
        if (!metadata.description && metadata.twitterDescription) {
            metadata.description = metadata.twitterDescription;
        }
        
        // Ensure we have at least a basic title
        if (!metadata.title) {
            metadata.title = document.title || 'Untitled Page';
        }
        
        return metadata;
    }

    /**
     * Clean up and validate metadata
     * 메타데이터 정리 및 검증
     */
    function cleanupMetadata(metadata) {
        // Clean up strings
        Object.keys(metadata).forEach(key => {
            if (typeof metadata[key] === 'string') {
                metadata[key] = metadata[key].trim();
                // Remove excessive whitespace
                metadata[key] = metadata[key].replace(/\s+/g, ' ');
            }
        });
        
        // Validate URLs
        ['ogImage', 'twitterImage', 'favicon', 'canonical', 'appleTouchIcon'].forEach(key => {
            if (metadata[key] && !isValidUrl(metadata[key])) {
                metadata[key] = null;
            }
        });
        
        return metadata;
    }

    /**
     * Check if URL is valid
     * URL 유효성 검사
     */
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    /**
     * Extract main content from the page for AI summarization
     * AI 요약을 위한 페이지 주요 콘텐츠 추출
     */
    async function extractPageContent(options = {}) {
        try {
            const maxLength = options.maxLength || EXTRACTION_CONFIG.maxContentLength;
            const includeImages = options.includeImages || false;
            const preserveFormatting = options.preserveFormatting || false;
            
            let content = '';
            let contentSource = 'unknown';
            
            // Try to find main content areas in order of preference
            const contentSelectors = [
                { selector: 'main', priority: 10 },
                { selector: 'article', priority: 9 },
                { selector: '[role="main"]', priority: 8 },
                { selector: '.main-content, .content, #content', priority: 7 },
                { selector: '.post-content, .entry-content, .article-content', priority: 6 },
                { selector: '.post, .entry, .article', priority: 5 },
                { selector: '.container .content, .wrapper .content', priority: 4 }
            ];
            
            let bestElement = null;
            let bestScore = 0;
            
            // Score each potential content element
            for (const { selector, priority } of contentSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const score = scoreContentElement(element) + priority;
                    if (score > bestScore) {
                        bestScore = score;
                        bestElement = element;
                        contentSource = selector;
                    }
                }
            }
            
            if (bestElement) {
                content = await extractTextFromElement(bestElement, {
                    preserveFormatting,
                    includeImages,
                    maxLength
                });
            } else {
                // Fallback: extract from body with smart filtering
                content = await extractFromBodyWithFiltering({
                    preserveFormatting,
                    includeImages,
                    maxLength
                });
                contentSource = 'body-filtered';
            }
            
            // Post-process content
            content = postProcessContent(content, {
                maxLength,
                preserveFormatting
            });
            
            return {
                content: content,
                source: contentSource,
                length: content.length,
                extractedAt: Date.now(),
                wordCount: content.split(/\s+/).length,
                readingTime: Math.ceil(content.split(/\s+/).length / 200) // Assuming 200 WPM
            };
            
        } catch (error) {
            console.error('Error extracting content:', error);
            return {
                content: document.title || 'Content extraction failed',
                source: 'fallback',
                length: 0,
                extractedAt: Date.now(),
                error: error.message
            };
        }
    }

    /**
     * Score content element based on various factors
     * 다양한 요소를 기반으로 콘텐츠 요소 점수 매기기
     */
    function scoreContentElement(element) {
        let score = 0;
        
        // Text length (more text = higher score, but with diminishing returns)
        const textLength = element.textContent.trim().length;
        score += Math.min(textLength / 100, 50);
        
        // Paragraph count
        const paragraphs = element.querySelectorAll('p');
        score += paragraphs.length * 2;
        
        // Heading count
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        score += headings.length * 1.5;
        
        // Penalize elements with too many links (likely navigation)
        const links = element.querySelectorAll('a');
        const linkRatio = links.length / Math.max(paragraphs.length, 1);
        if (linkRatio > 2) {
            score -= linkRatio * 5;
        }
        
        // Penalize elements with forms (likely not main content)
        const forms = element.querySelectorAll('form, input, button');
        score -= forms.length * 2;
        
        // Bonus for semantic elements
        if (element.tagName === 'ARTICLE') score += 10;
        if (element.tagName === 'MAIN') score += 15;
        
        // Penalize hidden elements
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            score -= 100;
        }
        
        return Math.max(score, 0);
    }

    /**
     * Extract content from body with smart filtering
     * 스마트 필터링을 통한 본문 콘텐츠 추출
     */
    async function extractFromBodyWithFiltering(options = {}) {
        const bodyClone = document.body.cloneNode(true);
        
        // Remove unwanted elements
        const unwantedSelectors = [
            'script', 'style', 'noscript',
            'nav', 'header', 'footer', 'aside',
            '.sidebar', '.menu', '.navigation',
            '.ads', '.advertisement', '.banner',
            '.social', '.share', '.comments',
            '.related', '.recommended',
            '.popup', '.modal', '.overlay',
            '[role="banner"]', '[role="navigation"]',
            '[role="complementary"]', '[role="contentinfo"]'
        ];
        
        unwantedSelectors.forEach(selector => {
            bodyClone.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        // Remove elements with suspicious class names
        const suspiciousPatterns = [
            /ad[s]?[-_]/, /banner/, /popup/, /modal/,
            /sidebar/, /widget/, /promo/, /sponsor/
        ];
        
        bodyClone.querySelectorAll('*').forEach(el => {
            const className = el.className.toLowerCase();
            if (suspiciousPatterns.some(pattern => pattern.test(className))) {
                el.remove();
            }
        });
        
        return await extractTextFromElement(bodyClone, options);
    }

    /**
     * Post-process extracted content
     * 추출된 콘텐츠 후처리
     */
    function postProcessContent(content, options = {}) {
        if (!content) return '';
        
        let processed = content;
        
        if (!options.preserveFormatting) {
            // Normalize whitespace
            processed = processed.replace(/\s+/g, ' ');
            processed = processed.replace(/\n+/g, '\n');
        }
        
        // Remove excessive punctuation
        processed = processed.replace(/[.]{3,}/g, '...');
        processed = processed.replace(/[!]{2,}/g, '!');
        processed = processed.replace(/[?]{2,}/g, '?');
        
        // Trim and limit length
        processed = processed.trim();
        if (processed.length > options.maxLength) {
            // Try to cut at sentence boundary
            const cutPoint = processed.lastIndexOf('.', options.maxLength - 3);
            if (cutPoint > options.maxLength * 0.8) {
                processed = processed.substring(0, cutPoint + 1);
            } else {
                processed = processed.substring(0, options.maxLength - 3) + '...';
            }
        }
        
        return processed;
    }
    
    /**
     * Extract text content from an element with advanced options
     * 고급 옵션을 사용한 요소에서 텍스트 콘텐츠 추출
     */
    async function extractTextFromElement(element, options = {}) {
        const {
            preserveFormatting = false,
            includeImages = false,
            maxLength = EXTRACTION_CONFIG.maxContentLength
        } = options;
        
        let text = '';
        const imageDescriptions = [];
        
        function processNode(node, depth = 0) {
            if (depth > 20) return ''; // Prevent infinite recursion
            
            if (node.nodeType === Node.TEXT_NODE) {
                const nodeText = node.textContent.trim();
                if (nodeText) {
                    return nodeText + ' ';
                }
                return '';
            }
            
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }
            
            const tagName = node.tagName.toLowerCase();
            
            // Skip unwanted elements
            if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
                return '';
            }
            
            // Handle images
            if (tagName === 'img' && includeImages) {
                const alt = node.alt || node.title || '';
                if (alt) {
                    imageDescriptions.push(alt);
                    return preserveFormatting ? `[Image: ${alt}] ` : `${alt} `;
                }
                return '';
            }
            
            // Handle links
            if (tagName === 'a') {
                const linkText = Array.from(node.childNodes)
                    .map(child => processNode(child, depth + 1))
                    .join('');
                return linkText;
            }
            
            // Process child nodes
            let childText = '';
            for (const child of node.childNodes) {
                childText += processNode(child, depth + 1);
            }
            
            // Add appropriate spacing/formatting
            if (preserveFormatting) {
                if (['p', 'div', 'br'].includes(tagName)) {
                    return childText + '\n';
                } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                    return '\n' + childText + '\n';
                } else if (['li'].includes(tagName)) {
                    return '• ' + childText + '\n';
                }
            } else {
                if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br'].includes(tagName)) {
                    return childText + '\n';
                }
            }
            
            return childText + ' ';
        }
        
        text = processNode(element);
        
        // Add image descriptions if any
        if (includeImages && imageDescriptions.length > 0) {
            text += '\n\nImages: ' + imageDescriptions.join(', ');
        }
        
        return text;
    }

    /**
     * Extract headings structure
     * 제목 구조 추출
     */
    function extractHeadings() {
        const headings = [];
        const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headingElements.forEach((heading, index) => {
            const text = heading.textContent.trim();
            if (text && text.length > 0) {
                headings.push({
                    level: parseInt(heading.tagName.charAt(1)),
                    text: text,
                    id: heading.id || null,
                    index: index
                });
            }
        });
        
        return headings.slice(0, 20); // Limit to first 20 headings
    }

    /**
     * Extract images with metadata
     * 메타데이터와 함께 이미지 추출
     */
    async function extractImages(options = {}) {
        const limit = options.limit || 10;
        const minWidth = options.minWidth || 100;
        const minHeight = options.minHeight || 100;
        
        const images = [];
        const imgElements = document.querySelectorAll('img');
        
        for (let i = 0; i < Math.min(imgElements.length, limit * 2); i++) {
            const img = imgElements[i];
            
            try {
                // Skip if image is too small or hidden
                if (img.width < minWidth || img.height < minHeight) continue;
                
                const style = window.getComputedStyle(img);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
                
                const imageData = {
                    src: makeAbsoluteUrl(img.src),
                    alt: img.alt || '',
                    title: img.title || '',
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height,
                    loading: img.loading || 'eager'
                };
                
                // Skip data URLs and invalid URLs
                if (!imageData.src || imageData.src.startsWith('data:')) continue;
                
                images.push(imageData);
                
                if (images.length >= limit) break;
            } catch (error) {
                console.warn('Error processing image:', error);
                continue;
            }
        }
        
        return images;
    }

    /**
     * Extract links with metadata
     * 메타데이터와 함께 링크 추출
     */
    function extractLinks(options = {}) {
        const limit = options.limit || 20;
        const internal = options.internal !== false;
        const external = options.external !== false;
        
        const links = [];
        const linkElements = document.querySelectorAll('a[href]');
        
        for (let i = 0; i < Math.min(linkElements.length, limit * 2); i++) {
            const link = linkElements[i];
            
            try {
                const href = link.href;
                const text = link.textContent.trim();
                
                if (!href || !text || text.length > 100) continue;
                
                const isInternal = href.startsWith(window.location.origin);
                
                if ((isInternal && !internal) || (!isInternal && !external)) {
                    continue;
                }
                
                links.push({
                    href: href,
                    text: text,
                    title: link.title || '',
                    isInternal: isInternal,
                    target: link.target || ''
                });
                
                if (links.length >= limit) break;
            } catch (error) {
                console.warn('Error processing link:', error);
                continue;
            }
        }
        
        return links;
    }

    /**
     * Extract structured data (JSON-LD, microdata)
     * 구조화된 데이터 추출 (JSON-LD, 마이크로데이터)
     */
    async function extractStructuredData() {
        const structuredData = {
            jsonLd: [],
            microdata: {},
            rdfa: {}
        };
        
        try {
            // Extract JSON-LD
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            jsonLdScripts.forEach(script => {
                try {
                    const data = JSON.parse(script.textContent);
                    structuredData.jsonLd.push(data);
                } catch (error) {
                    console.warn('Invalid JSON-LD:', error);
                }
            });
            
            // Extract microdata
            const microdataElements = document.querySelectorAll('[itemscope]');
            microdataElements.forEach(element => {
                const itemType = element.getAttribute('itemtype');
                if (itemType) {
                    const properties = {};
                    element.querySelectorAll('[itemprop]').forEach(prop => {
                        const name = prop.getAttribute('itemprop');
                        const value = prop.getAttribute('content') || prop.textContent.trim();
                        properties[name] = value;
                    });
                    
                    if (!structuredData.microdata[itemType]) {
                        structuredData.microdata[itemType] = [];
                    }
                    structuredData.microdata[itemType].push(properties);
                }
            });
            
        } catch (error) {
            console.error('Error extracting structured data:', error);
        }
        
        return structuredData;
    }

    /**
     * Detect page type based on content and metadata
     * 콘텐츠와 메타데이터를 기반으로 페이지 유형 감지
     */
    function detectPageType() {
        const indicators = {
            article: 0,
            product: 0,
            homepage: 0,
            listing: 0,
            profile: 0,
            documentation: 0
        };
        
        // Check meta tags
        const ogType = getMetaContent('og:type');
        if (ogType === 'article') indicators.article += 10;
        if (ogType === 'product') indicators.product += 10;
        if (ogType === 'profile') indicators.profile += 10;
        
        // Check URL patterns
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/article/') || path.includes('/post/')) indicators.article += 5;
        if (path.includes('/product/') || path.includes('/item/')) indicators.product += 5;
        if (path.includes('/user/') || path.includes('/profile/')) indicators.profile += 5;
        if (path.includes('/docs/') || path.includes('/documentation/')) indicators.documentation += 5;
        
        // Check content structure
        const articles = document.querySelectorAll('article');
        if (articles.length > 0) indicators.article += articles.length * 2;
        
        const products = document.querySelectorAll('.product, [itemtype*="Product"]');
        if (products.length > 0) indicators.product += products.length * 3;
        
        // Check for listing patterns
        const lists = document.querySelectorAll('ul, ol, .list, .grid');
        if (lists.length > 3) indicators.listing += 3;
        
        // Homepage indicators
        if (window.location.pathname === '/' || window.location.pathname === '') {
            indicators.homepage += 10;
        }
        
        // Find the highest scoring type
        const maxScore = Math.max(...Object.values(indicators));
        const detectedType = Object.keys(indicators).find(key => indicators[key] === maxScore);
        
        return {
            type: detectedType || 'unknown',
            confidence: maxScore / 20, // Normalize to 0-1 scale
            scores: indicators
        };
    }
    
    /**
     * Get comprehensive page information
     * 종합적인 페이지 정보 가져오기
     */
    async function getPageInfo(options = {}) {
        try {
            const includeContent = options.includeContent !== false;
            const includeStructure = options.includeStructure || false;
            const includeStructuredData = options.includeStructuredData || false;
            
            const pageInfo = {
                // Basic page info
                url: window.location.href,
                title: document.title,
                domain: window.location.hostname,
                protocol: window.location.protocol,
                pathname: window.location.pathname,
                
                // Page state
                readyState: document.readyState,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                language: navigator.language,
                
                // Viewport info
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    scrollX: window.scrollX,
                    scrollY: window.scrollY
                },
                
                // Document info
                characterSet: document.characterSet,
                contentType: document.contentType,
                lastModified: document.lastModified,
                
                // Performance info
                loadTime: performance.now(),
                
                // Extraction results
                metadata: null,
                content: null,
                pageType: null,
                structuredData: null
            };
            
            // Extract metadata
            pageInfo.metadata = await extractPageMetadata({
                includeStructure: includeStructure
            });
            
            // Extract content if requested
            if (includeContent) {
                pageInfo.content = await extractPageContent({
                    maxLength: options.maxContentLength || 1000,
                    preserveFormatting: false
                });
            }
            
            // Detect page type
            pageInfo.pageType = detectPageType();
            
            // Extract structured data if requested
            if (includeStructuredData) {
                pageInfo.structuredData = await extractStructuredData();
            }
            
            return pageInfo;
        } catch (error) {
            console.error('Error getting page info:', error);
            return {
                url: window.location.href,
                title: document.title,
                domain: window.location.hostname,
                timestamp: Date.now(),
                error: error.message
            };
        }
    }

    /**
     * Check if the page is ready for content extraction
     * 콘텐츠 추출을 위한 페이지 준비 상태 확인
     */
    function isPageReady() {
        return document.readyState === 'complete' || 
               document.readyState === 'interactive';
    }

    /**
     * Monitor page changes for dynamic content
     * 동적 콘텐츠를 위한 페이지 변경 모니터링
     */
    function setupPageMonitoring() {
        let lastUrl = window.location.href;
        let lastTitle = document.title;
        
        // Monitor URL changes (for SPAs)
        const checkForChanges = () => {
            if (window.location.href !== lastUrl || document.title !== lastTitle) {
                console.log('LaterLens: Page changed detected');
                lastUrl = window.location.href;
                lastTitle = document.title;
                
                // Notify background script of page change
                try {
                    chrome.runtime.sendMessage({
                        action: 'pageChanged',
                        url: lastUrl,
                        title: lastTitle
                    });
                } catch (error) {
                    // Ignore errors if extension context is invalid
                }
            }
        };
        
        // Check for changes periodically
        setInterval(checkForChanges, 1000);
        
        // Also listen for popstate events
        window.addEventListener('popstate', checkForChanges);
        
        // Monitor DOM changes for dynamic content
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                let significantChange = false;
                
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // Check if added nodes contain significant content
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const text = node.textContent || '';
                                if (text.length > 100) {
                                    significantChange = true;
                                    break;
                                }
                            }
                        }
                    }
                });
                
                if (significantChange) {
                    console.log('LaterLens: Significant DOM change detected');
                    // Could notify background script here if needed
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });
        }
    }

    /**
     * Initialize content script
     * 콘텐츠 스크립트 초기화
     */
    function initialize() {
        console.log('LaterLens: Content script initialized');
        
        // Set up page monitoring
        setupPageMonitoring();
        
        // Wait for page to be ready if it's not already
        if (!isPageReady()) {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('LaterLens: Page ready for content extraction');
            });
            
            window.addEventListener('load', () => {
                console.log('LaterLens: Page fully loaded');
            });
        }
        
        // Add error handling for unhandled errors
        window.addEventListener('error', (event) => {
            console.warn('LaterLens: Page error detected:', event.error);
        });
    }

    /**
     * Extract content specifically for AI summarization
     * AI 요약을 위한 콘텐츠 추출
     */
    async function extractForAISummarization(options = {}) {
        try {
            // Create ContentExtractor instance if available
            if (typeof ContentExtractor !== 'undefined') {
                const extractor = new ContentExtractor();
                return await extractor.extractForSummarization(options);
            } else {
                // Fallback to existing content extraction
                const content = await extractPageContent(options);
                return {
                    success: true,
                    content: content.content || content,
                    metadata: {
                        source: 'fallback',
                        extractedAt: Date.now(),
                        language: 'unknown',
                        quality: 0.7
                    }
                };
            }
        } catch (error) {
            console.error('AI content extraction failed:', error);
            return {
                success: false,
                error: error.message,
                fallback: {
                    content: document.title || 'Content extraction failed',
                    source: 'error-fallback',
                    quality: 0.1
                }
            };
        }
    }

    // Initialize when script loads
    initialize();
    
})();