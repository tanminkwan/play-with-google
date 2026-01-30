import { jest } from '@jest/globals';

const mockCreate = jest.fn();

jest.unstable_mockModule('openai', () => {
    return {
        OpenAI: jest.fn().mockImplementation(() => ({
            chat: { completions: { create: mockCreate } }
        }))
    };
});

const { OpenAI } = await import('openai');
const { generateNewsScriptWithOpenAI } = await import('../lib/openai_news_search.js');

describe('openai_news_search Module', () => {
    beforeEach(() => {
        mockCreate.mockClear();
        process.env.OPENAI_API_KEY = 'test-api-key';
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

        const result = await generateNewsScriptWithOpenAI('test-keyword', 'Korean');

        expect(result).toHaveProperty('summary', '테스트 요약');
        expect(result.script).toHaveLength(1);
    });

    test('API 키가 없으면 에러를 던져야 함', async () => {
        delete process.env.OPENAI_API_KEY;
        await expect(generateNewsScriptWithOpenAI('keyword'))
            .rejects.toThrow('OPENAI_API_KEY not found in .env file.');
    });
});
