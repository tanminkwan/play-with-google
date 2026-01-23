const { uploadToYouTube } = require('../youtube_uploader');
const { google } = require('googleapis');
const fs = require('fs');

// 모킹
jest.mock('googleapis', () => ({
    google: {
        youtube: jest.fn(),
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                setCredentials: jest.fn(),
                generateAuthUrl: jest.fn(),
                getToken: jest.fn()
            }))
        }
    }
}));
jest.mock('fs');

describe('youtube_uploader Module (TDD)', () => {
    let mockInsert;

    beforeEach(() => {
        mockInsert = jest.fn().mockResolvedValue({
            data: { id: 'test-video-id' }
        });
        google.youtube.mockReturnValue({
            videos: {
                insert: mockInsert
            }
        });

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify({ access_token: 'test-token' }));
        fs.createReadStream.mockReturnValue({});
        fs.statSync.mockReturnValue({ size: 1000 });

        process.env.GOOGLE_CLIENT_ID = 'test-id';
        process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
    });

    afterEach(() => {
        jest.clearAllMocks();
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
        fs.existsSync.mockImplementation((path) => !path.includes('token.json'));
        await expect(uploadToYouTube({ videoPath: 'test.mp4' }))
            .rejects.toThrow('OAuth token not found');
    });

    test('비디오 파일이 없으면 에러를 던져야 함', async () => {
        fs.existsSync.mockImplementation((path) => !path.includes('test.mp4'));
        await expect(uploadToYouTube({ videoPath: 'test.mp4' }))
            .rejects.toThrow('Video file not found');
    });
});
