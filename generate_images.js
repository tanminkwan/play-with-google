const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");
const https = require("https");
require('dotenv').config();

/**
 * URL에서 이미지를 다운로드하여 저장하는 유틸리티
 */
async function downloadImage(url, outputPath) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
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
 * 대사(텍스트)를 분석하여 DALL-E용 시각적 묘사로 요약/변환하는 함수
 */
async function optimizePromptForImage(openai, sceneText) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a professional prompt engineer for DALL-E 3. Your task is to summarize a news script dialogue into a single, highly detailed visual description for a professional news broadcast scene. Focus on the core subject, environment, and atmosphere. Do not include text or dialogue in the image description. Output ONLY the optimized English prompt."
                },
                {
                    role: "user",
                    content: `Analyze this news scene text and create a professional visual prompt: "${sceneText}"`
                }
            ],
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("Prompt optimization failed, using original text:", error.message);
        return sceneText;
    }
}

/**
 * ./videos/scenes/*.txt 파일을 읽어 각 장면에 맞는 이미지를 DALL-E로 생성
 */
async function generateImagesForScenes() {
    console.log("--- DALL-E Image Generation Starting With Optimization ---");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY not found.");
    }

    const openai = new OpenAI({ apiKey });
    const scenesDir = path.join(__dirname, 'videos', 'scenes');

    if (!fs.existsSync(scenesDir)) {
        throw new Error(`Scenes directory not found: ${scenesDir}`);
    }

    // 1. .txt 파일 목록 가져오기
    const files = fs.readdirSync(scenesDir)
        .filter(f => f.endsWith('.txt'))
        .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)[0]);
            const numB = parseInt(b.match(/\d+/)[0]);
            return numA - numB;
        });

    console.log(`Found ${files.length} text files for image generation.`);

    const results = [];

    // 2. 각 파일에 대해 이미지 생성
    for (const file of files) {
        const filePath = path.join(scenesDir, file);
        const sceneText = fs.readFileSync(filePath, 'utf8');
        const sceneIndex = file.match(/\d+/)[0];
        const outputPath = path.join(scenesDir, `scene_${sceneIndex}.png`);

        console.log(`[${results.length + 1}/${files.length}] Optimizing prompt and generating image for Scene ${sceneIndex}...`);

        try {
            // 2-1. 프롬프트 최적화 (요약)
            const optimizedPrompt = await optimizePromptForImage(openai, sceneText);
            console.log(`Optimized Prompt: ${optimizedPrompt.substring(0, 100)}...`);

            // 2-2. DALL-E 3 호출
            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: `A high-quality, photorealistic professional news broadcast scene. ${optimizedPrompt}`,
                n: 1,
                size: "1024x1024",
            });

            const imageUrl = response.data[0].url;
            console.log(`Image generated for Scene ${sceneIndex}`);

            // 이미지 다운로드 및 저장
            await module.exports.downloadImage(imageUrl, outputPath);
            results.push(outputPath);

        } catch (error) {
            console.error(`Failed to generate image for ${file}:`, error.message);
        }
    }

    console.log("--- Success! All images generated ---");
    return results;
}

// 모듈 내보내기
module.exports = { generateImagesForScenes, downloadImage };

// CLI 실행 처리
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
