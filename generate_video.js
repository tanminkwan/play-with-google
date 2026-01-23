const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// 설정 파일 로드
const configPath = path.join(__dirname, 'config.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

/**
 * ffprobe를 사용하여 오디오 파일의 길이를 초 단위로 가져오는 함수
 */
function getAudioDuration(filePath) {
    try {
        const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
        const duration = execSync(command).toString().trim();
        return parseFloat(duration);
    } catch (err) {
        console.error(`Error getting duration for ${filePath}:`, err.message);
        return 5; // 기본값 5초
    }
}

/**
 * 이미지와 음성 파일들을 합쳐 최종 mp4 영상을 생성하는 함수
 */
async function generateFinalVideo() {
    console.log("--- Final Video Assembly with Logo Overlay Starting ---");

    const scenesDir = path.join(__dirname, 'videos', 'scenes');
    const outputDir = path.join(__dirname, 'videos');
    const outputName = config.videoSettings?.outputFileName || 'final_video.mp4';
    const outputPath = path.join(outputDir, outputName);

    if (!fs.existsSync(scenesDir)) {
        throw new Error(`Scenes directory not found: ${scenesDir}`);
    }

    const files = fs.readdirSync(scenesDir);
    const sceneIndices = [...new Set(files
        .filter(f => f.startsWith('scene_') && f.endsWith('.mp3'))
        .map(f => f.match(/\d+/)[0]))]
        .sort((a, b) => parseInt(a) - parseInt(b));

    if (sceneIndices.length === 0) {
        throw new Error("No scenes found to process.");
    }

    const width = config.videoSettings?.width || 1920;
    const height = config.videoSettings?.height || 1080;
    const logoSettings = config.logoOverlay || { enabled: false };

    const args = [];
    let filterComplex = "";
    let concatInputs = "";
    let inputCount = 0;

    for (let i = 0; i < sceneIndices.length; i++) {
        const index = sceneIndices[i];
        const img = path.join(scenesDir, `scene_${index}.png`);
        const aud = path.join(scenesDir, `scene_${index}.mp3`);
        const logo = path.join(scenesDir, `scene_${index}_logo.png`);

        if (fs.existsSync(aud) && fs.existsSync(img)) {
            const duration = getAudioDuration(aud);

            // 1. 배경 이미지 입력
            args.push('-loop', '1', '-t', duration.toString(), '-i', img);
            const imgInputIdx = inputCount++;

            // 2. 오디오 입력
            args.push('-i', aud);
            const audInputIdx = inputCount++;

            // 3. 로고 입력 (존재할 경우)
            let finalSceneV = `v${i}`;
            if (logoSettings.enabled && fs.existsSync(logo)) {
                args.push('-i', logo);
                const logoInputIdx = inputCount++;

                const logoWidth = logoSettings.width || 150;
                const margin = logoSettings.margin || 20;
                let overlayPos = "x=W-w-20:y=20"; // top-right default
                if (logoSettings.position === "top-left") overlayPos = `x=${margin}:y=${margin}`;

                filterComplex += `[${imgInputIdx}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[bg${i}];`;
                filterComplex += `[${logoInputIdx}:v]scale=${logoWidth}:-1[logo${i}];`;
                filterComplex += `[bg${i}][logo${i}]overlay=${overlayPos}[v${i}];`;
            } else {
                filterComplex += `[${imgInputIdx}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];`;
            }

            concatInputs += `[${finalSceneV}][${audInputIdx}:a]`;
        }
    }

    filterComplex += `${concatInputs}concat=n=${sceneIndices.length}:v=1:a=1[outv][outa]`;

    args.push('-filter_complex', filterComplex);
    args.push('-map', '[outv]', '-map', '[outa]');
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-y', outputPath);

    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args);
        ffmpeg.stderr.on('data', (data) => console.error(`ffmpeg: ${data}`));
        ffmpeg.on('close', (code) => {
            if (code === 0) resolve(outputPath);
            else reject(new Error(`FFmpeg exited with ${code}`));
        });
    });
}

module.exports = { generateFinalVideo };

if (require.main === module) {
    (async () => {
        try {
            await generateFinalVideo();
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    })();
}
