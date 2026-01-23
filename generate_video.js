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
    console.log("--- Final Video Assembly Starting ---");

    const scenesDir = path.join(__dirname, 'videos', 'scenes');
    const outputDir = path.join(__dirname, 'videos');
    const outputName = config.videoSettings?.outputFileName || 'final_video.mp4';
    const outputPath = path.join(outputDir, outputName);

    if (!fs.existsSync(scenesDir)) {
        throw new Error(`Scenes directory not found: ${scenesDir}`);
    }

    // 1. 파일 목록 확보 및 정렬
    const files = fs.readdirSync(scenesDir);
    const sceneIndices = [...new Set(files
        .filter(f => f.startsWith('scene_') && f.endsWith('.mp3'))
        .map(f => f.match(/\d+/)[0]))]
        .sort((a, b) => parseInt(a) - parseInt(b));

    if (sceneIndices.length === 0) {
        throw new Error("No scenes found to process.");
    }

    console.log(`Processing ${sceneIndices.length} scenes...`);

    // 2. ffmpeg 인자 구성
    const args = [];
    let scaleFilters = "";
    let concatInputs = "";

    const width = config.videoSettings?.width || 1920;
    const height = config.videoSettings?.height || 1080;

    for (const [i, index] of sceneIndices.entries()) {
        const img = path.join(scenesDir, `scene_${index}.png`);
        const aud = path.join(scenesDir, `scene_${index}.mp3`);

        if (fs.existsSync(aud) && fs.existsSync(img)) { // Ensure files exist before processing
            const duration = getAudioDuration(aud);

            // 입력 파일 추가 (이미지를 오디오 길이에 맞춤)
            args.push('-loop', '1', '-t', duration.toString(), '-i', img);
            args.push('-i', aud);

            // 개별 장면 스케일링 필터
            scaleFilters += `[${i * 2}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];`;
            // concat 입력으로 추가
            concatInputs += `[v${i}][${i * 2 + 1}:a]`;
        } else {
            console.warn(`Skipping scene ${index}: Missing audio (${aud}) or image (${img}) file.`);
        }
    }

    if (sceneIndices.length === 0) { // Re-check if any scenes were actually processed after filtering
        throw new Error("No valid scenes found to process after checking file existence.");
    }

    const filterComplex = `${scaleFilters}${concatInputs}concat=n=${sceneIndices.length}:v=1:a=1[v][a]`;

    args.push('-filter_complex', filterComplex);
    args.push('-map', '[v]', '-map', '[a]');
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-y', outputPath);

    // 3. ffmpeg 실행
    return new Promise((resolve, reject) => {
        console.log("Executing FFmpeg...");
        const ffmpeg = spawn('ffmpeg', args);

        ffmpeg.stderr.on('data', (data) => {
            console.error(`ffmpeg ERROR: ${data}`);
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log("--- Success! Video Generated ---");
                console.log(`Output: ${outputPath}`);
                resolve(outputPath);
            } else {
                reject(new Error(`FFmpeg process exited with code ${code}`));
            }
        });
    });
}

// 모듈 내보내기
module.exports = { generateFinalVideo };

// CLI 실행 처리
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
