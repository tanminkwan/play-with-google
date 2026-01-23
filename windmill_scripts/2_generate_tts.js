/**
 * @param {object} scriptData - The script data JSON from step 1
 */
export async function main(scriptData) {
    const { APP_DIR } = await import("./path_config.js");
    const { generateBatchTTS } = await import(`${APP_DIR}/generate_batch_tts.js`);
    const results = await generateBatchTTS(scriptData);
    return { audioFiles: results };
}
