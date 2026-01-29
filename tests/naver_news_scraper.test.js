const { scrapeNaverRankingNews, formatNaverContext } = require('../lib/naver_news_scraper');
const { chromium } = require('playwright');

// Playwright 모킹
jest.mock('playwright', () => ({
    chromium: {
        launch: jest.fn()
    }
}));

describe('naver_news_scraper Module', () => {
    let mockBrowser;
    let mockContext;
    let mockPage;

    beforeEach(() => {
        mockPage = {
            goto: jest.fn().mockResolvedValue(null),
            evaluate: jest.fn().mockResolvedValue([
                { title: 'Test News', link: 'http://news.com', source: 'Press' }
            ]),
            close: jest.fn().mockResolvedValue(null)
        };
        mockContext = {
            newPage: jest.fn().mockResolvedValue(mockPage)
        };
        mockBrowser = {
            newContext: jest.fn().mockResolvedValue(mockContext),
            close: jest.fn().mockResolvedValue(null)
        };
        chromium.launch.mockResolvedValue(mockBrowser);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('성공적으로 네이버 뉴스를 스크래핑해야 함', async () => {
        const results = await scrapeNaverRankingNews(1);

        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Test News');
        expect(chromium.launch).toHaveBeenCalled();
        expect(mockPage.goto).toHaveBeenCalledWith(expect.stringContaining('naver.com'), expect.any(Object));
    });

    test('formatNaverContext가 올바른 형식을 반환해야 함', () => {
        const mockData = [{ title: 'T1', source: 'S1', link: 'L1' }];
        const context = formatNaverContext(mockData);
        expect(context).toContain('T1');
        expect(context).toContain('S1');
        expect(context).toContain('URL: L1');
    });

    test('스크래핑 실패 시 에러를 던져야 함', async () => {
        mockPage.goto.mockRejectedValue(new Error('Network Error'));
        await expect(scrapeNaverRankingNews()).rejects.toThrow('Network Error');
        expect(mockBrowser.close).toHaveBeenCalled();
    });
});
