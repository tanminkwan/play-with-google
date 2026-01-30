import { jest } from '@jest/globals';
import fs from 'fs';
import * as child_process from 'child_process';

// We need to import the module under test AFTER mocks/spies are set up if they affect module loading
// but generateFinalVideo uses spawn/execSync which are usually looked up at runtime or from imports.
// In generate_video.js: import { spawn, execSync } from 'child_process';

const mockSpawn = jest.fn();
const mockExecSync = jest.fn();

jest.unstable_mockModule('child_process', () => ({
    spawn: mockSpawn,
    execSync: mockExecSync
}));

const { generateFinalVideo } = await import('../lib/generate_video.js');

describe('generate_video Module', () => {

    beforeEach(() => {
        // fs 스파이
        jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
            return true;
        });
        jest.spyOn(fs, 'readdirSync').mockImplementation((dir) => {
            if (dir.includes('scenes')) {
                return ['scene_0.mp3', 'scene_0.png', 'scene_0_logo.png', 'scene_1.mp3', 'scene_1.png'];
            }
            return [];
        });
        jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
            if (filePath.includes('config.json')) return JSON.stringify({
                videoSettings: { width: 1920, height: 1080 },
                logoOverlay: { enabled: true, position: 'top-right', width: 150 }
            });
            return '';
        });

        // spawn, execSync 모킹
        mockSpawn.mockClear();
        mockExecSync.mockClear();

        mockSpawn.mockReturnValue({
            on: jest.fn((event, callback) => { if (event === 'close') callback(0); }),
            stderr: { on: jest.fn() },
            stdout: { on: jest.fn() }
        });
        mockExecSync.mockReturnValue(Buffer.from("5.0"));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('로고 오버레이를 포함하여 최종 영상을 생성해야 함', async () => {
        const result = await generateFinalVideo();

        expect(mockSpawn).toHaveBeenCalled();
        const args = mockSpawn.mock.calls[0][1];
        const filterComplex = args[args.indexOf('-filter_complex') + 1];

        // 로고 오버레이 로직이 포함되었는지 확인
        expect(filterComplex).toContain('overlay=x=W-w-20:y=20');
        expect(filterComplex).toContain('[logo0]'); // scene_0_logo.png가 있으므로 logo0 필터가 생겨야 함
    });

    test('장면 파일이 없으면 에러를 던져야 함', async () => {
        jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
        await expect(generateFinalVideo()).rejects.toThrow('No scenes found to process.');
    });
});
