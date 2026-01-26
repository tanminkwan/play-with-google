const { generateNewsScriptWithOpenAI } = require('./openai_news_search');
const { generateBatchTTS } = require('./generate_batch_tts');
const { generateImagesForScenes } = require('./generate_images');
const { generateFinalVideo } = require('./generate_video');
const { uploadToYouTube } = require('./youtube_uploader');
const { sendUploadNotification } = require('./email_notifier');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * 전 과정 자동 실행 파이프라인
 */
async function runFullPipeline(keyword, language = "Korean", model = "openai") {
    console.log(`\n🚀 Starting Full AI News Pipeline for: "${keyword}" (${language})\n`);

    try {
        // Step 0: 기존 작업 데이터 삭제 (Cleanup)
        const scenesDir = path.join(__dirname, 'videos', 'scenes');
        if (fs.existsSync(scenesDir)) {
            console.log("Step 0: Cleaning up previous scene assets...");
            const files = fs.readdirSync(scenesDir);
            for (const file of files) {
                fs.unlinkSync(path.join(scenesDir, file));
            }
        }
        // Step 1: 뉴스 검색 및 대본 생성
        console.log("Step 1: Generating News Script...");
        const scriptData = await generateNewsScriptWithOpenAI(keyword, language);
        fs.writeFileSync('news_script.json', JSON.stringify(scriptData, null, 2));

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
if (require.main === module) {
    const keyword = process.argv[2];
    const language = process.argv[3] || "Korean";

    if (!keyword) {
        console.log("Usage: node pipeline.js <keyword> [language]");
        process.exit(1);
    }

    runFullPipeline(keyword, language);
}

module.exports = { runFullPipeline };
