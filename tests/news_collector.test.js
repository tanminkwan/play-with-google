const { collectNewsData, formatNewsContext } = require('../lib/news_collector');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Gemini 모킹
jest.mock('@google/generative-ai');

describe('news_collector (Gemini Search Version)', () => {
    let mockGenerateContent;

    beforeEach(() => {
        mockGenerateContent = jest.fn();
        const mockModel = {
            generateContent: mockGenerateContent
        };
        const mockGenAI = {
            getGenerativeModel: jest.fn().mockReturnValue(mockModel)
        };
        GoogleGenerativeAI.mockImplementation(() => mockGenAI);

        process.env.GEMINI_API_KEY = 'test-gemini-key';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Gemini 검색을 통해 뉴스 데이터를 수집해야 함', async () => {
        const mockResponse = {
            response: {
                text: () => JSON.stringify({
                    summary: "AI News Summary",
                    articles: [{ title: "Title", source: "CNN", date: "2024", url: "http" }]
                })
            }
        };
        mockGenerateContent.mockResolvedValue(mockResponse);

        const results = await collectNewsData('AI Trends');

        expect(results).toHaveProperty('summary', 'AI News Summary');
        expect(mockGenerateContent).toHaveBeenCalled();
    });

    test('formatNewsContext가 사람이 읽기 좋은 텍스트를 생성해야 함', () => {
        const mockData = {
            summary: "Quick wrap",
            articles: [{ title: "T1", source: "S1", date: "D1", url: "U1" }]
        };
        const context = formatNewsContext(mockData);
        expect(context).toContain('Quick wrap');
        expect(context).toContain('T1 (S1, D1)');
    });
});
