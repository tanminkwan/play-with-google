/**
 * @param {string} videoId - YouTube 영상 ID
 * @param {object} scriptData - 제목/요약 정보 포함 데이터
 */
async function main(videoId, scriptData) {
    const { sendUploadNotification } = require("./lib/email_notifier");

    const videoTitle = `[AI News] ${scriptData.summary.substring(0, 50)}...`;

    const result = await sendUploadNotification({
        title: videoTitle,
        videoId: videoId,
        summary: scriptData.summary
    });

    return {
        success: true,
        messageId: result.messageId
    };
}

module.exports = { main };
