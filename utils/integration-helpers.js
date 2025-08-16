// Integration helpers for component communication
// 컴포넌트 통신을 위한 통합 헬퍼

/**
 * Enhanced message sender with retry logic and error handling
 * 재시도 로직과 오류 처리가 포함된 향상된 메시지 발송기
 */
class MessageSender {
    constructor() {
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.timeout = 10000;
    }

    /**
     * Send message to background script with retry logic
     * 재시도 로직을 포함한 백그라운드 스크립트로 메시지 전송
     */
    async sendMessage(action, data = {}, options = {}) {
        const message = {
            action,
            data,
            timestamp: Date.now(),
            requestId: this.generateRequestId()
        };

        const maxAttempts = options.retryAttempts || this.retryAttempts;
        const delay = options.retryDelay || this.retryDelay;
        const timeout = options.timeout || this.timeout;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`[${message.requestId}] Sending message (attempt ${attempt}):`, action);
                
                const response = await this.sendWithTimeout(message, timeout);
                
                if (response && response.success !== false) {
                    console.log(`[${message.requestId}] Message successful:`, response);
                    return response;
                } else {
                    throw new Error(response?.error || 'Unknown error');
                }
                
            } catch (error) {
                console.warn(`[${message.requestId}] Attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxAttempts) {
                    throw new Error(`Failed after ${maxAttempts} attempts: ${error.message}`);
                }
                
                // Wait before retry
                await this.delay(delay * attempt);
            }
        }
    }

    /**
     * Send message with timeout
     * 타임아웃이 있는 메시지 전송
     */
    sendWithTimeout(message, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Message timeout'));
            }, timeout);

            try {
                chrome.runtime.sendMessage(message, (response) => {
                    clearTimeout(timer);
                    
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    /**
     * Generate unique request ID
     * 고유 요청 ID 생성
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Delay utility
     * 지연 유틸리티
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Component integration manager
 * 컴포넌트 통합 관리자
 */
class ComponentIntegration {
    constructor() {
        this.messageSender = new MessageSender();
        this.eventListeners = new Map();
        this.healthCheckInterval = null;
        this.isHealthy = true;
        this.lastHealthCheck = null;
    }

    /**
     * Initialize component integration
     * 컴포넌트 통합 초기화
     */
    async initialize() {
        try {
            // Test background script connection
            await this.testConnection();
            
            // Start health monitoring
            this.startHealthMonitoring();
            
            // Setup error handlers
            this.setupErrorHandlers();
            
            console.log('Component integration initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Component integration initialization failed:', error);
            return false;
        }
    }

    /**
     * Test connection to background script
     * 백그라운드 스크립트 연결 테스트
     */
    async testConnection() {
        try {
            const response = await this.messageSender.sendMessage('ping', {}, { 
                retryAttempts: 1, 
                timeout: 5000 
            });
            
            if (response && response.pong) {
                console.log('Background script connection verified');
                return true;
            } else {
                throw new Error('Invalid ping response');
            }
            
        } catch (error) {
            throw new Error(`Background script connection failed: ${error.message}`);
        }
    }

    /**
     * Start health monitoring
     * 상태 모니터링 시작
     */
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                console.warn('Health check failed:', error);
                this.isHealthy = false;
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Perform health check
     * 상태 확인 수행
     */
    async performHealthCheck() {
        try {
            const startTime = Date.now();
            const response = await this.messageSender.sendMessage('ping', {}, {
                retryAttempts: 1,
                timeout: 3000
            });
            
            const responseTime = Date.now() - startTime;
            
            this.isHealthy = response && response.pong && responseTime < 2000;
            this.lastHealthCheck = Date.now();
            
            if (!this.isHealthy) {
                console.warn('Health check indicates unhealthy state');
                this.handleUnhealthyState();
            }
            
        } catch (error) {
            this.isHealthy = false;
            this.handleUnhealthyState();
            throw error;
        }
    }

    /**
     * Handle unhealthy state
     * 비정상 상태 처리
     */
    handleUnhealthyState() {
        // Emit unhealthy event
        this.emit('unhealthy', {
            timestamp: Date.now(),
            lastHealthCheck: this.lastHealthCheck
        });
        
        // Try to recover
        setTimeout(() => {
            this.attemptRecovery();
        }, 5000);
    }

    /**
     * Attempt recovery from unhealthy state
     * 비정상 상태에서 복구 시도
     */
    async attemptRecovery() {
        try {
            console.log('Attempting recovery...');
            
            // Test connection again
            await this.testConnection();
            
            this.isHealthy = true;
            console.log('Recovery successful');
            
            // Emit recovery event
            this.emit('recovered', {
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('Recovery failed:', error);
            
            // Emit recovery failed event
            this.emit('recovery-failed', {
                timestamp: Date.now(),
                error: error.message
            });
        }
    }

    /**
     * Setup error handlers
     * 오류 핸들러 설정
     */
    setupErrorHandlers() {
        // Handle runtime errors
        window.addEventListener('error', (event) => {
            console.error('Runtime error:', event.error);
            this.emit('error', {
                type: 'runtime',
                error: event.error,
                timestamp: Date.now()
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.emit('error', {
                type: 'promise',
                error: event.reason,
                timestamp: Date.now()
            });
        });
    }

    /**
     * Send message through integration layer
     * 통합 레이어를 통한 메시지 전송
     */
    async sendMessage(action, data, options) {
        if (!this.isHealthy) {
            console.warn('Sending message while unhealthy, attempting recovery first');
            await this.attemptRecovery();
        }

        return await this.messageSender.sendMessage(action, data, options);
    }

    /**
     * Event emitter functionality
     * 이벤트 에미터 기능
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Cleanup resources
     * 리소스 정리
     */
    cleanup() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        this.eventListeners.clear();
        console.log('Component integration cleaned up');
    }
}

/**
 * Storage integration helper
 * 스토리지 통합 헬퍼
 */
class StorageIntegration {
    constructor(componentIntegration) {
        this.integration = componentIntegration;
    }

    async getPages() {
        return await this.integration.sendMessage('getPages');
    }

    async savePage(pageData, tabId) {
        return await this.integration.sendMessage('savePage', { 
            data: pageData, 
            tabId 
        });
    }

    async deletePage(pageId) {
        return await this.integration.sendMessage('deletePage', { 
            data: { id: pageId } 
        });
    }

    async updatePage(pageId, updates) {
        return await this.integration.sendMessage('updatePage', { 
            data: { id: pageId, ...updates } 
        });
    }

    async searchPages(query) {
        return await this.integration.sendMessage('searchPages', { 
            data: { query } 
        });
    }

    async getStorageInfo() {
        return await this.integration.sendMessage('getStorageInfo');
    }

    async clearAll() {
        return await this.integration.sendMessage('clearAll');
    }
}

/**
 * Settings integration helper
 * 설정 통합 헬퍼
 */
class SettingsIntegration {
    constructor(componentIntegration) {
        this.integration = componentIntegration;
    }

    async getSettings() {
        return await this.integration.sendMessage('getSettings');
    }

    async saveSettings(settings) {
        return await this.integration.sendMessage('saveSettings', { 
            data: settings 
        });
    }

    async testAPIKey(apiKey, provider) {
        return await this.integration.sendMessage('testAPIKey', { 
            data: { apiKey, provider } 
        });
    }
}

/**
 * AI integration helper
 * AI 통합 헬퍼
 */
class AIIntegration {
    constructor(componentIntegration) {
        this.integration = componentIntegration;
    }

    async testConnection(provider, apiKey, options) {
        return await this.integration.sendMessage('testAIConnection', { 
            data: { provider, apiKey, options } 
        });
    }

    async generateSummary(content, options) {
        return await this.integration.sendMessage('generateSummary', { 
            data: { content, options } 
        });
    }

    async testSummaryWorkflows(tabId) {
        return await this.integration.sendMessage('testSummaryWorkflows', { 
            data: { tabId } 
        });
    }
}

// Global integration instance
let globalIntegration = null;

/**
 * Initialize global integration
 * 전역 통합 초기화
 */
async function initializeIntegration() {
    if (!globalIntegration) {
        globalIntegration = new ComponentIntegration();
        const success = await globalIntegration.initialize();
        
        if (!success) {
            throw new Error('Failed to initialize component integration');
        }
    }
    
    return globalIntegration;
}

/**
 * Get integration helpers
 * 통합 헬퍼 가져오기
 */
function getIntegrationHelpers() {
    if (!globalIntegration) {
        throw new Error('Integration not initialized. Call initializeIntegration() first.');
    }
    
    return {
        storage: new StorageIntegration(globalIntegration),
        settings: new SettingsIntegration(globalIntegration),
        ai: new AIIntegration(globalIntegration),
        core: globalIntegration
    };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MessageSender,
        ComponentIntegration,
        StorageIntegration,
        SettingsIntegration,
        AIIntegration,
        initializeIntegration,
        getIntegrationHelpers
    };
}