/**
 * 비디오 합성 단계
 */
async function main() {
    const { generateFinalVideo } = require("./lib/generate_video");
    const videoPath = await generateFinalVideo();
    return { videoPath };
}

module.exports = { main };
