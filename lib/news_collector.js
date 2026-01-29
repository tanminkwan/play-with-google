const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 설정 파일 로드
const configPath = path.join(__dirname, '..', 'config.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

/**
 * Gemini 2.0의 Google Search 도구를 사용하여 최신 뉴스 데이터를 수집합니다.
 * @param {string} keyword - 검색 키워드
 * @returns {Promise<Object>} 수집 및 요약된 뉴스 데이터
 */
async function collectNewsData(keyword) {
    console.log(`--- Collecting Real-time News via Gemini Search for: "${keyword}" ---`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY not found in .env");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: config.pipeline?.geminiModel || "gemini-2.0-flash-lite",
        tools: [{ googleSearch: {} }] // Gemini 실시간 검색 도구 활성화
    });

    const prompt = `
        Search for the latest, most relevant news about "${keyword}".
        Provide a comprehensive summary of the current situation.
        Return the result in the following JSON format:
        {
          "keyword": "${keyword}",
          "collectedAt": "${new Date().toISOString()}",
          "summary": "Detailed summary of findings",
          "articles": [
            { "title": "...", "source": "...", "date": "...", "url": "..." }
          ]
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // JSON 추출
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const newsData = JSON.parse(text);

        console.log(`✅ Successfully collected news information via Gemini.`);
        return newsData;
    } catch (error) {
        console.error("❌ Gemini News Collection Failed:");
        console.error(error.message);
        throw error;
    }
}

/**
 * AI 대본 생성기가 읽기 좋은 텍스트 컨텍스트로 변환합니다.
 */
function formatNewsContext(newsData) {
    if (!newsData || !newsData.summary) return "No real-time news available.";

    let context = "Real-time News Context (via Google Search):\n\n";
    context += `[Summary]\n${newsData.summary}\n\n`;

    if (newsData.articles && newsData.articles.length > 0) {
        context += "[Reference Articles]\n";
        newsData.articles.forEach((art, idx) => {
            context += `${idx + 1}. ${art.title} (${art.source}, ${art.date})\n   Link: ${art.url}\n`;
        });
    }

    return context;
}

module.exports = { collectNewsData, formatNewsContext };

// CLI 실행 처리
if (require.main === module) {
    (async () => {
        const testKeyword = process.argv[2] || "CES 2026";
        try {
            const data = await collectNewsData(testKeyword);
            const context = formatNewsContext(data);
            const outputPath = path.join(__dirname, '..', 'news_context.json');

            fs.writeFileSync(outputPath, JSON.stringify({
                ...data,
                formatted_context: context
            }, null, 2));

            console.log(`Context saved to ${outputPath}`);
            console.log("\n--- Preview ---\n");
            console.log(context.substring(0, 800) + "...");
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    })();
}
