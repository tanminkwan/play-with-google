---
description: Autonomous Nightly News Pipeline
---

// turbo-all

1. Scrape Samsung News
```bash
node 0_collect_news.js "삼성전자" 3
```

2. Generate Script
```bash
node 1_get_news_script.js
```

3. Run Full Video Pipeline
```bash
node pipeline.js "삼성전자"
```
