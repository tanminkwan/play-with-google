/**
 * @param {string} keyword - The keyword to search for news
 * @param {string} language - The language of the script (Korean/English)
 * @param {string} model - AI model to use (gemini/openai)
 */
export async function main(keyword, language = "Korean", model = "openai") {
    // In Windmill, we need to require or import the modules.
    // Since we mounted the app folder to /home/node/app, we can use relative paths or change directory.
    // However, it's better to use variables for API keys.

    const { generateNewsScriptWithOpenAI } = await import("/home/node/app/openai_news_search.js");
    const { generateNewsScript } = await import("/home/node/app/gemini_news_search.js");

    let scriptData;
    if (model === "openai") {
        scriptData = await generateNewsScriptWithOpenAI(keyword, language);
    } else {
        scriptData = await generateNewsScript(keyword, language);
    }

    return scriptData;
}
