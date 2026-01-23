const { generateFinalVideo } = require('../generate_video');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

// 모킹
jest.mock('fs');
jest.mock('child_process');

describe('generate_video Module (TDD)', () => {
    beforeEach(() => {
        process.env.OPENAI_API_KEY = 'test-api-key';

        // fs 모킹
        fs.existsSync.mockReturnValue(true);
        fs.readdirSync.mockImplementation((dir) => {
            if (dir.includes('scenes')) {
                return ['scene_0.mp3', 'scene_0.png', 'scene_1.mp3', 'scene_1.png'];
            }
            return [];
        });

        // child_process.spawn 및 execSync 모킹
        child_process.spawn.mockReturnValue({
            on: jest.fn((event, callback) => {
                if (event === 'close') callback(0);
            }),
            stderr: { on: jest.fn() },
            stdout: { on: jest.fn() }
        });
        child_process.execSync.mockReturnValue(Buffer.from("5.0"));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('모든 장면을 합쳐서 최종 영상을 생성해야 함', async () => {
        const outputPath = path.join(__dirname, '..', 'videos', 'final_video.mp4');
        const result = await generateFinalVideo();

        expect(result).toBe(outputPath);
        expect(child_process.spawn).toHaveBeenCalled();
        // ffmpeg이 호출되었는지 확인
        expect(child_process.spawn.mock.calls[0][0]).toBe('ffmpeg');
    });

    test('장면 파일이 없으면 에러를 던져야 함', async () => {
        fs.readdirSync.mockReturnValue([]);
        await expect(generateFinalVideo()).rejects.toThrow('No scenes found to process.');
    });
});
