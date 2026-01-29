/**
 * 이미지 생성 단계
 */
async function main() {
    const { generateImagesForScenes } = require("./lib/generate_images");
    const results = await generateImagesForScenes();
    return { imageFiles: results };
}

module.exports = { main };
