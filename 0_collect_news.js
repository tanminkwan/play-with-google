import { scrapeNaverNews, formatNaverContext } from "./lib/naver_news_scraper.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 설정 파일 로드
const configPath = path.join(__dirname, 'config.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

export async function main(keyword, limit = config.newsScraper?.maxItems || 3) {
    if (!keyword) {
        throw new Error("Error: Keyword is required for news collection.");
    }
    try {
        console.log(`Starting Collection for: ${keyword}`);
        const data = await scrapeNaverNews(keyword, limit);

        if (data.length > 0) {
            const context = formatNaverContext(data);
            const outputDir = path.resolve('./videos');
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            const payload = {
                keyword,
                collectedAt: new Date().toISOString(),
                rawData: data,
                formattedContext: context
            };

            fs.writeFileSync(path.join(outputDir, 'news_context.json'), JSON.stringify(payload, null, 2));
            console.log("Context saved to videos/news_context.json");
        } else {
            console.error("No data collected.");
            process.exit(1);
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

if (process.argv[1] && process.argv[1].includes('0_collect_news.js')) {
    const args = process.argv.slice(2);
    main(args[0], args[1] ? parseInt(args[1]) : 3);
}
