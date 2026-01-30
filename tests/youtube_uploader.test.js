import { jest } from '@jest/globals';

const mockInsert = jest.fn();
const mockOAuth2 = jest.fn().mockImplementation(() => ({
    setCredentials: jest.fn(),
    generateAuthUrl: jest.fn(),
    getToken: jest.fn()
}));

jest.unstable_mockModule('googleapis', () => ({
    google: {
        youtube: jest.fn().mockReturnValue({
            videos: { insert: mockInsert }
        }),
        auth: {
            OAuth2: mockOAuth2
        }
    }
}));

const { google } = await import('googleapis');
const { uploadToYouTube } = await import('../lib/youtube_uploader.js');
import fs from 'fs';

describe('youtube_uploader Module (TDD)', () => {

    beforeEach(() => {
        mockInsert.mockClear();
        mockInsert.mockResolvedValue({ data: { id: 'test-video-id' } });

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ access_token: 'test-token' }));
        jest.spyOn(fs, 'createReadStream').mockReturnValue({});
        jest.spyOn(fs, 'statSync').mockReturnValue({ size: 1000 });

        process.env.GOOGLE_CLIENT_ID = 'test-id';
        process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('비디오를 성공적으로 YouTube에 업로드해야 함', async () => {
        const params = {
            videoPath: 'test.mp4',
            title: 'Test Title',
            description: 'Test Desc'
        };

        const result = await uploadToYouTube(params);

        expect(result.id).toBe('test-video-id');
        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                requestBody: expect.objectContaining({
                    snippet: expect.objectContaining({
                        title: 'Test Title'
                    })
                })
            }),
            expect.any(Object)
        );
    });

    test('토큰 파일이 없으면 에러를 던져야 함', async () => {
        jest.spyOn(fs, 'existsSync').mockImplementation((path) => !path.includes('token.json'));
        await expect(uploadToYouTube({ videoPath: 'test.mp4' }))
            .rejects.toThrow('OAuth token not found');
    });

    test('비디오 파일이 없으면 에러를 던져야 함', async () => {
        jest.spyOn(fs, 'existsSync').mockImplementation((path) => !path.includes('test.mp4'));
        await expect(uploadToYouTube({ videoPath: 'test.mp4' }))
            .rejects.toThrow('Video file not found');
    });
});
