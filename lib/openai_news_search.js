import { OpenAI } from "openai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 설정 파일 로드
const configPath = path.join(__dirname, '..', 'config.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

/**
 * OpenAI를 사용하여 뉴스를 검색하고 대화형 대본을 생성하는 모듈
 */
export async function generateNewsScriptWithOpenAI(keyword, language = "Korean", newsContext = null) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY not found in .env file.");
    }

    const openai = new OpenAI({ apiKey });

    // 설정 파일에서 프롬프트 템플릿 가져오기
    let promptTemplate = config.pipeline?.newsSearchPrompt || `
        Keyword: "\${keyword}"
        Language: "\${language}"
        
        Task:
        1. Use the provided real-time news data (which includes publication dates) to find the absolute latest developments about "\${keyword}".
        2. Create a \${duration} natural dialogue script between two news anchors in \${language}:
           - \${nameA}: Male, enthusiastic voice, asks deep questions about the newest findings.
           - \${nameB}: Female, expert/friendly voice, provides key details and explains the timeline of events.
        3. Prioritize information from the most recent articles. If there are conflicting details, follow the latest one.
        4. The tone must be engaging, conversational, and polished (NotebookLM podcast style).
        5. Mention the timing of the news (e.g., "just released today", "recently announced") where appropriate to add urgency.
        6. Include natural filler words and reactions appropriate for \${language} speakers.
        
        Output format: MUST be a valid JSON object only:
        {
          "summary": "Overall summary of the topic in \${language}",
          "script": [
            { "speaker": "\${nameA}", "text": "...", "emotion": "excited" },
            { "speaker": "\${nameB}", "text": "...", "emotion": "informative" }
          ]
        }
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
        console.log(`--- Generating ${language} Script for: ${keyword} ---`);

        const response = await openai.chat.completions.create({
            model: config.pipeline?.openaiModel || "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are a professional journalist. Respond ONLY in valid JSON. ${newsContext ? "Base your script on the following real-time news data:\n" + newsContext : ""}`
                },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const scriptData = JSON.parse(response.choices[0].message.content);

        console.log(`--- Success! ${language} Script Generated ---`);
        return scriptData;
    } catch (error) {
        console.error("--- OpenAI Script Generation Failed ---");
        throw error;
    }
}

// CLI 실행 처리
if (process.argv[1] && process.argv[1].includes('openai_news_search.js')) {
    (async () => {
        const testKeyword = process.argv[2] || "CES 2026";
        const testLanguage = process.argv[3] || "Korean";
        try {
            const scriptData = await generateNewsScriptWithOpenAI(testKeyword, testLanguage);
            const outputPath = path.join(__dirname, '..', 'news_script.json');
            fs.writeFileSync(outputPath, JSON.stringify(scriptData, null, 2));
            console.log(`Script saved to ${outputPath}`);
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    })();
}
