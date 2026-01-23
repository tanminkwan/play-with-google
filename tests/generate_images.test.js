const { generateImagesForScenes } = require('../generate_images');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// 모킹
jest.mock('openai');
jest.mock('fs');

describe('generate_images Module (TDD)', () => {
    let mockImageGenerate;
    let mockChatCreate;

    beforeEach(() => {
        mockImageGenerate = jest.fn();
        mockChatCreate = jest.fn();
        OpenAI.mockImplementation(() => ({
            images: {
                generate: mockImageGenerate
            },
            chat: {
                completions: {
                    create: mockChatCreate
                }
            }
        }));

        process.env.OPENAI_API_KEY = 'test-api-key';

        // fs 모킹
        fs.existsSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue(['scene_0.txt', 'scene_1.txt']);
        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes('scene_0.txt')) return 'Scene 0 text';
            if (filePath.includes('scene_1.txt')) return 'Scene 1 text';
            return '';
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('각 텍스트 파일에 대해 요약된 프롬프트로 DALL-E 이미지를 생성해야 함', async () => {
        const mockChatResponse = {
            choices: [{ message: { content: 'Optimized visual prompt' } }]
        };
        mockChatCreate.mockResolvedValue(mockChatResponse);

        mockImageGenerate.mockResolvedValue({
            data: [{ url: 'https://example.com/image.png' }]
        });

        const imageGen = require('../generate_images');
        const downloadSpy = jest.spyOn(imageGen, 'downloadImage').mockResolvedValue('path/to/image.png');

        const results = await imageGen.generateImagesForScenes();

        expect(results.length).toBe(2);
        expect(mockChatCreate).toHaveBeenCalledTimes(2); // 요약 단계 호출
        expect(mockImageGenerate).toHaveBeenCalledTimes(2);
        expect(mockImageGenerate).toHaveBeenCalledWith(expect.objectContaining({
            model: "dall-e-3",
            prompt: expect.stringContaining('Optimized visual prompt')
        }));

        downloadSpy.mockRestore();
    });

    test('API 키가 없으면 에러를 던져야 함', async () => {
        delete process.env.OPENAI_API_KEY;
        await expect(generateImagesForScenes()).rejects.toThrow('OPENAI_API_KEY not found.');
    });
});
