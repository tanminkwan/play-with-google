/**
 * @param {string} videoId - The YouTube Video ID
 * @param {object} scriptData - The script data containing title and summary
 */
export async function main(videoId, scriptData) {
    const { sendUploadNotification } = await import("#root/email_notifier.js");

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
