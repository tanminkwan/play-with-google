const { sendUploadNotification } = require('../lib/email_notifier');
const nodemailer = require('nodemailer');

// nodemailer 모킹
jest.mock('nodemailer');

describe('Email Notifier Unit Tests', () => {
    let sendMailMock;

    beforeEach(() => {
        sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-id' });
        nodemailer.createTransport.mockReturnValue({
            sendMail: sendMailMock
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should send an email with correct YouTube info', async () => {
        const mockData = {
            title: 'Test AI News Video',
            videoId: 'dQw4w9WgXcQ',
            summary: 'This is a test summary for the video.'
        };

        const result = await sendUploadNotification(mockData);

        expect(nodemailer.createTransport).toHaveBeenCalled();
        expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
            to: expect.anything(), // Can be string or array
            subject: expect.stringContaining(mockData.title),
            html: expect.stringContaining(mockData.videoId)
        }));
        expect(result.success).toBe(true);
    });

    it('should handle email sending failure', async () => {
        // 의도된 에러 로그 출력 방지
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        sendMailMock.mockRejectedValue(new Error('SMTP Error'));

        const mockData = {
            title: 'Failed Video',
            videoId: 'error-id',
            summary: 'Failure test'
        };

        await expect(sendUploadNotification(mockData)).rejects.toThrow('SMTP Error');

        consoleSpy.mockRestore();
    });
});
