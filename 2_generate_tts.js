/**
 * @param {object} scriptData - 1단계에서 생성된 스크립트 JSON
 */
async function main(scriptData) {
    const { generateBatchTTS } = require("./lib/generate_batch_tts");
    const results = await generateBatchTTS(scriptData);
    return { audioFiles: results };
}

module.exports = { main };
