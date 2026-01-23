const { generateNewsScriptWithOpenAI } = require('../openai_news_search');
const { OpenAI } = require('openai');

// OpenAI 모듈 모킹
jest.mock('openai');

describe('openai_news_search Module', () => {
    let mockCreate;
    let newsSearch;

    beforeEach(() => {
        mockCreate = jest.fn();
        OpenAI.mockImplementation(() => ({
            chat: { completions: { create: mockCreate } }
        }));

        process.env.OPENAI_API_KEY = 'test-api-key';

        jest.isolateModules(() => {
            newsSearch = require('../openai_news_search');
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('성공적으로 뉴스 스크립트를 생성해야 함', async () => {
        const mockResponse = {
            choices: [{
                message: {
                    content: JSON.stringify({
                        summary: "테스트 요약",
                        script: [{ speaker: "Anchor A", text: "안녕하세요", emotion: "excited" }]
                    })
                }
            }]
        };
        mockCreate.mockResolvedValue(mockResponse);

        const result = await newsSearch.generateNewsScriptWithOpenAI('test-keyword', 'Korean');

        expect(result).toHaveProperty('summary', '테스트 요약');
        expect(result.script).toHaveLength(1);
    });

    test('API 키가 없으면 에러를 던져야 함', async () => {
        delete process.env.OPENAI_API_KEY;
        await expect(newsSearch.generateNewsScriptWithOpenAI('keyword'))
            .rejects.toThrow('OPENAI_API_KEY not found in .env file.');
    });
});
