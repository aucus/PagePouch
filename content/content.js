// Content script for PagePouch Chrome extension
// 콘텐츠 스크립트 - 웹페이지에서 데이터 추출 및 조작

(function() {
    'use strict';
    
    // Prevent multiple injections
    if (window.pagePouchContentScript) {
        return;
    }
    window.pagePouchContentScript = true;
    
    console.log('PagePouch content script loaded on:', window.location.href);
    
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
            
            // Additional metadata
            canonicalUrl: '',
            favicon: '',
            themeColor: '',
            viewport: '',
            robots: '',
            
            // Page structure
            headings: [],
            links: [],
            images: [],
            
            // Performance metrics
            loadTime: null,
            domSize: 0,
            scriptCount: 0,
            styleCount: 0
        };
        
        try {
            // Extract basic metadata
            metadata.title = getMetaContent('title') || document.title || '';
            metadata.description = getMetaContent('description') || '';
            metadata.keywords = getMetaContent('keywords', true) || [];
            metadata.author = getMetaContent('author') || '';
            metadata.language = document.documentElement.lang || 'en';
            
            // Extract dates
            metadata.publishedDate = parseDate(getMetaContent('article:published_time') || getMetaContent('date') || '');
            metadata.modifiedDate = parseDate(getMetaContent('article:modified_time') || getMetaContent('lastmod') || '');
            
            // Extract Open Graph metadata
            metadata.ogTitle = getMetaContent('og:title') || metadata.title;
            metadata.ogDescription = getMetaContent('og:description') || metadata.description;
            metadata.ogImage = getMetaContent('og:image') || '';
            metadata.ogType = getMetaContent('og:type') || 'website';
            metadata.ogSiteName = getMetaContent('og:site_name') || '';
            metadata.ogUrl = getMetaContent('og:url') || window.location.href;
            
            // Extract Twitter Card metadata
            metadata.twitterCard = getMetaContent('twitter:card') || '';
            metadata.twitterTitle = getMetaContent('twitter:title') || metadata.ogTitle;
            metadata.twitterDescription = getMetaContent('twitter:description') || metadata.ogDescription;
            metadata.twitterImage = getMetaContent('twitter:image') || metadata.ogImage;
            
            // Extract additional metadata
            metadata.canonicalUrl = getCanonicalUrl();
            metadata.favicon = getFavicon();
            metadata.themeColor = getMetaContent('theme-color') || '';
            metadata.viewport = getMetaContent('viewport') || '';
            metadata.robots = getMetaContent('robots') || '';
            
            // Extract page structure
            metadata.headings = extractHeadings();
            metadata.links = extractLinks();
            metadata.images = extractImages();
            
            // Calculate performance metrics
            metadata.loadTime = performance.now();
            metadata.domSize = document.querySelectorAll('*').length;
            metadata.scriptCount = document.querySelectorAll('script').length;
            metadata.styleCount = document.querySelectorAll('link[rel="stylesheet"], style').length;
            
            return metadata;
            
        } catch (error) {
            console.error('Error extracting metadata:', error);
            throw error;
        }
    }
    
    /**
     * Extract page content for AI summarization
     * AI 요약을 위한 페이지 콘텐츠 추출
     */
    async function extractPageContent(options = {}) {
        const {
            includeImages = true,
            includeLinks = true,
            maxLength = EXTRACTION_CONFIG.maxContentLength,
            preserveFormatting = false
        } = options;
        
        try {
            // Clone the document to avoid modifying the original
            const clone = document.cloneNode(true);
            
            // Remove unwanted elements
            removeUnwantedElements(clone);
            
            // Extract main content
            const mainContent = extractMainContent(clone);
            
            // Process content
            let content = processContent(mainContent, {
                includeImages,
                includeLinks,
                preserveFormatting
            });
            
            // Truncate if necessary
            if (content.length > maxLength) {
                content = content.substring(0, maxLength) + '...';
            }
            
            return {
                content,
                length: content.length,
                hasImages: includeImages && mainContent.querySelectorAll('img').length > 0,
                hasLinks: includeLinks && mainContent.querySelectorAll('a').length > 0
            };
            
        } catch (error) {
            console.error('Error extracting content:', error);
            throw error;
        }
    }
    
    /**
     * Get comprehensive page information
     * 포괄적인 페이지 정보 가져오기
     */
    async function getPageInfo(options = {}) {
        try {
            const metadata = await extractPageMetadata(options);
            const content = await extractPageContent({
                maxLength: options.maxContentLength || 1000,
                preserveFormatting: false
            });
            const structuredData = await extractStructuredData();
            const pageType = detectPageType();
            
            return {
                url: window.location.href,
                domain: window.location.hostname,
                path: window.location.pathname,
                metadata,
                content,
                structuredData,
                pageType,
                timestamp: Date.now(),
                userAgent: navigator.userAgent
            };
            
        } catch (error) {
            console.error('Error getting page info:', error);
            throw error;
        }
    }
    
    /**
     * Extract structured data (JSON-LD, Microdata, RDFa)
     * 구조화된 데이터 추출 (JSON-LD, Microdata, RDFa)
     */
    async function extractStructuredData() {
        const structuredData = {
            jsonLd: [],
            microdata: [],
            rdfa: []
        };
        
        try {
            // Extract JSON-LD
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of jsonLdScripts) {
                try {
                    const data = JSON.parse(script.textContent);
                    structuredData.jsonLd.push(data);
                } catch (error) {
                    console.warn('Invalid JSON-LD:', error);
                }
            }
            
            // Extract Microdata
            const microdataElements = document.querySelectorAll('[itemtype]');
            for (const element of microdataElements) {
                const itemType = element.getAttribute('itemtype');
                const itemProps = {};
                
                const props = element.querySelectorAll('[itemprop]');
                for (const prop of props) {
                    const propName = prop.getAttribute('itemprop');
                    const propValue = prop.getAttribute('content') || prop.textContent.trim();
                    itemProps[propName] = propValue;
                }
                
                structuredData.microdata.push({
                    type: itemType,
                    properties: itemProps
                });
            }
            
            return structuredData;
            
        } catch (error) {
            console.error('Error extracting structured data:', error);
            return structuredData;
        }
    }
    
    /**
     * Detect page type based on content and metadata
     * 콘텐츠와 메타데이터를 기반으로 페이지 타입 감지
     */
    function detectPageType() {
        const url = window.location.href;
        const path = window.location.pathname;
        const hostname = window.location.hostname;
        
        // Check for common patterns
        if (path.includes('/blog/') || path.includes('/article/') || path.includes('/post/')) {
            return 'article';
        }
        
        if (path.includes('/product/') || path.includes('/item/')) {
            return 'product';
        }
        
        if (path.includes('/user/') || path.includes('/profile/')) {
            return 'profile';
        }
        
        if (path.includes('/search') || path.includes('/results')) {
            return 'search';
        }
        
        if (path === '/' || path === '') {
            return 'homepage';
        }
        
        // Check meta tags
        const ogType = getMetaContent('og:type');
        if (ogType) {
            return ogType;
        }
        
        // Default to webpage
        return 'webpage';
    }
    
    /**
     * Extract images from the page
     * 페이지에서 이미지 추출
     */
    async function extractImages(options = {}) {
        const {
            maxImages = 10,
            minWidth = 100,
            minHeight = 100,
            includeDataUrls = false
        } = options;
        
        try {
            const images = [];
            const imgElements = document.querySelectorAll('img');
            
            for (const img of imgElements) {
                if (images.length >= maxImages) break;
                
                const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
                if (!src) continue;
                
                // Skip data URLs unless requested
                if (!includeDataUrls && src.startsWith('data:')) continue;
                
                // Get image dimensions
                const width = img.naturalWidth || img.width || 0;
                const height = img.naturalHeight || img.height || 0;
                
                // Skip small images
                if (width < minWidth || height < minHeight) continue;
                
                // Get alt text
                const alt = img.alt || '';
                
                // Get title
                const title = img.title || '';
                
                images.push({
                    src,
                    alt,
                    title,
                    width,
                    height,
                    loading: img.loading || 'lazy'
                });
            }
            
            return images;
            
        } catch (error) {
            console.error('Error extracting images:', error);
            return [];
        }
    }
    
    /**
     * Extract content optimized for AI summarization
     * AI 요약에 최적화된 콘텐츠 추출
     */
    async function extractForAISummarization(options = {}) {
        try {
            const metadata = await extractPageMetadata();
            const content = await extractPageContent({
                ...options,
                includeImages: false,
                includeLinks: false,
                preserveFormatting: false
            });
            
            // Combine title and content for AI processing
            const aiContent = {
                title: metadata.title,
                description: metadata.description,
                content: content.content,
                keywords: metadata.keywords,
                author: metadata.author,
                publishedDate: metadata.publishedDate,
                url: window.location.href,
                domain: window.location.hostname,
                pageType: detectPageType()
            };
            
            return aiContent;
            
        } catch (error) {
            console.error('Error extracting content for AI:', error);
            throw error;
        }
    }
    
    // Helper functions
    
    /**
     * Get meta content by name or property
     * name 또는 property로 메타 콘텐츠 가져오기
     */
    function getMetaContent(name, asArray = false) {
        const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        if (!meta) return asArray ? [] : '';
        
        const content = meta.getAttribute('content');
        if (asArray && content) {
            return content.split(',').map(item => item.trim());
        }
        return content || '';
    }
    
    /**
     * Parse date string
     * 날짜 문자열 파싱
     */
    function parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? null : date.toISOString();
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Get canonical URL
     * 정규 URL 가져오기
     */
    function getCanonicalUrl() {
        const canonical = document.querySelector('link[rel="canonical"]');
        return canonical ? canonical.href : window.location.href;
    }
    
    /**
     * Get favicon
     * 파비콘 가져오기
     */
    function getFavicon() {
        const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
        return favicon ? favicon.href : '';
    }
    
    /**
     * Extract headings
     * 제목 추출
     */
    function extractHeadings() {
        const headings = [];
        const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        for (const heading of headingElements) {
            headings.push({
                level: parseInt(heading.tagName.charAt(1)),
                text: heading.textContent.trim(),
                id: heading.id || ''
            });
        }
        
        return headings;
    }
    
    /**
     * Extract links
     * 링크 추출
     */
    function extractLinks() {
        const links = [];
        const linkElements = document.querySelectorAll('a[href]');
        
        for (const link of linkElements) {
            const href = link.href;
            if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                links.push({
                    href,
                    text: link.textContent.trim(),
                    title: link.title || ''
                });
            }
        }
        
        return links;
    }
    
    /**
     * Extract images
     * 이미지 추출
     */
    function extractImages() {
        const images = [];
        const imgElements = document.querySelectorAll('img[src]');
        
        for (const img of imgElements) {
            images.push({
                src: img.src,
                alt: img.alt || '',
                title: img.title || ''
            });
        }
        
        return images;
    }
    
    /**
     * Remove unwanted elements from document clone
     * 문서 클론에서 원하지 않는 요소 제거
     */
    function removeUnwantedElements(doc) {
        const selectors = [
            'script',
            'style',
            'nav',
            'header',
            'footer',
            'aside',
            '.advertisement',
            '.ads',
            '.banner',
            '.sidebar',
            '.navigation',
            '.menu',
            '.footer',
            '.header'
        ];
        
        for (const selector of selectors) {
            const elements = doc.querySelectorAll(selector);
            for (const element of elements) {
                element.remove();
            }
        }
    }
    
    /**
     * Extract main content
     * 주요 콘텐츠 추출
     */
    function extractMainContent(doc) {
        // Try to find main content area
        const mainSelectors = [
            'main',
            'article',
            '.main-content',
            '.content',
            '.post-content',
            '.entry-content',
            '#content',
            '#main'
        ];
        
        for (const selector of mainSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                return element;
            }
        }
        
        // Fallback to body
        return doc.body;
    }
    
    /**
     * Process content for extraction
     * 추출을 위한 콘텐츠 처리
     */
    function processContent(element, options) {
        const { includeImages, includeLinks, preserveFormatting } = options;
        
        if (preserveFormatting) {
            return element.innerHTML;
        }
        
        // Remove unwanted elements
        if (!includeImages) {
            const images = element.querySelectorAll('img');
            for (const img of images) {
                img.remove();
            }
        }
        
        if (!includeLinks) {
            const links = element.querySelectorAll('a');
            for (const link of links) {
                // Replace link with its text content
                const text = document.createTextNode(link.textContent);
                link.parentNode.replaceChild(text, link);
            }
        }
        
        return element.textContent.trim();
    }
    
    // Initialize content script
    console.log('PagePouch content script initialized');
    
})();