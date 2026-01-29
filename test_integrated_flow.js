const { main } = require('./1_get_news_script');

async function testIntegratedFlow() {
    console.log("🚀 Starting Integrated Test: Naver Scraper -> AI Script Generation\n");

    try {
        // '실시간' 키워드를 던지면 내부에서 네이버 랭킹 뉴스를 긁어옴
        const scriptData = await main("실시간", "Korean", "openai");

        console.log("\n✅ Test Successful! Script Generated based on Real-time News:");
        console.log("Summary:", scriptData.summary);
        console.log("First Scene:", scriptData.script[0]);

    } catch (error) {
        console.error("\n❌ Integrated Test Failed:");
        console.error(error);
    }
}

testIntegratedFlow();
