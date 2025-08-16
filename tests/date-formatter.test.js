// Tests for date formatting functionality
// 날짜 형식화 기능 테스트

const { DateFormatter } = require('../utils/date-formatter');

describe('DateFormatter', () => {
    let dateFormatter;

    beforeEach(() => {
        // Mock Chrome i18n API
        global.chrome = {
            i18n: {
                getUILanguage: jest.fn(() => 'en-US'),
                getMessage: jest.fn((key) => key)
            }
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
            }))
        };

        dateFormatter = new DateFormatter();
    });

    afterEach(() => {
        delete global.chrome;
        delete global.Intl;
    });

    describe('Initialization', () => {
        test('should initialize with English as default language', () => {
            expect(dateFormatter.getCurrentLanguage()).toBe('en');
        });

        test('should detect Korean language from browser settings', () => {
            chrome.i18n.getUILanguage.mockReturnValue('ko-KR');
            const formatter = new DateFormatter();
            expect(formatter.getCurrentLanguage()).toBe('ko');
        });
    });

    describe('Locale Detection', () => {
        test('should return correct locale for supported languages', () => {
            expect(dateFormatter.getLocale()).toBe('en-US');
            
            dateFormatter.setLanguage('ko');
            expect(dateFormatter.getLocale()).toBe('ko-KR');
        });

        test('should fallback to en-US for unsupported languages', () => {
            dateFormatter.setLanguage('fr');
            expect(dateFormatter.getLocale()).toBe('en-US');
        });
    });

    describe('Date Parsing', () => {
        test('should parse Date objects correctly', () => {
            const date = new Date('2023-12-25');
            const parsed = dateFormatter.parseDate(date);
            expect(parsed).toBeInstanceOf(Date);
            expect(parsed.getTime()).toBe(date.getTime());
        });

        test('should parse string dates correctly', () => {
            const parsed = dateFormatter.parseDate('2023-12-25');
            expect(parsed).toBeInstanceOf(Date);
            expect(parsed.getFullYear()).toBe(2023);
            expect(parsed.getMonth()).toBe(11); // December is month 11
            expect(parsed.getDate()).toBe(25);
        });

        test('should parse timestamp numbers correctly', () => {
            const timestamp = Date.now();
            const parsed = dateFormatter.parseDate(timestamp);
            expect(parsed).toBeInstanceOf(Date);
            expect(parsed.getTime()).toBe(timestamp);
        });

        test('should return null for invalid dates', () => {
            expect(dateFormatter.parseDate('invalid-date')).toBeNull();
            expect(dateFormatter.parseDate(new Date('invalid'))).toBeNull();
            expect(dateFormatter.parseDate(null)).toBeNull();
            expect(dateFormatter.parseDate(undefined)).toBeNull();
        });
    });

    describe('Date Formatting', () => {
        const testDate = new Date('2023-12-25T15:30:00');

        test('should format dates with default options', () => {
            const formatted = dateFormatter.formatDate(testDate);
            expect(typeof formatted).toBe('string');
            expect(Intl.DateTimeFormat).toHaveBeenCalledWith('en-US', expect.any(Object));
        });

        test('should format dates with custom options', () => {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            dateFormatter.formatDate(testDate, options);
            expect(Intl.DateTimeFormat).toHaveBeenCalledWith('en-US', expect.objectContaining(options));
        });

        test('should use Korean locale when language is set to Korean', () => {
            dateFormatter.setLanguage('ko');
            dateFormatter.formatDate(testDate);
            expect(Intl.DateTimeFormat).toHaveBeenCalledWith('ko-KR', expect.any(Object));
        });

        test('should handle invalid dates gracefully', () => {
            const result = dateFormatter.formatDate('invalid-date');
            expect(result).toBe('Invalid Date');
        });
    });

    describe('Time Formatting', () => {
        const testDate = new Date('2023-12-25T15:30:00');

        test('should format time with default options', () => {
            const formatted = dateFormatter.formatTime(testDate);
            expect(typeof formatted).toBe('string');
            expect(Intl.DateTimeFormat).toHaveBeenCalledWith('en-US', expect.objectContaining({
                hour: '2-digit',
                minute: '2-digit'
            }));
        });

        test('should format time with custom options', () => {
            const options = { hour: 'numeric', minute: '2-digit', second: '2-digit' };
            dateFormatter.formatTime(testDate, options);
            expect(Intl.DateTimeFormat).toHaveBeenCalledWith('en-US', expect.objectContaining(options));
        });
    });

    describe('DateTime Formatting', () => {
        const testDate = new Date('2023-12-25T15:30:00');

        test('should format datetime with default options', () => {
            const formatted = dateFormatter.formatDateTime(testDate);
            expect(typeof formatted).toBe('string');
            expect(Intl.DateTimeFormat).toHaveBeenCalledWith('en-US', expect.objectContaining({
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }));
        });
    });

    describe('Relative Time Formatting', () => {
        const baseDate = new Date('2023-12-25T12:00:00');

        test('should format relative time for past dates', () => {
            const pastDate = new Date('2023-12-25T10:00:00'); // 2 hours ago
            const formatted = dateFormatter.formatRelativeTime(pastDate, baseDate);
            expect(typeof formatted).toBe('string');
            expect(Intl.RelativeTimeFormat).toHaveBeenCalled();
        });

        test('should format relative time for future dates', () => {
            const futureDate = new Date('2023-12-25T14:00:00'); // 2 hours from now
            const formatted = dateFormatter.formatRelativeTime(futureDate, baseDate);
            expect(typeof formatted).toBe('string');
        });

        test('should choose appropriate time unit', () => {
            // Test different time differences
            const oneMinuteAgo = new Date(baseDate.getTime() - 60 * 1000);
            const oneHourAgo = new Date(baseDate.getTime() - 60 * 60 * 1000);
            const oneDayAgo = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);

            dateFormatter.formatRelativeTime(oneMinuteAgo, baseDate);
            dateFormatter.formatRelativeTime(oneHourAgo, baseDate);
            dateFormatter.formatRelativeTime(oneDayAgo, baseDate);

            expect(Intl.RelativeTimeFormat).toHaveBeenCalledTimes(3);
        });
    });

    describe('Short and Long Date Formatting', () => {
        const testDate = new Date('2023-12-25');

        test('should format short dates', () => {
            const formatted = dateFormatter.formatShortDate(testDate);
            expect(typeof formatted).toBe('string');
            expect(Intl.DateTimeFormat).toHaveBeenCalledWith('en-US', expect.objectContaining({
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }));
        });

        test('should format long dates', () => {
            const formatted = dateFormatter.formatLongDate(testDate);
            expect(typeof formatted).toBe('string');
            expect(Intl.DateTimeFormat).toHaveBeenCalledWith('en-US', expect.objectContaining({
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }));
        });
    });

    describe('Display Formatting', () => {
        const now = new Date('2023-12-25T12:00:00');

        test('should show relative time for today', () => {
            const todayDate = new Date('2023-12-25T10:00:00');
            const formatted = dateFormatter.formatForDisplay(todayDate);
            expect(typeof formatted).toBe('string');
        });

        test('should show "Yesterday" for yesterday dates', () => {
            const yesterdayDate = new Date('2023-12-24T10:00:00');
            
            // Mock the current date
            const originalNow = Date.now;
            Date.now = jest.fn(() => now.getTime());
            
            const formatted = dateFormatter.formatForDisplay(yesterdayDate);
            expect(typeof formatted).toBe('string');
            
            // Restore original Date.now
            Date.now = originalNow;
        });
    });

    describe('Month and Day Names', () => {
        test('should return array of month names', () => {
            const months = dateFormatter.getMonthNames();
            expect(Array.isArray(months)).toBe(true);
            expect(months).toHaveLength(12);
        });

        test('should return array of day names', () => {
            const days = dateFormatter.getDayNames();
            expect(Array.isArray(days)).toBe(true);
            expect(days).toHaveLength(7);
        });

        test('should support different formats for month names', () => {
            dateFormatter.getMonthNames('short');
            dateFormatter.getMonthNames('long');
            dateFormatter.getMonthNames('narrow');
            
            expect(Intl.DateTimeFormat).toHaveBeenCalledTimes(36); // 12 months × 3 formats
        });
    });

    describe('Fallback Formatting', () => {
        beforeEach(() => {
            // Mock Intl to throw errors
            global.Intl.DateTimeFormat = jest.fn(() => {
                throw new Error('Intl not supported');
            });
            global.Intl.RelativeTimeFormat = jest.fn(() => {
                throw new Error('Intl not supported');
            });
        });

        test('should use fallback for date formatting', () => {
            const testDate = new Date('2023-12-25');
            const formatted = dateFormatter.formatDate(testDate);
            expect(typeof formatted).toBe('string');
            expect(formatted).not.toBe('Invalid Date');
        });

        test('should use fallback for time formatting', () => {
            const testDate = new Date('2023-12-25T15:30:00');
            const formatted = dateFormatter.formatTime(testDate);
            expect(typeof formatted).toBe('string');
            expect(formatted).not.toBe('Invalid Time');
        });

        test('should use fallback for relative time formatting', () => {
            const testDate = new Date('2023-12-25T10:00:00');
            const baseDate = new Date('2023-12-25T12:00:00');
            const formatted = dateFormatter.formatRelativeTime(testDate, baseDate);
            expect(typeof formatted).toBe('string');
        });

        test('should format Korean fallback correctly', () => {
            dateFormatter.setLanguage('ko');
            const testDate = new Date('2023-12-25T15:30:00');
            
            const dateFormatted = dateFormatter.fallbackDateFormat(testDate);
            expect(dateFormatted).toContain('2023년');
            expect(dateFormatted).toContain('12월');
            expect(dateFormatted).toContain('25일');
            
            const timeFormatted = dateFormatter.fallbackTimeFormat(testDate);
            expect(timeFormatted).toContain('오후');
        });

        test('should format English fallback correctly', () => {
            dateFormatter.setLanguage('en');
            const testDate = new Date('2023-12-25T15:30:00');
            
            const dateFormatted = dateFormatter.fallbackDateFormat(testDate);
            expect(dateFormatted).toContain('Dec');
            expect(dateFormatted).toContain('25');
            expect(dateFormatted).toContain('2023');
            
            const timeFormatted = dateFormatter.fallbackTimeFormat(testDate);
            expect(timeFormatted).toContain('PM');
        });
    });

    describe('Language Management', () => {
        test('should set and get current language', () => {
            dateFormatter.setLanguage('ko');
            expect(dateFormatter.getCurrentLanguage()).toBe('ko');
            
            dateFormatter.setLanguage('en');
            expect(dateFormatter.getCurrentLanguage()).toBe('en');
        });
    });
});

describe('Localize Date Functions', () => {
    beforeEach(() => {
        // Mock Chrome i18n API
        global.chrome = {
            i18n: {
                getUILanguage: jest.fn(() => 'en-US'),
                getMessage: jest.fn((key) => key)
            }
        };

        // Mock i18n global
        global.i18n = {
            getCurrentLanguage: jest.fn(() => 'en'),
            formatRelativeTime: jest.fn((date) => 'mocked relative time')
        };

        // Mock dateFormatter global
        global.dateFormatter = {
            formatDate: jest.fn(() => 'mocked date'),
            formatTime: jest.fn(() => 'mocked time'),
            formatDateTime: jest.fn(() => 'mocked datetime'),
            formatRelativeTime: jest.fn(() => 'mocked relative time'),
            formatForDisplay: jest.fn(() => 'mocked display'),
            formatShortDate: jest.fn(() => 'mocked short date'),
            formatLongDate: jest.fn(() => 'mocked long date')
        };

        // Mock Intl
        global.Intl = {
            DateTimeFormat: jest.fn().mockImplementation(() => ({
                format: jest.fn(() => 'intl formatted date')
            }))
        };
    });

    afterEach(() => {
        delete global.chrome;
        delete global.i18n;
        delete global.dateFormatter;
        delete global.Intl;
    });

    test('should use dateFormatter when available', () => {
        const testDate = new Date('2023-12-25');
        
        formatDate(testDate);
        expect(dateFormatter.formatDate).toHaveBeenCalledWith(testDate, {});
        
        formatTime(testDate);
        expect(dateFormatter.formatTime).toHaveBeenCalledWith(testDate, {});
        
        formatDateTime(testDate);
        expect(dateFormatter.formatDateTime).toHaveBeenCalledWith(testDate, {});
        
        formatRelativeTime(testDate);
        expect(dateFormatter.formatRelativeTime).toHaveBeenCalledWith(testDate, undefined);
        
        formatForDisplay(testDate);
        expect(dateFormatter.formatForDisplay).toHaveBeenCalledWith(testDate);
        
        formatShortDate(testDate);
        expect(dateFormatter.formatShortDate).toHaveBeenCalledWith(testDate);
        
        formatLongDate(testDate);
        expect(dateFormatter.formatLongDate).toHaveBeenCalledWith(testDate);
    });

    test('should fallback to Intl when dateFormatter is not available', () => {
        delete global.dateFormatter;
        
        const testDate = new Date('2023-12-25');
        formatDate(testDate);
        
        expect(Intl.DateTimeFormat).toHaveBeenCalledWith('en-US', {});
    });

    test('should handle errors gracefully', () => {
        global.Intl.DateTimeFormat = jest.fn(() => {
            throw new Error('Intl error');
        });
        
        const testDate = new Date('2023-12-25');
        const result = formatDate(testDate);
        
        expect(typeof result).toBe('string');
    });
});