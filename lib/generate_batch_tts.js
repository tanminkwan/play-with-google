const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");
require('dotenv').config();

// 설정 파일 로드
const configPath = path.join(__dirname, '..', 'config.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

/**
 * 대본(JSON)을 읽어 장면별 개별 음성 파일(MP3) 생성
 */
async function generateBatchTTS(providedScriptData = null) {
    console.log("--- Batch TTS Generation Starting ---");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY not found.");
    }

    const openai = new OpenAI({ apiKey });

    // 1. 대본 데이터 가져오기 (전달받거나 파일에서 읽기)
    let scriptData = providedScriptData;
    if (!scriptData) {
        const scriptPath = path.join(__dirname, '..', 'videos', 'news_script.json');
        if (!fs.existsSync(scriptPath)) {
            throw new Error("news_script.json not found. Run the search script first.");
        }
        scriptData = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
    }

    const scenes = scriptData.script;

    // 2. 저장 디렉토리 준비
    const scenesDir = path.join(__dirname, '..', 'videos', 'scenes');
    if (!fs.existsSync(scenesDir)) {
        fs.mkdirSync(scenesDir, { recursive: true });
    }

    console.log(`Processing ${scenes.length} dialogue lines...`);

    // 3. 목소리 설정 가져오기
    const nameA = config.pipeline?.anchorNames?.A || "Anchor A";
    const nameB = config.pipeline?.anchorNames?.B || "Anchor B";

    // Config에서 직접 매핑된 게 있거나, 별칭(nameA/nameB)으로 정의된 것을 사용
    const getVoice = (speaker) => {
        if (config.tts?.voices?.[speaker]) return config.tts.voices[speaker];
        if (speaker === nameA) return config.tts?.voices?.nameA || "onyx";
        if (speaker === nameB) return config.tts?.voices?.nameB || "nova";
        return "alloy"; // Default
    };

    const results = [];

    // 4. 각 라인별 음성 생성
    for (let i = 0; i < scenes.length; i++) {
        const item = scenes[i];
        const speaker = item.speaker;
        const voice = getVoice(speaker);
        const outputPath = path.join(scenesDir, `scene_${i}.mp3`);

        try {
            console.log(`[${i + 1}/${scenes.length}] Generating speech for ${speaker} (${voice})...`);

            const response = await openai.audio.speech.create({
                model: config.tts?.model || "tts-1",
                voice: voice,
                input: item.text,
            });

            const buffer = Buffer.from(await response.arrayBuffer());
            await fs.promises.writeFile(outputPath, buffer);

            // 각 장면의 텍스트도 매칭해서 저장
            fs.writeFileSync(path.join(scenesDir, `scene_${i}.txt`), item.text);
            results.push(outputPath);

        } catch (error) {
            console.error(`Failed to generate speech for scene ${i}:`, error.message);
        }
    }

    console.log("--- Success! All speech files generated ---");
    return results;
}

// 모듈 내보내기
module.exports = { generateBatchTTS };

// CLI 실행 처리
if (require.main === module) {
    (async () => {
        try {
            await generateBatchTTS();
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    })();
}
