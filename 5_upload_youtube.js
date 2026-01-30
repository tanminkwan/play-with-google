import { uploadToYouTube } from "./lib/youtube_uploader.js";

/**
 * @param {string} videoPath - 최종 mp4 파일 경로
 * @param {object} scriptData - 요약 정보 추출용 데이터
 */
export async function main(videoPath, scriptData) {
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
