import fs from "fs";
import path from "path";
import { generateNewsScriptWithOpenAI } from "./lib/openai_news_search.js";
import { generateNewsScript } from "./lib/gemini_news_search.js";

/**
 * [Step 1] 저장된 뉴스 정보를 바탕으로 대본을 생성합니다.
 * @param {string} language - 언어
 * @param {string} model - 모델 (openai/gemini)
 */
export async function main(language = "Korean", model = "openai") {
    // 1. Step 0에서 생성된 뉴스 컨텍스트 파일 읽기
    const contextPath = path.resolve("./videos/news_context.json");
    let newsContext = null;
    let keyword = "Latest News";

    if (fs.existsSync(contextPath)) {
        console.log(`--- Job 1: Reading news context from ${contextPath} ---`);
        const contextData = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
        newsContext = contextData.formattedContext;
        keyword = contextData.keyword;
    } else {
        console.log("⚠️ No news_context.json found. Proceeding with internal knowledge.");
    }

    // 2. 기존 작업 데이터 삭제 (Shared Volume Cleanup)
    const scenesDir = path.resolve("./videos/scenes");
    if (fs.existsSync(scenesDir)) {
        console.log(`Cleaning up: ${scenesDir}`);
        const files = fs.readdirSync(scenesDir);
        for (const file of files) {
            fs.unlinkSync(path.join(scenesDir, file));
        }
    }

    // 3. 대본 생성
    let scriptData;
    if (model === "openai") {
        scriptData = await generateNewsScriptWithOpenAI(keyword, language, newsContext);
    } else {
        scriptData = await generateNewsScript(keyword, language, newsContext);
    }

    // 다음 작업을 위해 news_script.json 저장 (로컬 보관용)
    const scriptPath = path.resolve("./videos/news_script.json");
    fs.writeFileSync(scriptPath, JSON.stringify(scriptData, null, 2));

    return scriptData;
}

if (process.argv[1] && process.argv[1].includes('1_get_news_script.js')) {
    const args = process.argv.slice(2);
    main(args[0], args[1]);
}
