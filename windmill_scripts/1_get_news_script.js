/**
 * @param {string} keyword - The keyword to search for news
 * @param {string} language - The language of the script (Korean/English)
 * @param {string} model - AI model to use (gemini/openai)
 */
export async function main(keyword, language = "Korean", model = "openai") {
    // In Windmill, we need to require or import the modules.
    // Since we mounted the app folder to /home/node/app, we can use relative paths or change directory.
    // However, it's better to use variables for API keys.

    const fs = await import("fs");
    const path = await import("path");
    const { generateNewsScriptWithOpenAI } = await import("#root/openai_news_search.js");
    const { generateNewsScript } = await import("#root/gemini_news_search.js");

    // Cleanup previous assets (shared volume)
    const scenesDir = "/home/node/videos/scenes"; // 이건 volumes 경로
    if (fs.existsSync(scenesDir)) {
        console.log("Cleaning up previous scene assets in Windmill worker...");
        const files = fs.readdirSync(scenesDir);
        for (const file of files) {
            fs.unlinkSync(path.join(scenesDir, file));
        }
    }

    let scriptData;
    if (model === "openai") {
        scriptData = await generateNewsScriptWithOpenAI(keyword, language);
    } else {
        scriptData = await generateNewsScript(keyword, language);
    }

    return scriptData;
}
