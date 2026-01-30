import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Gemini를 사용하여 뉴스를 검색하고 대화형 대본을 생성하는 모듈
 */
export async function generateNewsScript(keyword, language = "Korean", newsContext = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY not found in .env file.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "models/gemini-2.0-flash-lite",
    });

    // 설정 파일 로드
    const configPath = path.join(__dirname, '..', 'config.json');
    const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

    // 설정 파일에서 프롬프트 템플릿 가져오기
    let promptTemplate = config.pipeline?.newsSearchPrompt || `
        Keyword: "\${keyword}"
        Language: "\${language}"
        
        Task:
        1. Analyze the provided news articles about "\${keyword}", paying close attention to the publication dates.
        2. Focus on the absolute latest developments and summarize the findings in \${language}.
        3. Create a \${duration} dialogue script between two news anchors (\${nameA} - male, \${nameB} - female) in \${language}.
        4. The script should reflect the fact that this is fresh, recent news. Use phrases like "just in", "breaking now", or "this morning's report".
        5. The tone should be engaging, informative, and natural (like NotebookLM's Audio Overview in \${language}).
        6. Include natural filler words and reactions appropriate for \${language} speakers.
        6. Return the result in the following JSON format:
        {
          "summary": "General summary of the news in \${language}",
          "script": [
            { "speaker": "\${nameA}", "text": "Dialogue in \${language}...", "emotion": "excited" },
            { "speaker": "\${nameB}", "text": "Dialogue in \${language}...", "emotion": "surprised" }
          ]
        }
        
        Important: Return ONLY the JSON object. The entire content must be in \${language}.
    `;

    // 템플릿 변수 치환
    const nameA = config.pipeline?.anchorNames?.A || "Anchor A";
    const nameB = config.pipeline?.anchorNames?.B || "Anchor B";

    const prompt = promptTemplate
        .replace(/\${keyword}/g, keyword)
        .replace(/\${language}/g, language)
        .replace(/\${duration}/g, config.pipeline?.scriptDuration || "2-minute")
        .replace(/\${nameA}/g, nameA)
        .replace(/\${nameB}/g, nameB);

    try {
        console.log(`--- Searching and Generating ${language} Script for: ${keyword} ---`);
        const fullPrompt = newsContext
            ? `You are a professional journalist. Base your script on the following news data:\n${newsContext}\n\nTask:\n${prompt}`
            : prompt;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        let text = response.text();

        // JSON 추출 (마크다운 코드 블록 제거 등)
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const scriptData = JSON.parse(text);

        console.log(`--- Success! ${language} Script Generated ---`);
        return scriptData;
    } catch (error) {
        console.error(`--- Gemini ${language} Search Failed ---`);
        throw error;
    }
}

// 테스트 실행 처리
if (process.argv[1] && process.argv[1].includes('gemini_news_search.js')) {
    (async () => {
        const testKeyword = process.argv[2] || "Apple Vision Pro";
        const testLanguage = process.argv[3] || "Korean";
        try {
            const scriptData = await generateNewsScript(testKeyword, testLanguage);
            fs.writeFileSync('news_script.json', JSON.stringify(scriptData, null, 2));
            console.log("Script saved to news_script.json");
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    })();
}
