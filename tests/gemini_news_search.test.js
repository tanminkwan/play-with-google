const { generateNewsScript } = require('../lib/gemini_news_search');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// GoogleGenerativeAI 모킹
jest.mock('@google/generative-ai');

describe('gemini_news_search Module (TDD)', () => {
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

    test('성공적으로 영어 뉴스 스크립트를 생성해야 함', async () => {
        const mockResponse = {
            response: {
                text: () => JSON.stringify({
                    summary: "English summary",
                    script: [
                        { speaker: "Anchor A", text: "Hello", emotion: "excited" }
                    ]
                })
            }
        };

        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await generateNewsScript('test-keyword', 'English');

        expect(result).toHaveProperty('summary', 'English summary');
        expect(result.script[0].text).toBe('Hello');
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    test('API 키가 없으면 에러를 던져야 함', async () => {
        delete process.env.GEMINI_API_KEY;

        await expect(generateNewsScript('keyword'))
            .rejects.toThrow('GEMINI_API_KEY not found in .env file.');
    });

    test('Gemini API 호출 실패 시 에러가 전파되어야 함', async () => {
        // 의도된 에러 로그 출력 방지
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        mockGenerateContent.mockRejectedValue(new Error('Gemini Error'));

        await expect(generateNewsScript('keyword'))
            .rejects.toThrow('Gemini Error');

        consoleSpy.mockRestore();
    });
});
