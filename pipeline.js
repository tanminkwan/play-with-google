import * as collectNews from './0_collect_news.js';
import * as getNewsScript from './1_get_news_script.js';
import { generateBatchTTS } from './lib/generate_batch_tts.js';
import { generateImagesForScenes } from './lib/generate_images.js';
import { generateFinalVideo } from './lib/generate_video.js';
import { uploadToYouTube } from './lib/youtube_uploader.js';
import { sendUploadNotification } from './lib/email_notifier.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 전 과정 자동 실행 파이프라인 (Refactored for keyword-based scraping)
 * @param {string} keyword - 검색할 뉴스 키워드
 * @param {string} language - 결과 언어 (기본: Korean)
 * @param {string} model - AI 모델 (기본: openai)
 */
export async function runFullPipeline(keyword = "실시간", language = "Korean", model = "openai") {
    console.log(`\n🚀 Starting Full AI News Pipeline (Keyword: ${keyword})\n`);

    try {
        // Step 0: 뉴스 수집 및 문맥 생성 (config.json의 maxItems 등 설정 자동 적용)
        console.log("Step 0: Collecting News Data...");
        await collectNews.main(keyword);

        // Step 1: 대본 생성 (수집된 videos/news_context.json 파일을 참조함)
        console.log("\nStep 1: Generating News Script...");
        const scriptData = await getNewsScript.main(language, model);

        // Step 2: TTS 음성 생성
        console.log("\nStep 2: Generating Speech (TTS)...");
        await generateBatchTTS(scriptData);

        // Step 3: 이미지 생성
        console.log("\nStep 3: Generating Images (DALL-E)...");
        await generateImagesForScenes();

        // Step 4: 영상 합성
        console.log("\nStep 4: Assembling Video (FFmpeg)...");
        const videoPath = await generateFinalVideo();

        // Step 5: YouTube 업로드
        console.log("\nStep 5: Uploading to YouTube...");
        const videoTitle = `[AI News] ${scriptData.summary.substring(0, 50)}...`;
        const uploadResult = await uploadToYouTube({
            videoPath,
            title: videoTitle,
            description: scriptData.summary
        });

        console.log("\n✅ Pipeline Completed Successfully!");
        console.log(`📺 Watch here: https://www.youtube.com/watch?v=${uploadResult.id}`);

        // Step 6: 이메일 알림 발송
        console.log("\nStep 6: Sending Email Notification...");
        await sendUploadNotification({
            title: videoTitle,
            videoId: uploadResult.id,
            summary: scriptData.summary
        });
        console.log("📨 Email notification sent!");

    } catch (error) {
        console.error("\n❌ Pipeline Failed at some point:");
        console.error(error.message);
        process.exit(1);
    }
}

// CLI 실행
if (process.argv[1] && process.argv[1].includes('pipeline.js')) {
    const keyword = process.argv[2] || "실시간"; // 키워드가 없으면 실시간 뉴스
    const language = process.argv[3] || "Korean";
    const model = process.argv[4] || "openai";

    runFullPipeline(keyword, language, model);
}
