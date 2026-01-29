const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

// 모킹
jest.mock('fs');
jest.mock('child_process');

describe('generate_video Module', () => {
    let videoGen;

    beforeEach(() => {
        // fs 모킹
        fs.existsSync.mockImplementation((filePath) => {
            if (filePath.includes('scene_0_logo.png')) return true;
            if (filePath.includes('config.json')) return true;
            return true;
        });
        fs.readdirSync.mockImplementation((dir) => {
            if (dir.includes('scenes')) {
                return ['scene_0.mp3', 'scene_0.png', 'scene_0_logo.png', 'scene_1.mp3', 'scene_1.png'];
            }
            return [];
        });
        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes('config.json')) return JSON.stringify({
                videoSettings: { width: 1920, height: 1080 },
                logoOverlay: { enabled: true, position: 'top-right', width: 150 }
            });
            return '';
        });

        // child_process 모킹
        child_process.spawn.mockReturnValue({
            on: jest.fn((event, callback) => { if (event === 'close') callback(0); }),
            stderr: { on: jest.fn() },
            stdout: { on: jest.fn() }
        });
        child_process.execSync.mockReturnValue(Buffer.from("5.0"));

        // 모듈을 매번 새로 로드하여 최신 mock 반영
        jest.isolateModules(() => {
            videoGen = require('../lib/generate_video');
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('로고 오버레이를 포함하여 최종 영상을 생성해야 함', async () => {
        const result = await videoGen.generateFinalVideo();

        expect(child_process.spawn).toHaveBeenCalled();
        const args = child_process.spawn.mock.calls[0][1];
        const filterComplex = args[args.indexOf('-filter_complex') + 1];

        // 로고 오버레이 로직이 포함되었는지 확인
        expect(filterComplex).toContain('overlay=x=W-w-20:y=20');
        expect(filterComplex).toContain('[logo0]'); // scene_0_logo.png가 있으므로 logo0 필터가 생겨야 함
    });

    test('장면 파일이 없으면 에러를 던져야 함', async () => {
        fs.readdirSync.mockReturnValue([]);
        await expect(videoGen.generateFinalVideo()).rejects.toThrow('No scenes found to process.');
    });
});
