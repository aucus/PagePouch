// Enhanced Popup Manager for LaterLens Chrome extension
// LaterLens 크롬 확장 프로그램용 향상된 팝업 매니저

class PopupManager {
    constructor() {
        this.pages = [];
        this.filteredPages = [];
        this.currentFilter = 'all';
        this.currentSort = 'date-desc';
        this.searchQuery = '';
        this.selectedPages = new Set();
        this.isLoading = false;
        this.loadedCount = 0;
        this.pageSize = 20;
        
        // Enhanced delete functionality
        this.deletedPages = [];
        this.maxDeletedPages = 50;
        this.deleteMode = false;
        this.bulkDeleteEnabled = false;
        this.undoTimeout = 5000; // 5 seconds to undo
        this.undoTimer = null;
        
        // Enhanced search functionality
        this.searchHistory = [];
        this.maxSearchHistory = 10;
        this.searchSuggestions = [];
        this.isAdvancedSearch = false;
        this.searchFilters = {
            title: true,
            summary: true,
            url: true,
            tags: false
        };
        this.searchDebounceTimer = null;
        this.searchDebounceDelay = 300;
        
        // UI elements cache
        this.elements = {};
        
        // Integration helpers
        this.integration = null;
        this.helpers = null;
        
        this.init();
    }

    /**
     * Initialize the popup manager
     * 팝업 매니저 초기화
     */
    async init() {
        try {
            // Initialize integration first
            this.integration = await initializeIntegration();
            this.helpers = getIntegrationHelpers();
            
            // Setup integration event listeners
            this.setupIntegrationEvents();
            
            this.cacheElements();
            this.bindEvents();
            this.setupKeyboardNavigation();
            this.setupAdvancedSearch();
            await this.loadSearchHistory();
            await this.loadPages();
            this.renderPages();
            this.updateStorageInfo();
        } catch (error) {
            console.error('Failed to initialize popup:', error);
            this.showNotification('Failed to initialize popup', 'error');
        }
    }

    /**
     * Setup integration event listeners
     * 통합 이벤트 리스너 설정
     */
    setupIntegrationEvents() {
        this.integration.on('unhealthy', (data) => {
            console.warn('Background script connection unhealthy');
            this.showNotification('Connection issues detected', 'warning');
        });

        this.integration.on('recovered', (data) => {
            console.log('Background script connection recovered');
            this.showNotification('Connection restored', 'success');
        });

        this.integration.on('recovery-failed', (data) => {
            console.error('Background script recovery failed');
            this.showNotification('Connection failed. Please refresh the extension.', 'error');
        });
    }

    /**
     * Cache DOM elements for better performance
     * 성능 향상을 위한 DOM 요소 캐싱
     */
    cacheElements() {
        this.elements = {
            // Header elements
            saveBtn: document.getElementById('save-current-page'),
            saveBtnEmpty: document.getElementById('save-current-page-empty'),
            optionsBtn: document.getElementById('open-options'),
            syncStatus: document.getElementById('sync-status'),
            
            // Search elements
            searchInput: document.getElementById('search-input'),
            clearSearchBtn: document.getElementById('clear-search'),
            clearSearchEmpty: document.getElementById('clear-search-empty'),
            
            // Filter elements
            filterTabs: document.querySelectorAll('.filter-tab'),
            sortSelect: document.getElementById('sort-select'),
            
            // Content elements
            loading: document.getElementById('loading'),
            emptyState: document.getElementById('empty-state'),
            searchEmptyState: document.getElementById('search-empty-state'),
            pagesGrid: document.getElementById('pages-grid'),
            loadMoreContainer: document.getElementById('load-more-container'),
            loadMoreBtn: document.getElementById('load-more'),
            
            // Footer elements
            pageCount: document.getElementById('page-count'),
            storageInfo: document.getElementById('storage-info'),
            exportBtn: document.getElementById('export-pages'),
            deleteAllBtn: document.getElementById('delete-all'),
            
            // Interactive elements
            notificationToast: document.getElementById('notification-toast'),
            contextMenu: document.getElementById('context-menu'),
            confirmationModal: document.getElementById('confirmation-modal')
        };
    }

    /**
     * Bind event listeners
     * 이벤트 리스너 바인딩
     */
    bindEvents() {
        // Save page buttons
        this.elements.saveBtn?.addEventListener('click', () => this.saveCurrentPage());
        this.elements.saveBtnEmpty?.addEventListener('click', () => this.saveCurrentPage());
        
        // Options button
        this.elements.optionsBtn?.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
        
        // Enhanced search functionality
        this.elements.searchInput?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        this.elements.searchInput?.addEventListener('keydown', (e) => {
            this.handleSearchKeydown(e);
        });
        
        this.elements.searchInput?.addEventListener('focus', () => {
            if (this.elements.searchInput.value) {
                this.updateSearchSuggestions(this.elements.searchInput.value);
            }
        });
        
        this.elements.searchInput?.addEventListener('blur', () => {
            // Delay hiding suggestions to allow for clicks
            setTimeout(() => this.hideSuggestions(), 150);
        });
        
        this.elements.clearSearchBtn?.addEventListener('click', () => {
            this.clearSearch();
        });
        
        this.elements.clearSearchEmpty?.addEventListener('click', () => {
            this.clearSearch();
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-wrapper')) {
                this.hideSuggestions();
            }
        });
        
        // Filter tabs
        this.elements.filterTabs?.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.handleFilterChange(e.target.dataset.filter);
            });
        });
        
        // Sort dropdown
        this.elements.sortSelect?.addEventListener('change', (e) => {
            this.handleSortChange(e.target.value);
        });
        
        // Load more button
        this.elements.loadMoreBtn?.addEventListener('click', () => {
            this.loadMorePages();
        });
        
        // Footer actions
        this.elements.exportBtn?.addEventListener('click', () => {
            this.exportPages();
        });
        
        this.elements.deleteAllBtn?.addEventListener('click', () => {
            this.showDeleteAllConfirmation();
        });
        
        // Context menu
        document.addEventListener('contextmenu', (e) => {
            this.handleContextMenu(e);
        });
        
        document.addEventListener('click', (e) => {
            this.hideContextMenu();
        });
        
        // Modal events
        this.bindModalEvents();
        
        // Toast events
        this.bindToastEvents();
    }

    /**
     * Setup keyboard navigation
     * 키보드 네비게이션 설정
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Escape':
                    this.handleEscape();
                    break;
                case 'Enter':
                    if (e.target.classList.contains('page-item')) {
                        this.openPage(e.target.dataset.pageId);
                    }
                    break;
                case 'Delete':
                case 'Backspace':
                    if (e.target.classList.contains('page-item') && e.ctrlKey) {
                        e.preventDefault();
                        this.deletePage(e.target.dataset.pageId);
                    }
                    break;
                case '/':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.elements.searchInput?.focus();
                    }
                    break;
            }
        });
    }

    /**
     * Load pages from storage
     * 스토리지에서 페이지 로드
     */
    async loadPages() {
        try {
            this.showLoading(true);
            
            const response = await chrome.runtime.sendMessage({
                action: 'getPages'
            });

            if (response.success) {
                this.pages = response.data || [];
                this.applyFiltersAndSort();
                this.updatePageCount();
            } else {
                throw new Error(response.error || 'Failed to load pages');
            }
        } catch (error) {
            console.error('Error loading pages:', error);
            this.showNotification('Failed to load pages', 'error');
            this.pages = [];
            this.filteredPages = [];
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Apply current filters and sorting with enhanced search
     * 향상된 검색을 포함한 현재 필터 및 정렬 적용
     */
    applyFiltersAndSort() {
        let filtered = [...this.pages];
        
        // Apply enhanced search filter
        if (this.searchQuery) {
            filtered = this.performAdvancedSearch(filtered, this.searchQuery);
        }
        
        // Apply category filter
        switch (this.currentFilter) {
            case 'recent':
                const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(page => page.savedAt > weekAgo);
                break;
            case 'favorites':
                filtered = filtered.filter(page => page.isFavorite);
                break;
            // 'all' case doesn't need filtering
        }
        
        // Apply sorting with search relevance
        if (this.searchQuery) {
            filtered = this.sortByRelevance(filtered, this.searchQuery);
        } else {
            filtered.sort((a, b) => {
                switch (this.currentSort) {
                    case 'date-desc':
                        return b.savedAt - a.savedAt;
                    case 'date-asc':
                        return a.savedAt - b.savedAt;
                    case 'title-asc':
                        return a.title.localeCompare(b.title);
                    case 'title-desc':
                        return b.title.localeCompare(a.title);
                    default:
                        return b.savedAt - a.savedAt;
                }
            });
        }
        
        this.filteredPages = filtered;
        this.loadedCount = 0;
    }

    /**
     * Perform advanced search with multiple criteria
     * 다중 기준을 사용한 고급 검색 수행
     */
    performAdvancedSearch(pages, query) {
        const searchTerms = this.parseSearchQuery(query);
        
        return pages.filter(page => {
            return searchTerms.every(term => this.matchesSearchTerm(page, term));
        }).map(page => {
            // Add relevance score for sorting
            page._searchScore = this.calculateRelevanceScore(page, searchTerms);
            return page;
        });
    }

    /**
     * Parse search query into terms and operators
     * 검색 쿼리를 용어와 연산자로 파싱
     */
    parseSearchQuery(query) {
        const terms = [];
        const regex = /(?:"([^"]+)"|(\S+))/g;
        let match;
        
        while ((match = regex.exec(query)) !== null) {
            const term = match[1] || match[2]; // Quoted or unquoted term
            const isExact = !!match[1]; // True if quoted
            const isNegated = term.startsWith('-');
            const cleanTerm = isNegated ? term.slice(1) : term;
            
            if (cleanTerm) {
                terms.push({
                    text: cleanTerm.toLowerCase(),
                    isExact: isExact,
                    isNegated: isNegated,
                    isUrl: this.isUrl(cleanTerm),
                    isTag: cleanTerm.startsWith('#')
                });
            }
        }
        
        return terms.length > 0 ? terms : [{ text: query.toLowerCase(), isExact: false, isNegated: false }];
    }

    /**
     * Check if a page matches a search term
     * 페이지가 검색 용어와 일치하는지 확인
     */
    matchesSearchTerm(page, term) {
        const searchableFields = [];
        
        // Add fields based on search filters
        if (this.searchFilters.title) {
            searchableFields.push(page.title?.toLowerCase() || '');
        }
        if (this.searchFilters.summary) {
            searchableFields.push(page.summary?.toLowerCase() || '');
        }
        if (this.searchFilters.url) {
            searchableFields.push(page.url?.toLowerCase() || '');
        }
        if (this.searchFilters.tags && page.tags) {
            searchableFields.push(page.tags.join(' ').toLowerCase());
        }
        
        const searchText = searchableFields.join(' ');
        
        let matches = false;
        
        if (term.isExact) {
            matches = searchText.includes(term.text);
        } else if (term.isUrl) {
            matches = page.url?.toLowerCase().includes(term.text) || false;
        } else if (term.isTag) {
            const tagName = term.text.slice(1); // Remove #
            matches = page.tags?.some(tag => tag.toLowerCase().includes(tagName)) || false;
        } else {
            // Fuzzy matching for regular terms
            matches = this.fuzzyMatch(searchText, term.text);
        }
        
        return term.isNegated ? !matches : matches;
    }

    /**
     * Perform fuzzy matching
     * 퍼지 매칭 수행
     */
    fuzzyMatch(text, pattern) {
        // Simple fuzzy matching - can be enhanced with more sophisticated algorithms
        if (text.includes(pattern)) {
            return true;
        }
        
        // Check for partial word matches
        const words = text.split(/\s+/);
        return words.some(word => 
            word.includes(pattern) || 
            this.levenshteinDistance(word, pattern) <= Math.floor(pattern.length * 0.3)
        );
    }

    /**
     * Calculate Levenshtein distance for fuzzy matching
     * 퍼지 매칭을 위한 레벤슈타인 거리 계산
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Calculate relevance score for search results
     * 검색 결과의 관련성 점수 계산
     */
    calculateRelevanceScore(page, searchTerms) {
        let score = 0;
        
        searchTerms.forEach(term => {
            if (term.isNegated) return;
            
            const termText = term.text;
            
            // Title matches get highest score
            if (page.title?.toLowerCase().includes(termText)) {
                score += term.isExact ? 10 : 5;
                // Bonus for exact title match
                if (page.title.toLowerCase() === termText) {
                    score += 15;
                }
            }
            
            // Summary matches get medium score
            if (page.summary?.toLowerCase().includes(termText)) {
                score += term.isExact ? 3 : 2;
            }
            
            // URL matches get lower score
            if (page.url?.toLowerCase().includes(termText)) {
                score += 1;
            }
            
            // Tag matches get bonus score
            if (page.tags?.some(tag => tag.toLowerCase().includes(termText))) {
                score += 4;
            }
            
            // Bonus for multiple matches
            const titleMatches = (page.title?.toLowerCase().match(new RegExp(termText, 'g')) || []).length;
            const summaryMatches = (page.summary?.toLowerCase().match(new RegExp(termText, 'g')) || []).length;
            score += (titleMatches + summaryMatches - 1) * 0.5;
        });
        
        // Recency bonus
        const daysSinceCreated = (Date.now() - page.savedAt) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated < 7) {
            score += 2;
        } else if (daysSinceCreated < 30) {
            score += 1;
        }
        
        // Favorite bonus
        if (page.isFavorite) {
            score += 3;
        }
        
        return score;
    }

    /**
     * Sort pages by search relevance
     * 검색 관련성으로 페이지 정렬
     */
    sortByRelevance(pages, query) {
        return pages.sort((a, b) => {
            // Primary sort by relevance score
            const scoreDiff = (b._searchScore || 0) - (a._searchScore || 0);
            if (scoreDiff !== 0) {
                return scoreDiff;
            }
            
            // Secondary sort by date (most recent first)
            return b.savedAt - a.savedAt;
        });
    }

    /**
     * Check if a string is a URL
     * 문자열이 URL인지 확인
     */
    isUrl(str) {
        try {
            new URL(str);
            return true;
        } catch {
            return /^(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/.test(str);
        }
    }

    /**
     * Render pages in the grid
     * 그리드에 페이지 렌더링
     */
    renderPages() {
        if (!this.elements.pagesGrid) return;
        
        // Show appropriate state
        if (this.pages.length === 0) {
            this.showEmptyState();
            return;
        }
        
        if (this.filteredPages.length === 0) {
            this.showSearchEmptyState();
            return;
        }
        
        this.hideEmptyStates();
        
        // Clear existing content
        this.elements.pagesGrid.innerHTML = '';
        this.loadedCount = 0;
        
        // Load initial batch
        this.loadMorePages();
    }

    /**
     * Load more pages (pagination)
     * 더 많은 페이지 로드 (페이지네이션)
     */
    loadMorePages() {
        const startIndex = this.loadedCount;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredPages.length);
        const pagesToLoad = this.filteredPages.slice(startIndex, endIndex);
        
        pagesToLoad.forEach(page => {
            const pageElement = this.createPageElement(page);
            this.elements.pagesGrid.appendChild(pageElement);
        });
        
        this.loadedCount = endIndex;
        
        // Update load more button visibility
        const hasMore = this.loadedCount < this.filteredPages.length;
        this.elements.loadMoreContainer?.classList.toggle('hidden', !hasMore);
        
        // Update page count
        this.updatePageCount();
    }

    /**
     * Create a page element with search highlighting
     * 검색 하이라이팅이 포함된 페이지 요소 생성
     */
    createPageElement(page) {
        const pageElement = document.createElement('div');
        pageElement.className = 'page-item';
        pageElement.dataset.pageId = page.id;
        pageElement.tabIndex = 0;
        pageElement.setAttribute('role', 'button');
        pageElement.setAttribute('aria-label', `Open ${page.title}`);
        
        // Add relevance score class for visual indication
        if (page._searchScore > 0) {
            const scoreClass = page._searchScore > 10 ? 'high-relevance' : 
                              page._searchScore > 5 ? 'medium-relevance' : 'low-relevance';
            pageElement.classList.add(scoreClass);
        }
        
        // Format date
        const date = new Date(page.savedAt);
        const formattedDate = this.formatDate(date);
        
        // Create thumbnail
        const thumbnailHtml = page.thumbnail ? 
            `<img src="${page.thumbnail}" alt="Page thumbnail" loading="lazy">` :
            `<div class="page-thumbnail-placeholder">📄</div>`;
        
        // Create summary info
        const summaryInfo = this.createSummaryInfo(page);
        
        // Apply search highlighting
        const highlightedTitle = this.highlightSearchTerms(page.title, this.searchQuery);
        const highlightedSummary = this.highlightSearchTerms(page.summary, this.searchQuery);
        
        pageElement.innerHTML = `
            <div class="page-thumbnail">
                ${thumbnailHtml}
                <button class="page-favorite ${page.isFavorite ? 'active' : ''}" 
                        data-page-id="${page.id}" 
                        title="${page.isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
                        aria-label="${page.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                    ${page.isFavorite ? '★' : '☆'}
                </button>
                ${page._searchScore > 0 ? `<div class="relevance-badge" title="Relevance score: ${page._searchScore.toFixed(1)}">${page._searchScore.toFixed(1)}</div>` : ''}
            </div>
            <div class="page-content">
                <h3 class="page-title" title="${this.escapeHtml(page.title)}">
                    ${highlightedTitle}
                </h3>
                <p class="page-summary" title="${this.escapeHtml(page.summary)}">
                    ${highlightedSummary}
                </p>
                ${summaryInfo}
                <div class="page-meta">
                    <span class="page-date" title="Saved on ${date.toLocaleString()}">
                        ${formattedDate}
                    </span>
                    <div class="page-actions">
                        <button class="page-action-btn" 
                                data-action="open" 
                                data-page-id="${page.id}"
                                title="Open page"
                                aria-label="Open page">
                            🔗
                        </button>
                        <button class="page-action-btn" 
                                data-action="delete" 
                                data-page-id="${page.id}"
                                title="Delete page"
                                aria-label="Delete page">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Bind events
        this.bindPageElementEvents(pageElement, page);
        
        return pageElement;
    }

    /**
     * Highlight search terms in text
     * 텍스트에서 검색 용어 하이라이팅
     */
    highlightSearchTerms(text, query) {
        if (!text || !query) {
            return this.escapeHtml(text || '');
        }
        
        const searchTerms = this.parseSearchQuery(query);
        let highlightedText = this.escapeHtml(text);
        
        // Sort terms by length (longest first) to avoid partial replacements
        const sortedTerms = searchTerms
            .filter(term => !term.isNegated)
            .sort((a, b) => b.text.length - a.text.length);
        
        sortedTerms.forEach(term => {
            if (term.text.length < 2) return; // Skip very short terms
            
            const regex = new RegExp(`(${this.escapeRegex(term.text)})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
        });
        
        return highlightedText;
    }

    /**
     * Escape special regex characters
     * 특수 정규식 문자 이스케이프
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Create summary info element
     * 요약 정보 요소 생성
     */
    createSummaryInfo(page) {
        if (!page.summaryMetadata) return '';
        
        const metadata = page.summaryMetadata;
        let className = 'summary-info';
        let text = '';
        
        switch (metadata.method) {
            case 'ai_generated':
                className += ' ai-generated';
                text = `AI (${metadata.provider})`;
                break;
            case 'fallback':
                className += ' fallback';
                text = 'Fallback';
                break;
            case 'disabled':
                className += ' disabled';
                text = 'AI Off';
                break;
            case 'error':
                className += ' error';
                text = 'Error';
                break;
            default:
                return '';
        }
        
        return `<div class="${className}" title="${metadata.reason || ''}">${text}</div>`;
    }

    /**
     * Bind events to page element
     * 페이지 요소에 이벤트 바인딩
     */
    bindPageElementEvents(pageElement, page) {
        // Click to open page
        pageElement.addEventListener('click', (e) => {
            if (e.target.closest('.page-favorite') || e.target.closest('.page-action-btn')) {
                return; // Don't open page if clicking on action buttons
            }
            this.openPage(page.id);
        });
        
        // Favorite button
        const favoriteBtn = pageElement.querySelector('.page-favorite');
        favoriteBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(page.id);
        });
        
        // Action buttons
        const actionBtns = pageElement.querySelectorAll('.page-action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const pageId = btn.dataset.pageId;
                
                switch (action) {
                    case 'open':
                        this.openPage(pageId);
                        break;
                    case 'delete':
                        this.showDeleteConfirmation(pageId);
                        break;
                }
            });
        });
        
        // Keyboard navigation
        pageElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openPage(page.id);
            }
        });
    }

    /**
     * Save current page
     * 현재 페이지 저장
     */
    async saveCurrentPage() {
        try {
            this.showLoading(true);
            this.showNotification('Saving page...', 'info');
            
            // Get current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }
            
            // Send message to background script to save the page
            const response = await chrome.runtime.sendMessage({
                action: 'savePage',
                tabId: tab.id,
                data: {
                    url: tab.url,
                    title: tab.title
                }
            });

            if (response.success) {
                await this.loadPages();
                this.renderPages();
                
                // Show success notification with summary info
                const summaryInfo = this.getSummaryStatusMessage(response.data);
                this.showNotification(`Page saved successfully! ${summaryInfo}`, 'success');
            } else {
                throw new Error(response.error || 'Failed to save page');
            }
        } catch (error) {
            console.error('Error saving page:', error);
            this.showNotification(`Failed to save page: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Open a saved page
     * 저장된 페이지 열기
     */
    async openPage(pageId, newTab = false) {
        try {
            const page = this.pages.find(p => p.id === pageId);
            if (!page) {
                throw new Error('Page not found');
            }
            
            if (newTab) {
                await chrome.tabs.create({ url: page.url });
            } else {
                await chrome.tabs.update({ url: page.url });
                window.close();
            }
        } catch (error) {
            console.error('Error opening page:', error);
            this.showNotification('Failed to open page', 'error');
        }
    }

    /**
     * Toggle favorite status
     * 즐겨찾기 상태 토글
     */
    async toggleFavorite(pageId) {
        try {
            const page = this.pages.find(p => p.id === pageId);
            if (!page) return;
            
            page.isFavorite = !page.isFavorite;
            
            // Update in storage (this would need to be implemented in background.js)
            const response = await chrome.runtime.sendMessage({
                action: 'updatePage',
                data: { id: pageId, isFavorite: page.isFavorite }
            });
            
            if (response.success) {
                // Update UI
                const pageElement = document.querySelector(`[data-page-id="${pageId}"]`);
                const favoriteBtn = pageElement?.querySelector('.page-favorite');
                if (favoriteBtn) {
                    favoriteBtn.classList.toggle('active', page.isFavorite);
                    favoriteBtn.textContent = page.isFavorite ? '★' : '☆';
                    favoriteBtn.title = page.isFavorite ? 'Remove from favorites' : 'Add to favorites';
                }
                
                // Re-apply filters if needed
                if (this.currentFilter === 'favorites') {
                    this.applyFiltersAndSort();
                    this.renderPages();
                }
                
                this.showNotification(
                    page.isFavorite ? 'Added to favorites' : 'Removed from favorites',
                    'success'
                );
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            this.showNotification('Failed to update favorite', 'error');
        }
    }

    /**
     * Delete a page with enhanced functionality
     * 향상된 기능으로 페이지 삭제
     */
    async deletePage(pageId, options = {}) {
        try {
            const page = this.pages.find(p => p.id === pageId);
            if (!page) {
                throw new Error('Page not found');
            }

            // Store for potential undo
            const deletedPage = {
                ...page,
                deletedAt: Date.now(),
                canUndo: !options.permanent
            };

            const response = await chrome.runtime.sendMessage({
                action: 'deletePage',
                data: { 
                    id: pageId,
                    permanent: options.permanent || false
                }
            });

            if (response.success) {
                // Remove from local arrays
                this.pages = this.pages.filter(p => p.id !== pageId);
                this.selectedPages.delete(pageId);
                
                // Add to deleted pages for undo functionality
                if (!options.permanent) {
                    this.addToDeletedPages(deletedPage);
                }
                
                this.applyFiltersAndSort();
                this.renderPages();
                this.updateSelectionUI();
                
                // Show notification with undo option
                if (!options.permanent && !options.silent) {
                    this.showDeleteNotification(page.title, pageId);
                } else if (!options.silent) {
                    this.showNotification('Page permanently deleted', 'success');
                }
            } else {
                throw new Error(response.error || 'Failed to delete page');
            }
        } catch (error) {
            console.error('Error deleting page:', error);
            this.showNotification('Failed to delete page', 'error');
        }
    }

    /**
     * Delete multiple pages
     * 여러 페이지 삭제
     */
    async deleteMultiplePages(pageIds, options = {}) {
        if (!pageIds || pageIds.length === 0) {
            return;
        }

        try {
            this.showLoading(true);
            
            const pages = pageIds.map(id => this.pages.find(p => p.id === id)).filter(Boolean);
            const deletedPages = [];
            const failedDeletes = [];

            // Delete pages one by one to handle individual failures
            for (const page of pages) {
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: 'deletePage',
                        data: { 
                            id: page.id,
                            permanent: options.permanent || false
                        }
                    });

                    if (response.success) {
                        deletedPages.push({
                            ...page,
                            deletedAt: Date.now(),
                            canUndo: !options.permanent
                        });
                    } else {
                        failedDeletes.push(page.title);
                    }
                } catch (error) {
                    failedDeletes.push(page.title);
                }
            }

            // Update local state
            const deletedIds = deletedPages.map(p => p.id);
            this.pages = this.pages.filter(p => !deletedIds.includes(p.id));
            deletedIds.forEach(id => this.selectedPages.delete(id));

            // Add to deleted pages for undo
            if (!options.permanent) {
                deletedPages.forEach(page => this.addToDeletedPages(page));
            }

            this.applyFiltersAndSort();
            this.renderPages();
            this.updateSelectionUI();

            // Show results
            if (deletedPages.length > 0) {
                const message = `${deletedPages.length} page${deletedPages.length > 1 ? 's' : ''} deleted`;
                if (!options.permanent && !options.silent) {
                    this.showBulkDeleteNotification(deletedPages.length);
                } else if (!options.silent) {
                    this.showNotification(message, 'success');
                }
            }

            if (failedDeletes.length > 0) {
                this.showNotification(`Failed to delete ${failedDeletes.length} page(s)`, 'error');
            }

        } catch (error) {
            console.error('Error deleting multiple pages:', error);
            this.showNotification('Failed to delete pages', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Add page to deleted pages list for undo functionality
     * 실행 취소 기능을 위해 삭제된 페이지 목록에 추가
     */
    addToDeletedPages(deletedPage) {
        this.deletedPages.unshift(deletedPage);
        
        // Keep only the most recent deleted pages
        if (this.deletedPages.length > this.maxDeletedPages) {
            this.deletedPages = this.deletedPages.slice(0, this.maxDeletedPages);
        }
        
        // Save to storage for persistence
        this.saveDeletedPages();
    }

    /**
     * Undo page deletion
     * 페이지 삭제 실행 취소
     */
    async undoDelete(pageId) {
        try {
            const deletedPageIndex = this.deletedPages.findIndex(p => p.id === pageId);
            if (deletedPageIndex === -1) {
                throw new Error('Deleted page not found');
            }

            const deletedPage = this.deletedPages[deletedPageIndex];
            
            // Remove deletion timestamp and undo flag
            const { deletedAt, canUndo, ...restoredPage } = deletedPage;

            // Restore page via background script
            const response = await chrome.runtime.sendMessage({
                action: 'restorePage',
                data: restoredPage
            });

            if (response.success) {
                // Add back to local arrays
                this.pages.push(restoredPage);
                
                // Remove from deleted pages
                this.deletedPages.splice(deletedPageIndex, 1);
                
                this.applyFiltersAndSort();
                this.renderPages();
                
                this.showNotification('Page restored successfully', 'success');
                this.saveDeletedPages();
            } else {
                throw new Error(response.error || 'Failed to restore page');
            }
        } catch (error) {
            console.error('Error undoing delete:', error);
            this.showNotification('Failed to restore page', 'error');
        }
    }

    /**
     * Undo multiple page deletions
     * 여러 페이지 삭제 실행 취소
     */
    async undoBulkDelete(count) {
        try {
            const pagesToRestore = this.deletedPages.slice(0, count);
            const restoredPages = [];
            const failedRestores = [];

            for (const deletedPage of pagesToRestore) {
                try {
                    const { deletedAt, canUndo, ...restoredPage } = deletedPage;
                    
                    const response = await chrome.runtime.sendMessage({
                        action: 'restorePage',
                        data: restoredPage
                    });

                    if (response.success) {
                        restoredPages.push(restoredPage);
                    } else {
                        failedRestores.push(deletedPage.title);
                    }
                } catch (error) {
                    failedRestores.push(deletedPage.title);
                }
            }

            // Update local state
            this.pages.push(...restoredPages);
            this.deletedPages = this.deletedPages.slice(count);

            this.applyFiltersAndSort();
            this.renderPages();

            if (restoredPages.length > 0) {
                this.showNotification(`${restoredPages.length} page(s) restored`, 'success');
            }

            if (failedRestores.length > 0) {
                this.showNotification(`Failed to restore ${failedRestores.length} page(s)`, 'error');
            }

            this.saveDeletedPages();
        } catch (error) {
            console.error('Error undoing bulk delete:', error);
            this.showNotification('Failed to restore pages', 'error');
        }
    }

    /**
     * Toggle delete mode for bulk operations
     * 대량 작업을 위한 삭제 모드 토글
     */
    toggleDeleteMode() {
        this.deleteMode = !this.deleteMode;
        
        // Update UI
        document.body.classList.toggle('delete-mode', this.deleteMode);
        
        // Clear selections when exiting delete mode
        if (!this.deleteMode) {
            this.selectedPages.clear();
            this.updateSelectionUI();
        }
        
        // Update page elements
        this.renderPages();
        
        // Show/hide bulk action buttons
        this.updateBulkActionButtons();
    }

    /**
     * Toggle page selection
     * 페이지 선택 토글
     */
    togglePageSelection(pageId) {
        if (this.selectedPages.has(pageId)) {
            this.selectedPages.delete(pageId);
        } else {
            this.selectedPages.add(pageId);
        }
        
        this.updateSelectionUI();
        this.updateBulkActionButtons();
    }

    /**
     * Select all visible pages
     * 표시된 모든 페이지 선택
     */
    selectAllPages() {
        this.filteredPages.forEach(page => {
            this.selectedPages.add(page.id);
        });
        
        this.updateSelectionUI();
        this.updateBulkActionButtons();
    }

    /**
     * Clear all selections
     * 모든 선택 해제
     */
    clearSelection() {
        this.selectedPages.clear();
        this.updateSelectionUI();
        this.updateBulkActionButtons();
    }

    /**
     * Update selection UI
     * 선택 UI 업데이트
     */
    updateSelectionUI() {
        const pageElements = document.querySelectorAll('.page-item');
        pageElements.forEach(element => {
            const pageId = element.dataset.pageId;
            const checkbox = element.querySelector('.page-checkbox');
            
            if (checkbox) {
                checkbox.checked = this.selectedPages.has(pageId);
            }
            
            element.classList.toggle('selected', this.selectedPages.has(pageId));
        });
        
        // Update selection count
        const selectionCount = document.getElementById('selection-count');
        if (selectionCount) {
            selectionCount.textContent = `${this.selectedPages.size} selected`;
        }
    }

    /**
     * Update bulk action buttons
     * 대량 작업 버튼 업데이트
     */
    updateBulkActionButtons() {
        const bulkActions = document.getElementById('bulk-actions');
        const hasSelection = this.selectedPages.size > 0;
        
        if (bulkActions) {
            bulkActions.classList.toggle('hidden', !hasSelection);
        }
        
        // Update button states
        const deleteSelectedBtn = document.getElementById('delete-selected');
        const selectAllBtn = document.getElementById('select-all');
        const clearSelectionBtn = document.getElementById('clear-selection');
        
        if (deleteSelectedBtn) {
            deleteSelectedBtn.disabled = !hasSelection;
        }
        
        if (selectAllBtn) {
            selectAllBtn.textContent = this.selectedPages.size === this.filteredPages.length ? 
                'Deselect All' : 'Select All';
        }
        
        if (clearSelectionBtn) {
            clearSelectionBtn.disabled = !hasSelection;
        }
    }

    /**
     * Delete all pages
     * 모든 페이지 삭제
     */
    async deleteAllPages() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'clearAll'
            });

            if (response.success) {
                this.pages = [];
                this.filteredPages = [];
                this.renderPages();
                this.showNotification('All pages deleted successfully', 'success');
            } else {
                throw new Error(response.error || 'Failed to delete all pages');
            }
        } catch (error) {
            console.error('Error deleting all pages:', error);
            this.showNotification('Failed to delete all pages', 'error');
        }
    }

    /**
     * Handle search input with debouncing and suggestions
     * 디바운싱과 제안 기능이 포함된 검색 입력 처리
     */
    handleSearch(query) {
        // Clear previous debounce timer
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        
        // Update search query immediately for UI feedback
        this.searchQuery = query.trim();
        
        // Show/hide clear button
        this.elements.clearSearchBtn?.classList.toggle('hidden', !this.searchQuery);
        
        // Generate search suggestions
        this.updateSearchSuggestions(query);
        
        // Debounce the actual search
        this.searchDebounceTimer = setTimeout(() => {
            this.performSearch(this.searchQuery);
        }, this.searchDebounceDelay);
    }

    /**
     * Perform the actual search
     * 실제 검색 수행
     */
    performSearch(query) {
        // Add to search history if not empty and not duplicate
        if (query && !this.searchHistory.includes(query)) {
            this.searchHistory.unshift(query);
            if (this.searchHistory.length > this.maxSearchHistory) {
                this.searchHistory = this.searchHistory.slice(0, this.maxSearchHistory);
            }
            this.saveSearchHistory();
        }
        
        // Apply filters and re-render
        this.applyFiltersAndSort();
        this.renderPages();
        
        // Update search analytics
        this.trackSearchAnalytics(query);
    }

    /**
     * Update search suggestions based on input
     * 입력을 기반으로 검색 제안 업데이트
     */
    updateSearchSuggestions(query) {
        if (!query || query.length < 2) {
            this.hideSuggestions();
            return;
        }
        
        const suggestions = this.generateSearchSuggestions(query);
        this.showSuggestions(suggestions);
    }

    /**
     * Generate search suggestions
     * 검색 제안 생성
     */
    generateSearchSuggestions(query) {
        const suggestions = new Set();
        const queryLower = query.toLowerCase();
        
        // Add suggestions from search history
        this.searchHistory.forEach(historyItem => {
            if (historyItem.toLowerCase().includes(queryLower) && historyItem !== query) {
                suggestions.add({
                    text: historyItem,
                    type: 'history',
                    icon: '🕒'
                });
            }
        });
        
        // Add suggestions from page titles
        this.pages.forEach(page => {
            const title = page.title.toLowerCase();
            if (title.includes(queryLower) && !suggestions.has(page.title)) {
                // Extract relevant part of title
                const words = page.title.split(/\s+/);
                const relevantWords = words.filter(word => 
                    word.toLowerCase().includes(queryLower)
                );
                
                if (relevantWords.length > 0) {
                    suggestions.add({
                        text: relevantWords[0],
                        type: 'title',
                        icon: '📄',
                        fullTitle: page.title
                    });
                }
            }
        });
        
        // Add suggestions from URLs (domains)
        this.pages.forEach(page => {
            try {
                const url = new URL(page.url);
                const domain = url.hostname.replace('www.', '');
                if (domain.includes(queryLower) && domain !== queryLower) {
                    suggestions.add({
                        text: `site:${domain}`,
                        type: 'domain',
                        icon: '🌐',
                        description: `Search in ${domain}`
                    });
                }
            } catch (e) {
                // Invalid URL, skip
            }
        });
        
        // Add search operators as suggestions
        if (queryLower.length > 2) {
            const operators = [
                { text: `"${query}"`, type: 'operator', icon: '🔍', description: 'Exact phrase' },
                { text: `title:${query}`, type: 'operator', icon: '📝', description: 'Search in titles only' },
                { text: `-${query}`, type: 'operator', icon: '🚫', description: 'Exclude this term' }
            ];
            
            operators.forEach(op => suggestions.add(op));
        }
        
        return Array.from(suggestions).slice(0, 8); // Limit to 8 suggestions
    }

    /**
     * Show search suggestions
     * 검색 제안 표시
     */
    showSuggestions(suggestions) {
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        let suggestionsContainer = document.getElementById('search-suggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'search-suggestions';
            suggestionsContainer.className = 'search-suggestions';
            this.elements.searchInput.parentNode.appendChild(suggestionsContainer);
        }
        
        suggestionsContainer.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-suggestion="${this.escapeHtml(suggestion.text)}" data-index="${index}">
                <span class="suggestion-icon">${suggestion.icon}</span>
                <div class="suggestion-content">
                    <div class="suggestion-text">${this.escapeHtml(suggestion.text)}</div>
                    ${suggestion.description ? `<div class="suggestion-description">${this.escapeHtml(suggestion.description)}</div>` : ''}
                </div>
                <span class="suggestion-type">${suggestion.type}</span>
            </div>
        `).join('');
        
        suggestionsContainer.classList.remove('hidden');
        
        // Bind suggestion click events
        this.bindSuggestionEvents(suggestionsContainer);
    }

    /**
     * Hide search suggestions
     * 검색 제안 숨기기
     */
    hideSuggestions() {
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.add('hidden');
        }
    }

    /**
     * Bind suggestion events
     * 제안 이벤트 바인딩
     */
    bindSuggestionEvents(container) {
        const suggestionItems = container.querySelectorAll('.suggestion-item');
        
        suggestionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const suggestionText = item.dataset.suggestion;
                this.applySuggestion(suggestionText);
            });
            
            item.addEventListener('mouseenter', () => {
                suggestionItems.forEach(i => i.classList.remove('highlighted'));
                item.classList.add('highlighted');
            });
        });
    }

    /**
     * Apply selected suggestion
     * 선택된 제안 적용
     */
    applySuggestion(suggestionText) {
        this.elements.searchInput.value = suggestionText;
        this.handleSearch(suggestionText);
        this.hideSuggestions();
        this.elements.searchInput.focus();
    }

    /**
     * Save search history to storage
     * 검색 히스토리를 스토리지에 저장
     */
    async saveSearchHistory() {
        try {
            await chrome.storage.local.set({
                searchHistory: this.searchHistory
            });
        } catch (error) {
            console.error('Failed to save search history:', error);
        }
    }

    /**
     * Load search history from storage
     * 스토리지에서 검색 히스토리 로드
     */
    async loadSearchHistory() {
        try {
            const result = await chrome.storage.local.get(['searchHistory']);
            this.searchHistory = result.searchHistory || [];
        } catch (error) {
            console.error('Failed to load search history:', error);
            this.searchHistory = [];
        }
    }

    /**
     * Track search analytics
     * 검색 분석 추적
     */
    trackSearchAnalytics(query) {
        if (!query) return;
        
        const analytics = {
            query: query,
            timestamp: Date.now(),
            resultsCount: this.filteredPages.length,
            totalPages: this.pages.length
        };
        
        // Store analytics (could be sent to analytics service)
        console.log('Search analytics:', analytics);
    }

    /**
     * Clear search
     * 검색 지우기
     */
    clearSearch() {
        this.elements.searchInput.value = '';
        this.handleSearch('');
    }

    /**
     * Handle filter change
     * 필터 변경 처리
     */
    handleFilterChange(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        this.elements.filterTabs?.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        
        // Apply filters and re-render
        this.applyFiltersAndSort();
        this.renderPages();
    }

    /**
     * Handle sort change
     * 정렬 변경 처리
     */
    handleSortChange(sort) {
        this.currentSort = sort;
        
        // Apply filters and re-render
        this.applyFiltersAndSort();
        this.renderPages();
    }

    /**
     * Export pages
     * 페이지 내보내기
     */
    async exportPages() {
        try {
            const exportData = {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                pages: this.pages.map(page => ({
                    title: page.title,
                    url: page.url,
                    summary: page.summary,
                    savedAt: page.savedAt,
                    isFavorite: page.isFavorite
                }))
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `laterlens-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            
            this.showNotification('Pages exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting pages:', error);
            this.showNotification('Failed to export pages', 'error');
        }
    }

    // UI State Management Methods
    
    /**
     * Show loading state
     * 로딩 상태 표시
     */
    showLoading(show) {
        this.isLoading = show;
        this.elements.loading?.classList.toggle('hidden', !show);
        
        if (show) {
            this.hideEmptyStates();
        }
    }

    /**
     * Show empty state
     * 빈 상태 표시
     */
    showEmptyState() {
        this.elements.emptyState?.classList.remove('hidden');
        this.elements.searchEmptyState?.classList.add('hidden');
        this.elements.pagesGrid?.classList.add('hidden');
        this.elements.loadMoreContainer?.classList.add('hidden');
    }

    /**
     * Show search empty state
     * 검색 결과 없음 상태 표시
     */
    showSearchEmptyState() {
        this.elements.searchEmptyState?.classList.remove('hidden');
        this.elements.emptyState?.classList.add('hidden');
        this.elements.pagesGrid?.classList.add('hidden');
        this.elements.loadMoreContainer?.classList.add('hidden');
    }

    /**
     * Hide empty states
     * 빈 상태 숨기기
     */
    hideEmptyStates() {
        this.elements.emptyState?.classList.add('hidden');
        this.elements.searchEmptyState?.classList.add('hidden');
        this.elements.pagesGrid?.classList.remove('hidden');
    }

    /**
     * Update page count display
     * 페이지 수 표시 업데이트
     */
    updatePageCount() {
        const total = this.pages.length;
        const filtered = this.filteredPages.length;
        const loaded = this.loadedCount;
        
        let text = '';
        if (this.searchQuery || this.currentFilter !== 'all') {
            text = `${loaded} of ${filtered} pages (${total} total)`;
        } else {
            text = `${loaded} of ${total} pages`;
        }
        
        if (this.elements.pageCount) {
            this.elements.pageCount.textContent = text;
        }
    }

    /**
     * Update storage info
     * 스토리지 정보 업데이트
     */
    async updateStorageInfo() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getStorageInfo'
            });
            
            if (response.success && this.elements.storageInfo) {
                const { used, total } = response.data;
                const percentage = Math.round((used / total) * 100);
                this.elements.storageInfo.textContent = `${percentage}% used`;
                
                if (percentage > 90) {
                    this.elements.storageInfo.style.color = 'var(--danger-color)';
                } else if (percentage > 75) {
                    this.elements.storageInfo.style.color = 'var(--warning-color)';
                }
            }
        } catch (error) {
            console.error('Error updating storage info:', error);
        }
    }

    // Utility Methods
    
    /**
     * Format date for display
     * 표시용 날짜 형식화
     */
    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        
        // Less than 1 minute
        if (diff < 60000) {
            return 'Just now';
        }
        
        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }
        
        // Less than 1 day
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }
        
        // Less than 1 week
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days}d ago`;
        }
        
        // More than 1 week
        return date.toLocaleDateString();
    }

    /**
     * Escape HTML to prevent XSS
     * XSS 방지를 위한 HTML 이스케이프
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get summary status message
     * 요약 상태 메시지 가져오기
     */
    getSummaryStatusMessage(pageData) {
        if (!pageData || !pageData.summaryMetadata) {
            return '';
        }

        const metadata = pageData.summaryMetadata;
        
        switch (metadata.method) {
            case 'ai_generated':
                return `AI summary generated (${metadata.provider})`;
            case 'fallback':
                return 'AI summary failed, using fallback';
            case 'disabled':
                return 'AI summary disabled';
            case 'unconfigured':
                return 'AI setup required';
            case 'content_too_short':
                return 'Content too short for summary';
            case 'error':
                return 'AI summary error occurred';
            default:
                return '';
        }
    }

    // Event Handlers for Interactive Elements
    
    /**
     * Handle context menu
     * 컨텍스트 메뉴 처리
     */
    handleContextMenu(e) {
        const pageItem = e.target.closest('.page-item');
        if (!pageItem) return;
        
        e.preventDefault();
        
        const pageId = pageItem.dataset.pageId;
        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;
        
        this.showContextMenu(e.clientX, e.clientY, page);
    }

    /**
     * Show context menu
     * 컨텍스트 메뉴 표시
     */
    showContextMenu(x, y, page) {
        if (!this.elements.contextMenu) return;
        
        // Update menu items based on page
        const favoriteItem = this.elements.contextMenu.querySelector('[data-action="favorite"]');
        if (favoriteItem) {
            favoriteItem.innerHTML = `
                <span class="icon">${page.isFavorite ? '★' : '☆'}</span>
                ${page.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            `;
        }
        
        // Position and show menu
        this.elements.contextMenu.style.left = `${x}px`;
        this.elements.contextMenu.style.top = `${y}px`;
        this.elements.contextMenu.classList.remove('hidden');
        this.elements.contextMenu.dataset.pageId = page.id;
        
        // Bind menu item events
        this.bindContextMenuEvents();
    }

    /**
     * Hide context menu
     * 컨텍스트 메뉴 숨기기
     */
    hideContextMenu() {
        this.elements.contextMenu?.classList.add('hidden');
    }

    /**
     * Bind context menu events
     * 컨텍스트 메뉴 이벤트 바인딩
     */
    bindContextMenuEvents() {
        const menuItems = this.elements.contextMenu?.querySelectorAll('.context-menu-item');
        menuItems?.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                const pageId = this.elements.contextMenu.dataset.pageId;
                
                this.handleContextMenuAction(action, pageId);
                this.hideContextMenu();
            });
        });
    }

    /**
     * Handle context menu actions
     * 컨텍스트 메뉴 액션 처리
     */
    async handleContextMenuAction(action, pageId) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;
        
        switch (action) {
            case 'open':
                await this.openPage(pageId);
                break;
            case 'open-new-tab':
                await this.openPage(pageId, true);
                break;
            case 'favorite':
                await this.toggleFavorite(pageId);
                break;
            case 'copy-url':
                await this.copyToClipboard(page.url);
                this.showNotification('URL copied to clipboard', 'success');
                break;
            case 'delete':
                this.showDeleteConfirmation(pageId);
                break;
        }
    }

    /**
     * Copy text to clipboard
     * 클립보드에 텍스트 복사
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    /**
     * Handle escape key
     * ESC 키 처리
     */
    handleEscape() {
        if (!this.elements.contextMenu?.classList.contains('hidden')) {
            this.hideContextMenu();
        } else if (!this.elements.confirmationModal?.classList.contains('hidden')) {
            this.hideModal();
        } else if (!this.elements.notificationToast?.classList.contains('hidden')) {
            this.hideNotification();
        } else if (this.elements.searchInput?.value) {
            this.clearSearch();
        }
    }

    // Modal and Toast Management
    
    /**
     * Bind modal events
     * 모달 이벤트 바인딩
     */
    bindModalEvents() {
        const modal = this.elements.confirmationModal;
        if (!modal) return;
        
        const backdrop = modal.querySelector('.modal-backdrop');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const confirmBtn = modal.querySelector('.modal-confirm');
        
        backdrop?.addEventListener('click', () => this.hideModal());
        closeBtn?.addEventListener('click', () => this.hideModal());
        cancelBtn?.addEventListener('click', () => this.hideModal());
        confirmBtn?.addEventListener('click', () => this.handleModalConfirm());
    }

    /**
     * Show delete confirmation
     * 삭제 확인 표시
     */
    showDeleteConfirmation(pageId) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;
        
        this.showModal(
            'Delete Page',
            `Are you sure you want to delete "${page.title}"? This action cannot be undone.`,
            'Delete',
            () => this.deletePage(pageId)
        );
    }

    /**
     * Show delete all confirmation
     * 모두 삭제 확인 표시
     */
    showDeleteAllConfirmation() {
        this.showModal(
            'Delete All Pages',
            `Are you sure you want to delete all ${this.pages.length} saved pages? This action cannot be undone.`,
            'Delete All',
            () => this.deleteAllPages()
        );
    }

    /**
     * Show modal
     * 모달 표시
     */
    showModal(title, message, confirmText, confirmAction) {
        const modal = this.elements.confirmationModal;
        if (!modal) return;
        
        const titleEl = modal.querySelector('.modal-title');
        const messageEl = modal.querySelector('.modal-message');
        const confirmBtn = modal.querySelector('.modal-confirm');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (confirmBtn) confirmBtn.textContent = confirmText;
        
        modal.classList.remove('hidden');
        modal.dataset.confirmAction = 'custom';
        this.modalConfirmAction = confirmAction;
    }

    /**
     * Hide modal
     * 모달 숨기기
     */
    hideModal() {
        this.elements.confirmationModal?.classList.add('hidden');
        this.modalConfirmAction = null;
    }

    /**
     * Handle modal confirm
     * 모달 확인 처리
     */
    handleModalConfirm() {
        if (this.modalConfirmAction) {
            this.modalConfirmAction();
        }
        this.hideModal();
    }

    /**
     * Bind toast events
     * 토스트 이벤트 바인딩
     */
    bindToastEvents() {
        const closeBtn = this.elements.notificationToast?.querySelector('.toast-close');
        closeBtn?.addEventListener('click', () => this.hideNotification());
    }

    /**
     * Show notification
     * 알림 표시
     */
    showNotification(message, type = 'info') {
        const toast = this.elements.notificationToast;
        if (!toast) return;
        
        const icon = toast.querySelector('.toast-icon');
        const messageEl = toast.querySelector('.toast-message');
        
        // Set icon based on type
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        if (icon) icon.textContent = icons[type] || icons.info;
        if (messageEl) messageEl.textContent = message;
        
        // Show toast
        toast.classList.remove('hidden');
        toast.className = `notification-toast ${type}`;
        
        // Auto-hide after 5 seconds
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    /**
     * Hide notification
     * 알림 숨기기
     */
    hideNotification() {
        this.elements.notificationToast?.classList.add('hidden');
        clearTimeout(this.notificationTimeout);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});
