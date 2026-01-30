import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

export async function scrapeNaverNews(keyword = "삼성전자", limit = 3) {
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
        const searchUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(keyword)}&sort=1`;

        console.log(`[Scraper] Navigating to search page (Sorted by Recency)...`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for the news list to appear
        try {
            await page.waitForSelector('.list_news, .news_list', { timeout: 10000 });
        } catch (e) {
            console.log("[Scraper] Warning: News list selector not found within 10s. Continuing anyway.");
        }
        await page.waitForTimeout(3000); // Give it some extra time

        // STRATEGY: Find all links to "n.news.naver.com" (Naver News Portal)
        const { articleLinks, allLinksCount } = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const naverLinks = links
                .map(a => a.href)
                .filter(href => href.includes('n.news.naver.com/mnews/article'))
                .filter((v, i, a) => a.indexOf(v) === i); // Unique
            return {
                articleLinks: naverLinks,
                allLinksCount: links.length
            };
        });

        console.log(`[Scraper] Found ${allLinksCount} total links, ${articleLinks.length} are Naver News links.`);

        if (articleLinks.length === 0) {
            console.log("[Scraper] No Naver News links found. Dumping HTML to debug_final.html...");
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

                    // Publication Date Selectors
                    const dateEl = document.querySelector('.media_end_head_info_datestamp_time') ||
                        document.querySelector('.media_end_head_info_dateline_time') ||
                        document.querySelector('.news_date') ||
                        document.querySelector('span.entry-date');

                    const dateText = dateEl?.getAttribute('data-date-time') ||
                        dateEl?.innerText ||
                        document.querySelector('meta[property="article:published_time"]')?.content ||
                        "Unknown Date";

                    // Main body selectors
                    const bodyEl = document.querySelector('#newsct_article') ||
                        document.querySelector('#dic_area') ||
                        document.querySelector('#articeBody');

                    if (!bodyEl) return null;

                    // Cleanups
                    bodyEl.querySelectorAll('script, style, .end_ad, .guide_txt, .img_desc').forEach(el => el.remove());

                    return {
                        title: title,
                        date: dateText,
                        snippet: bodyEl.innerText.replace(/\s+/g, ' ').trim()
                    };
                });

                await articlePage.close();

                if (data) {
                    results.push({
                        title: data.title,
                        link: link,
                        source: "Naver News",
                        date: data.date,
                        snippet: data.snippet
                    });
                    console.log(`✅ OK (${data.date})`);
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

export function formatNaverContext(newsData) {
    if (!newsData || newsData.length === 0) return "No news data collected.";
    return newsData.map((n, i) =>
        `[Article ${i + 1}]\nTitle: ${n.title}\nDate: ${n.date}\nSource: ${n.source}\nContent: ${n.snippet}\nLink: ${n.link}`
    ).join('\n\n');
}
