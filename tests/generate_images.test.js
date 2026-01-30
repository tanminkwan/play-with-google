import { jest } from '@jest/globals';

const mockImageGenerate = jest.fn();
const mockChatCreate = jest.fn();

jest.unstable_mockModule('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        images: { generate: mockImageGenerate },
        chat: { completions: { create: mockChatCreate } }
    }))
}));

jest.unstable_mockModule('https', () => ({
    default: {
        get: jest.fn((url, options, cb) => {
            const res = { statusCode: 200, pipe: jest.fn() };
            cb(res);
            return { on: jest.fn().mockReturnThis() };
        })
    }
}));

const { OpenAI } = await import('openai');
const imageGen = await import('../lib/generate_images.js');
import fs from 'fs';

describe('generate_images Module', () => {

    beforeEach(() => {
        mockImageGenerate.mockClear();
        mockChatCreate.mockClear();
        process.env.OPENAI_API_KEY = 'test-api-key';

        // fs 스파이
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readdirSync').mockImplementation((dir) => {
            if (dir.includes('scenes')) return ['scene_0.txt', 'scene_1.txt'];
            return [];
        });
        jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
            if (filePath.includes('config.json')) return JSON.stringify({
                imageGeneration: { model: 'dall-e-3', style: 'test style' },
                logoOverlay: {
                    enabled: true,
                    fallbackLogos: { "Samsung": "https://test.com/samsung.png" }
                }
            });
            if (filePath.includes('scene_0.txt')) return 'Scene 0 text';
            if (filePath.includes('scene_1.txt')) return 'Scene 1 text';
            return '';
        });
        jest.spyOn(fs, 'createWriteStream').mockReturnValue({
            on: jest.fn((event, cb) => { if (event === 'finish') cb(); }),
            close: jest.fn()
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    test('각 텍스트 파일에 대해 요약된 프롬프트로 이미지를 생성해야 함', async () => {
        const mockChatResponse = {
            choices: [{
                message: {
                    content: JSON.stringify({
                        optimizedPrompt: 'Optimized visual prompt',
                        entity: 'Samsung',
                        domain: 'samsung.com'
                    })
                }
            }]
        };
        mockChatCreate.mockResolvedValue(mockChatResponse);
        mockImageGenerate.mockResolvedValue({ data: [{ url: 'https://example.com/image.png' }] });

        const results = await imageGen.generateImagesForScenes();

        expect(results.length).toBe(2);
        expect(mockChatCreate).toHaveBeenCalledTimes(2);
        expect(mockImageGenerate).toHaveBeenCalledTimes(2);
    });

    test('searchAndDownloadLogo Utility: 도메인 우선순위 확인', async () => {
        // searchAndDownloadLogo directly
        const result = await imageGen.searchAndDownloadLogo('Tesla', 'tesla.com', 'out.png');
        expect(result).toBe('out.png');

        const result2 = await imageGen.searchAndDownloadLogo('Samsung Electronics', null, 'out.png');
        expect(result2).toBe('out.png');
    });

    test('API 키가 없으면 에러를 던져야 함', async () => {
        delete process.env.OPENAI_API_KEY;
        await expect(imageGen.generateImagesForScenes()).rejects.toThrow('OPENAI_API_KEY not found.');
    });
});
