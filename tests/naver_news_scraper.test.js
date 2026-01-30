import { jest } from '@jest/globals';

const mockLaunch = jest.fn();

jest.unstable_mockModule('playwright', () => ({
    chromium: {
        launch: mockLaunch
    }
}));

const { chromium } = await import('playwright');
const { scrapeNaverNews, formatNaverContext } = await import('../lib/naver_news_scraper.js');

describe('naver_news_scraper Module', () => {
    let mockBrowser;
    let mockContext;
    let mockPage;

    beforeEach(() => {
        mockPage = {
            goto: jest.fn().mockResolvedValue(null),
            evaluate: jest.fn(),
            close: jest.fn().mockResolvedValue(null),
            waitForTimeout: jest.fn().mockResolvedValue(null),
            content: jest.fn().mockResolvedValue('<html></html>')
        };
        mockContext = {
            newPage: jest.fn().mockResolvedValue(mockPage)
        };
        mockBrowser = {
            newContext: jest.fn().mockResolvedValue(mockContext),
            close: jest.fn().mockResolvedValue(null)
        };
        mockLaunch.mockResolvedValue(mockBrowser);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('성공적으로 네이버 뉴스를 스크래핑해야 함', async () => {
        // Step 1 check: search page evaluate should return links
        mockPage.evaluate.mockResolvedValueOnce([
            'https://n.news.naver.com/mnews/article/001/0001'
        ]);
        // Step 2 check: article page evaluate should return title/snippet
        mockPage.evaluate.mockResolvedValueOnce({
            title: 'Test News',
            snippet: 'Test Content'
        });

        const results = await scrapeNaverNews('삼성전자', 1);

        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Test News');
        expect(mockLaunch).toHaveBeenCalled();
        expect(mockPage.goto).toHaveBeenCalledTimes(2); // Search page + 1 Article page
    });

    test('formatNaverContext가 올바른 형식을 반환해야 함', () => {
        const mockData = [{ title: 'T1', source: 'S1', snippet: 'Content' }];
        const context = formatNaverContext(mockData);
        expect(context).toContain('T1');
        expect(context).toContain('S1');
    });

    test('스크래핑 실패 시 빈 배열을 반환해야 함 (Fatal error catch)', async () => {
        mockPage.goto.mockRejectedValue(new Error('Network Error'));
        const results = await scrapeNaverNews('삼성전자', 1);
        expect(results).toEqual([]);
        expect(mockBrowser.close).toHaveBeenCalled();
    });
});
