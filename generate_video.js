const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

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
    const outputPath = path.join(outputDir, 'final_video.mp4');

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

    sceneIndices.forEach((idx, i) => {
        const audioPath = path.join(scenesDir, `scene_${idx}.mp3`);
        const imagePath = path.join(scenesDir, `scene_${idx}.png`);

        if (fs.existsSync(audioPath) && fs.existsSync(imagePath)) {
            const duration = getAudioDuration(audioPath);

            // 입력 파일 추가 (이미지를 오디오 길이에 맞춤)
            args.push('-loop', '1', '-t', duration.toString(), '-i', imagePath);
            args.push('-i', audioPath);

            // 개별 장면 스케일링 필터
            scaleFilters += `[${i * 2}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v${i}];`;
            // concat 입력으로 추가
            concatInputs += `[v${i}][${i * 2 + 1}:a]`;
        }
    });

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
