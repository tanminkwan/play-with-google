const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");
const https = require("https");
require('dotenv').config();

// 설정 파일 로드
const configPath = path.join(__dirname, 'config.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

/**
 * URL에서 이미지를 다운로드하여 저장하는 유틸리티
 */
async function downloadImage(url, outputPath) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };
        https.get(url, options, (response) => {
            if (response.statusCode === 200) {
                const file = fs.createWriteStream(outputPath);
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(outputPath);
                });
            } else {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * 로고 이미지를 검색하여 다운로드하는 함수 (하이브리드 방식 데모)
 */
/**
 * 로고 이미지를 검색하여 다운로드하는 함수 (하이브리드 방식 일반화)
 */
async function searchAndDownloadLogo(entity, domain, outputPath) {
    if (!domain && !entity) return null;

    console.log(`Searching for logo for: ${entity} (Domain: ${domain})`);

    // 1. 도메인이 있으면 Google Favicon API 활용 (Clearbit보다 접근성이 좋음)
    let logoUrl = domain ? `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128` : null;

    // 2. 도메인이 없을 때만 설정 파일의 Fallback 리스트 활용
    if (!logoUrl && entity && config.logoOverlay?.fallbackLogos) {
        const fallbacks = config.logoOverlay.fallbackLogos;
        const matchedKey = Object.keys(fallbacks).find(key => entity.toLowerCase().includes(key.toLowerCase()));
        logoUrl = matchedKey ? fallbacks[matchedKey] : null;
    }

    if (logoUrl) {
        console.log(`Found logo source: ${logoUrl}`);
        try {
            await module.exports.downloadImage(logoUrl, outputPath);
            return outputPath;
        } catch (err) {
            console.error(`Failed to download logo: ${err.message}`);
        }
    } else {
        console.log(`No logo found for ${entity}.`);
    }

    return null;
}

/**
 * 대사(텍스트)를 분석하여 DALL-E용 시각적 묘사와 엔티티(회사명 등)를 추출하는 함수
 */
async function optimizePromptForImage(openai, sceneText) {
    try {
        const response = await openai.chat.completions.create({
            model: config.pipeline?.openaiModel || "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: config.imageGeneration?.optimizationPrompt || "You are a professional prompt engineer for DALL-E 3. Output ONLY a JSON object: {'optimizedPrompt': '...', 'entity': '...', 'domain': '...'}"
                },
                {
                    role: "user",
                    content: `Analyze this news scene text and create a visual description: "${sceneText}"`
                }
            ],
            response_format: { type: "json_object" }
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error("Prompt optimization failed, using original text:", error.message);
        return { optimizedPrompt: sceneText, entity: null, domain: null };
    }
}

/**
 * ./videos/scenes/*.txt 파일을 읽어 각 장면에 맞는 이미지를 DALL-E로 생성
 */
async function generateImagesForScenes() {
    console.log("--- DALL-E Image Generation Starting With Optimization & Entity Extraction ---");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY not found.");
    }

    const openai = new OpenAI({ apiKey });
    const scenesDir = path.join(__dirname, 'videos', 'scenes');

    if (!fs.existsSync(scenesDir)) {
        throw new Error(`Scenes directory not found: ${scenesDir}`);
    }

    const files = fs.readdirSync(scenesDir)
        .filter(f => f.endsWith('.txt'))
        .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)[0]);
            const numB = parseInt(b.match(/\d+/)[0]);
            return numA - numB;
        });

    console.log(`Found ${files.length} text files for image generation.`);

    const results = [];
    let lastImagePath = null;

    for (const file of files) {
        const filePath = path.join(scenesDir, file);
        const sceneText = fs.readFileSync(filePath, 'utf8');
        const sceneIndex = parseInt(file.match(/\d+/)[0]);
        const outputPath = path.join(scenesDir, `scene_${sceneIndex}.png`);
        const logoPath = path.join(scenesDir, `scene_${sceneIndex}_logo.png`);

        console.log(`[${results.length + 1}/${files.length}] Processing Scene ${sceneIndex}...`);

        try {
            // 1. 프롬프트 최적화 및 엔티티 추출
            const { optimizedPrompt, entity, domain } = await optimizePromptForImage(openai, sceneText);
            console.log(`Optimized Prompt: ${optimizedPrompt.substring(0, 100)}...`);
            if (entity) console.log(`Detected Entity: ${entity} (Domain: ${domain})`);

            // 2. DALL-E 이미지 생성
            const response = await openai.images.generate({
                model: config.imageGeneration?.model || "dall-e-3",
                prompt: `${config.imageGeneration?.style || ""} ${optimizedPrompt}`,
                n: 1,
                size: config.imageGeneration?.size || "1024x1024",
            });

            const imageUrl = response.data[0].url;
            await module.exports.downloadImage(imageUrl, outputPath);
            console.log(`Image generated for Scene ${sceneIndex}`);

            // 3. 엔티티가 있는 경우 로고 다운로드 시도 (하이브리드 방식 일반화)
            if ((entity || domain) && config.logoOverlay?.enabled) {
                await module.exports.searchAndDownloadLogo(entity, domain, logoPath);
            }

            results.push(outputPath);
            lastImagePath = outputPath;

        } catch (error) {
            console.error(`Failed to generate image for ${file}:`, error.message);

            if (sceneIndex === 0) {
                // 0번 scene 실패 시: 두 앵커가 desk에 앉아있는 이미지 시도
                console.log("Scene 0 failed. Attempting to generate fallback 'Anchors at Desk' image...");
                try {
                    const fallbackResponse = await openai.images.generate({
                        model: config.imageGeneration?.model || "dall-e-3",
                        prompt: `${config.imageGeneration?.style || ""} Two news anchors sitting at a news desk in a professional studio, looking at the camera.`,
                        n: 1,
                        size: config.imageGeneration?.size || "1024x1024",
                    });
                    const imageUrl = fallbackResponse.data[0].url;
                    await module.exports.downloadImage(imageUrl, outputPath);
                    console.log(`Fallback image generated for Scene ${sceneIndex}`);
                    results.push(outputPath);
                    lastImagePath = outputPath;
                } catch (fallbackError) {
                    console.error("Critical: Failed to generate fallback image for Scene 0.");
                }
            } else if (lastImagePath) {
                // 그 외 scene 실패 시: 이전 scene 이미지 재사용
                console.log(`Reusing previous image for Scene ${sceneIndex}: ${lastImagePath}`);
                fs.copyFileSync(lastImagePath, outputPath);
                results.push(outputPath);
            }
        }
    }

    console.log("--- Success! All images generated ---");
    return results;
}

module.exports = { generateImagesForScenes, downloadImage, searchAndDownloadLogo };

if (require.main === module) {
    (async () => {
        try {
            await generateImagesForScenes();
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    })();
}
