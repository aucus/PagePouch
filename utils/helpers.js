// Helper utility functions for LaterLens Chrome extension
// 헬퍼 유틸리티 함수 - 공통 기능 및 도구

/**
 * Generate a unique ID for saved pages
 * 저장된 페이지용 고유 ID 생성
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format bytes to human readable format
 * 바이트를 사람이 읽기 쉬운 형식으로 변환
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format date to localized string
 * 날짜를 현지화된 문자열로 형식화
 */
function formatDate(timestamp, locale = 'en-US') {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Show relative time for recent dates
    if (diffDays === 1) {
        return locale.startsWith('ko') ? '어제' : 'Yesterday';
    } else if (diffDays < 7) {
        return locale.startsWith('ko') ? `${diffDays}일 전` : `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

/**
 * Escape HTML to prevent XSS
 * XSS 방지를 위한 HTML 이스케이프
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Truncate text to specified length
 * 텍스트를 지정된 길이로 자르기
 */
function truncateText(text, maxLength = 100, suffix = '...') {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Validate URL format
 * URL 형식 검증
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
 * Extract domain from URL
 * URL에서 도메인 추출
 */
function extractDomain(url) {
    try {
        return new URL(url).hostname;
    } catch (error) {
        console.error('Invalid URL:', url);
        return 'unknown';
    }
}

/**
 * Convert relative URL to absolute
 * 상대 URL을 절대 URL로 변환
 */
function makeAbsoluteUrl(url, baseUrl) {
    try {
        return new URL(url, baseUrl).href;
    } catch (error) {
        console.error('Error making absolute URL:', error);
        return url;
    }
}

/**
 * Debounce function to limit rapid calls
 * 빠른 호출을 제한하는 디바운스 함수
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Throttle function to limit execution frequency
 * 실행 빈도를 제한하는 스로틀 함수
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Deep clone an object
 * 객체 깊은 복사
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Check if object is empty
 * 객체가 비어있는지 확인
 */
function isEmpty(obj) {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    return Object.keys(obj).length === 0;
}

/**
 * Get browser language
 * 브라우저 언어 가져오기
 */
function getBrowserLanguage() {
    return navigator.language || navigator.userLanguage || 'en-US';
}

/**
 * Check if language is Korean
 * 언어가 한국어인지 확인
 */
function isKoreanLanguage(lang = getBrowserLanguage()) {
    return lang.toLowerCase().startsWith('ko');
}

/**
 * Compress image data URL
 * 이미지 데이터 URL 압축
 */
function compressImage(dataUrl, quality = 0.8, maxWidth = 800, maxHeight = 600) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Calculate new dimensions
            let { width, height } = img;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
        };
        
        img.onerror = function() {
            resolve(dataUrl); // Return original on error
        };
        
        img.src = dataUrl;
    });
}

/**
 * Create a default thumbnail placeholder
 * 기본 썸네일 플레이스홀더 생성
 */
function createDefaultThumbnail(width = 200, height = 150) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Border
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
    
    // Icon
    ctx.fillStyle = '#6c757d';
    ctx.font = `${Math.min(width, height) / 4}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📄', width / 2, height / 2);
    
    return canvas.toDataURL('image/png');
}

/**
 * Sanitize filename for download
 * 다운로드용 파일명 정리
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid characters
        .replace(/\s+/g, '_')          // Replace spaces with underscores
        .replace(/_+/g, '_')           // Replace multiple underscores with single
        .replace(/^_|_$/g, '')         // Remove leading/trailing underscores
        .substring(0, 100);            // Limit length
}

/**
 * Show notification (if supported)
 * 알림 표시 (지원되는 경우)
 */
function showNotification(title, message, type = 'basic') {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: chrome.runtime.getURL('assets/icon48.png')
        });
    } else {
        console.log(`${title}: ${message}`);
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateUniqueId,
        formatBytes,
        formatDate,
        escapeHtml,
        truncateText,
        isValidUrl,
        extractDomain,
        makeAbsoluteUrl,
        debounce,
        throttle,
        deepClone,
        isEmpty,
        getBrowserLanguage,
        isKoreanLanguage,
        compressImage,
        createDefaultThumbnail,
        sanitizeFilename,
        showNotification
    };
} else if (typeof window !== 'undefined') {
    // Make functions available globally in browser
    Object.assign(window, {
        generateUniqueId,
        formatBytes,
        formatDate,
        escapeHtml,
        truncateText,
        isValidUrl,
        extractDomain,
        makeAbsoluteUrl,
        debounce,
        throttle,
        deepClone,
        isEmpty,
        getBrowserLanguage,
        isKoreanLanguage,
        compressImage,
        createDefaultThumbnail,
        sanitizeFilename,
        showNotification
    });
}