import { jest } from '@jest/globals';

const sendMailMock = jest.fn();

jest.unstable_mockModule('nodemailer', () => ({
    default: {
        createTransport: jest.fn().mockReturnValue({
            sendMail: sendMailMock
        })
    }
}));

const { default: nodemailer } = await import('nodemailer');
const { sendUploadNotification } = await import('../lib/email_notifier.js');
import fs from 'fs';

describe('Email Notifier Unit Tests', () => {

    beforeEach(() => {
        sendMailMock.mockClear();
        sendMailMock.mockResolvedValue({ messageId: 'test-id' });

        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
            notification: { emails: 'test@example.com' }
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
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
            to: expect.anything(),
            subject: expect.stringContaining(mockData.title),
            html: expect.stringContaining(mockData.videoId)
        }));
        expect(result.success).toBe(true);
    });

    it('should handle email sending failure', async () => {
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
