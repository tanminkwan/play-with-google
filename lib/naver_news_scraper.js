const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function scrapeNaverNews(keyword = "삼성전자", limit = 3) {
    console.log(`[Scraper] Starting for keyword: ${keyword}`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 }
        });

        const page = await context.newPage();
        const searchUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(keyword)}&sort=0`;

        console.log(`[Scraper] Navigating to search page...`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        // STRATEGY: Find all links to "n.news.naver.com" (Naver News Portal)
        // This bypasses complex UI structures and random class names.
        const articleLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links
                .map(a => a.href)
                .filter(href => href.includes('n.news.naver.com/mnews/article'))
                .filter((v, i, a) => a.indexOf(v) === i); // Unique
        });

        console.log(`[Scraper] Found ${articleLinks.length} potential article links.`);

        if (articleLinks.length === 0) {
            console.log("[Scraper] No Naver News links found. Dumping HTML...");
            fs.writeFileSync('debug_final.html', await page.content());
        }

        const results = [];
        // Process only unique, valid matches up to the limit
        for (const link of articleLinks) {
            if (results.length >= limit) break;

            try {
                process.stdout.write(`[Scraper] Visiting: ${link.substring(0, 40)}... `);
                const articlePage = await context.newPage();
                await articlePage.goto(link, { waitUntil: 'domcontentloaded', timeout: 15000 });

                const data = await articlePage.evaluate(() => {
                    // Extract data directly from the article page (standardized structure)
                    const title = document.querySelector('meta[property="og:title"]')?.content || document.title;

                    // Main body selectors
                    const bodyEl = document.querySelector('#newsct_article') ||
                        document.querySelector('#dic_area') ||
                        document.querySelector('#articeBody');

                    if (!bodyEl) return null;

                    // Cleanups
                    bodyEl.querySelectorAll('script, style, .end_ad, .guide_txt, .img_desc').forEach(el => el.remove());

                    return {
                        title: title,
                        snippet: bodyEl.innerText.replace(/\s+/g, ' ').trim()
                    };
                });

                await articlePage.close();

                if (data) {
                    results.push({
                        title: data.title,
                        link: link,
                        source: "Naver News",
                        snippet: data.snippet
                    });
                    console.log("✅ OK");
                } else {
                    console.log("⚠️ Skipped (No Body)");
                }
            } catch (err) {
                console.log(`❌ Error: ${err.message}`);
            }
        }

        await browser.close();
        return results;

    } catch (err) {
        console.error(`[Scraper] Fatal: ${err.message}`);
        await browser.close();
        return [];
    }
}

function formatNaverContext(newsData) {
    if (!newsData || newsData.length === 0) return "No news data collected.";
    return newsData.map((n, i) =>
        `[Article ${i + 1}]\nTitle: ${n.title}\nSource: ${n.source}\nContent: ${n.snippet}\nLink: ${n.link}`
    ).join('\n\n');
}

module.exports = { scrapeNaverNews, formatNaverContext };
