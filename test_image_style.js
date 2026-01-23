const { generateImagesForScenes } = require('./generate_images');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * 만화 스타일 이미지 생성을 확인하기 위한 테스트 스크립트
 */
async function testSingleImageGeneration() {
    const scenesDir = path.join(__dirname, 'videos', 'scenes');

    // 1. 테스트용 장면 텍스트 파일 생성
    if (!fs.existsSync(scenesDir)) {
        fs.mkdirSync(scenesDir, { recursive: true });
    }

    const testFilePath = path.join(scenesDir, 'scene_999.txt');
    const testContent = "Anchor A: 안녕하세요! 오늘은 새로운 디자인 스타일을 테스트해보고 있습니다. 만화 스타일로 잘 나올까요?";
    fs.writeFileSync(testFilePath, testContent);

    console.log("--- Testing Single Image Generation with Config Style ---");
    console.log(`Test Scene Text: ${testContent}`);

    try {
        // 기존 generateImagesForScenes는 모든 .txt 파일을 읽으므로, 
        // 테스트 파일을 잠시 생성하고 실행한 뒤 삭제함
        const results = await generateImagesForScenes();

        const testImage = results.find(p => p.includes('scene_999.png'));
        if (testImage) {
            console.log(`\n✅ Success! Test image generated at: ${testImage}`);
        } else {
            console.log("\n❌ Failed to find the test image in results.");
        }
    } catch (error) {
        console.error("\n❌ Error during test:", error.message);
    } finally {
        // 테스트 파일 정리
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
        // 생성된 테스트 이미지도 나중을 위해 일단 유지하거나 삭제 결정 가능 (여기서는 확인을 위해 유지 제안)
        console.log("\nNote: Generated image 'scene_999.png' is in videos/scenes/ for your review.");
    }
}

testSingleImageGeneration();
