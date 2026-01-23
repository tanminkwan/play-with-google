/**
 * @param {object} scriptData - The script data JSON from step 1
 */
export async function main(scriptData) {
    const { generateBatchTTS } = await import("/home/node/app/generate_batch_tts.js");
    const results = await generateBatchTTS(scriptData);
    return { audioFiles: results };
}
