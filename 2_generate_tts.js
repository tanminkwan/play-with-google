import { generateBatchTTS } from "./lib/generate_batch_tts.js";

/**
 * @param {object} scriptData - 1단계에서 생성된 스크립트 JSON
 */
export async function main(scriptData) {
    const results = await generateBatchTTS(scriptData);
    return { audioFiles: results };
}
