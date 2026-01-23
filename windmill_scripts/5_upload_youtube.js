/**
 * @param {string} videoPath - Path to the final mp4 file
 * @param {object} scriptData - Script data to extract title/desc
 */
export async function main(videoPath, scriptData) {
    const { APP_DIR } = await import("./path_config.js");
    const { uploadToYouTube } = await import(`${APP_DIR}/youtube_uploader.js`);

    const videoTitle = `[AI News] ${scriptData.summary.substring(0, 50)}...`;
    const videoDesc = scriptData.summary;

    const result = await uploadToYouTube({
        videoPath,
        title: videoTitle,
        description: videoDesc
    });

    return {
        success: true,
        videoId: result.id,
        url: `https://www.youtube.com/watch?v=${result.id}`
    };
}
