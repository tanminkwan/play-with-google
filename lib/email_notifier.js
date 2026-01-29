const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * 유튜브 업로드 완료 알림 이메일을 발송합니다.
 * @param {Object} data 
 * @param {string} data.title - 영상 제목
 * @param {string} data.videoId - 유튜브 영상 ID
 * @param {string} data.summary - 영상 요약 내용
 */
async function sendUploadNotification({ title, videoId, summary }) {
    const configPath = path.join(__dirname, '..', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const notifyConfig = config.notification || {};
    const recipients = notifyConfig.emails || notifyConfig.email || process.env.NOTIFICATION_EMAIL;
    const smtpService = notifyConfig.smtpService || 'gmail';
    const senderName = notifyConfig.senderName || 'AI News Automator';
    const subjectPrefix = notifyConfig.subjectPrefix || '🎬 [업로드 완료]';
    const template = notifyConfig.template || {};

    const transporter = nodemailer.createTransport({
        service: smtpService,
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const mailOptions = {
        from: `"${senderName}" <${process.env.GMAIL_USER}>`,
        to: recipients,
        subject: `${subjectPrefix} ${title}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #FF0000; text-align: center;">${template.title || '📺 YouTube 업로드 완료'}</h2>
                <hr>
                <p><strong>${template.labelTitle || '제목'}:</strong> ${title}</p>
                <p><strong>${template.labelLink || '영상 링크'}:</strong> <a href="${videoUrl}">${videoUrl}</a></p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px;">
                    <p style="margin-top: 0;"><strong>${template.labelSummary || '내용 요약'}:</strong></p>
                    <p style="white-space: pre-wrap;">${summary}</p>
                </div>
                <hr>
                <p style="font-size: 0.8em; color: #888; text-align: center;">${template.footer || '이 메일은 AI 자동화 시스템에 의해 발송되었습니다.'}</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        throw error;
    }
}

module.exports = { sendUploadNotification };
