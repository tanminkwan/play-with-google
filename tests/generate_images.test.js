const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// 모킹
jest.mock('openai');
jest.mock('fs');

describe('generate_images Module', () => {
    let mockImageGenerate;
    let mockChatCreate;
    let imageGen;

    beforeEach(() => {
        mockImageGenerate = jest.fn();
        mockChatCreate = jest.fn();
        OpenAI.mockImplementation(() => ({
            images: { generate: mockImageGenerate },
            chat: { completions: { create: mockChatCreate } }
        }));

        process.env.OPENAI_API_KEY = 'test-api-key';

        // fs 모킹
        fs.existsSync.mockReturnValue(true);
        fs.readdirSync.mockImplementation((dir) => {
            if (dir.includes('scenes')) return ['scene_0.txt', 'scene_1.txt'];
            return [];
        });
        fs.readFileSync.mockImplementation((filePath) => {
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

        // 헬퍼: 모듈을 매번 새로 로드하여 최신 mock 반영
        jest.isolateModules(() => {
            imageGen = require('../lib/generate_images');
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
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

        const downloadSpy = jest.spyOn(imageGen, 'downloadImage').mockResolvedValue('path/to/image.png');
        const logoSpy = jest.spyOn(imageGen, 'searchAndDownloadLogo').mockResolvedValue('path/to/logo.png');

        const results = await imageGen.generateImagesForScenes();

        expect(results.length).toBe(2);
        expect(mockChatCreate).toHaveBeenCalledTimes(2);
        expect(mockImageGenerate).toHaveBeenCalledTimes(2);

        downloadSpy.mockRestore();
        logoSpy.mockRestore();
    });

    test('searchAndDownloadLogo Utility: 도메인 우선순위 확인', async () => {
        const downloadSpy = jest.spyOn(imageGen, 'downloadImage').mockResolvedValue('ok');

        // 1. 도메인 기반
        await imageGen.searchAndDownloadLogo('Tesla', 'tesla.com', 'out.png');
        expect(downloadSpy).toHaveBeenCalledWith(expect.stringContaining('t3.gstatic.com'), 'out.png');

        // 2. Fallback 기반
        await imageGen.searchAndDownloadLogo('Samsung Electronics', null, 'out.png');
        expect(downloadSpy).toHaveBeenCalledWith('https://test.com/samsung.png', 'out.png');

        downloadSpy.mockRestore();
    });

    test('API 키가 없으면 에러를 던져야 함', async () => {
        delete process.env.OPENAI_API_KEY;
        // isolateModules에서 로드된 imageGen은 이미 API 키 체크를 통과했을 수 있으므로 직접 호출 시도
        await expect(imageGen.generateImagesForScenes()).rejects.toThrow('OPENAI_API_KEY not found.');
    });
});
