const { OpenAI } = require("openai");
require('dotenv').config();
const fs = require('fs');

/**
 * OpenAI를 사용하여 뉴스를 검색하고 대화형 대본을 생성하는 모듈
 */
async function generateNewsScriptWithOpenAI(keyword, language = "Korean") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY not found in .env file.");
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `
        Keyword: "${keyword}"
        Language: "${language}"
        
        Task:
        1. Use your internal knowledge to find the latest news about this keyword.
        2. Create a 2-minute natural dialogue script between two news anchors in ${language}:
           - Anchor A: Male, enthusiastic voice, asks deep questions.
           - Anchor B: Female, expert/friendly voice, provides key details.
        3. The tone must be engaging, conversational, and polished (NotebookLM podcast style).
        4. Include natural filler words and reactions appropriate for ${language} speakers (e.g., in Korean: "아~", "그렇군요", "정말요?").
        
        Output format: MUST be a valid JSON object only:
        {
          "summary": "Overall summary of the topic in ${language}",
          "script": [
            { "speaker": "Anchor A", "text": "Text in ${language}...", "emotion": "excited" },
            { "speaker": "Anchor B", "text": "Text in ${language}...", "emotion": "informative" }
          ]
        }
        
        Important: Script must be entirely in ${language}.
    `;

    try {
        console.log(`--- Generating ${language} Script for: ${keyword} ---`);

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: `You are a professional news scriptwriter. You write scripts in the requested language: ${language}.` },
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

// 모듈 내보내기
module.exports = { generateNewsScriptWithOpenAI };

// CLI 실행 처리 (main 모듈일 때만 실행)
if (require.main === module) {
    (async () => {
        const testKeyword = process.argv[2] || "CES 2026";
        const testLanguage = process.argv[3] || "Korean";
        try {
            const scriptData = await generateNewsScriptWithOpenAI(testKeyword, testLanguage);
            fs.writeFileSync('news_script.json', JSON.stringify(scriptData, null, 2));
            console.log("Script saved to news_script.json");
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    })();
}
