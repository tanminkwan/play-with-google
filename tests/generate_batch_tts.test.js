const { generateBatchTTS } = require('../generate_batch_tts');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// 모킹
jest.mock('openai');
jest.mock('fs');

describe('generate_batch_tts Module', () => {
    let mockSpeechCreate;

    beforeEach(() => {
        mockSpeechCreate = jest.fn();
        OpenAI.mockImplementation(() => ({
            audio: {
                speech: {
                    create: mockSpeechCreate
                }
            }
        }));

        process.env.OPENAI_API_KEY = 'test-api-key';

        // fs 모킹 초기화
        fs.existsSync.mockReturnValue(true);
        fs.mkdirSync.mockReturnValue(undefined);
        fs.writeFileSync.mockReturnValue(undefined);
        fs.promises = {
            writeFile: jest.fn().mockResolvedValue(undefined)
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('전달된 스크립트 데이터로 음성 파일을 생성해야 함', async () => {
        const scriptData = {
            script: [
                { speaker: "Anchor A", text: "Hello" }
            ]
        };

        const mockMp3 = {
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
        };
        mockSpeechCreate.mockResolvedValue(mockMp3);

        const results = await generateBatchTTS(scriptData);

        expect(results).toHaveLength(1);
        expect(results[0]).toContain('scene_0.mp3');
        expect(mockSpeechCreate).toHaveBeenCalledTimes(1);
        expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    test('API 키가 없으면 에러를 던져야 함', async () => {
        delete process.env.OPENAI_API_KEY;

        await expect(generateBatchTTS({}))
            .rejects.toThrow('OPENAI_API_KEY not found.');
    });

    test('스크립트 데이터나 파일이 없으면 에러를 던져야 함', async () => {
        fs.existsSync.mockReturnValue(false);

        await expect(generateBatchTTS(null))
            .rejects.toThrow('news_script.json not found. Run the search script first.');
    });
});
