import { jest } from '@jest/globals';

const mockSpeechCreate = jest.fn();

jest.unstable_mockModule('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        audio: {
            speech: { create: mockSpeechCreate }
        }
    }))
}));

const { OpenAI } = await import('openai');
const { generateBatchTTS } = await import('../lib/generate_batch_tts.js');
import fs from 'fs';

describe('generate_batch_tts Module', () => {

    beforeEach(() => {
        mockSpeechCreate.mockClear();
        process.env.OPENAI_API_KEY = 'test-api-key';

        // fs 스파이
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
        jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
        jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
        jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
            if (filePath.includes('config.json')) return JSON.stringify({
                tts: { model: 'tts-1' }
            });
            return '';
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    test('전달된 스크립트 데이터로 음성 파일을 생성해야 함', async () => {
        const scriptData = { script: [{ speaker: "Anchor A", text: "Hello" }] };
        const mockMp3 = { arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)) };
        mockSpeechCreate.mockResolvedValue(mockMp3);

        const results = await generateBatchTTS(scriptData);

        expect(results).toHaveLength(1);
        expect(results[0]).toContain('scene_0.mp3');
        expect(mockSpeechCreate).toHaveBeenCalledTimes(1);
    });

    test('API 키가 없으면 에러를 던져야 함', async () => {
        delete process.env.OPENAI_API_KEY;
        await expect(generateBatchTTS({})).rejects.toThrow('OPENAI_API_KEY not found.');
    });
});
