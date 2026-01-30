import { generateFinalVideo } from "./lib/generate_video.js";

/**
 * 비디오 합성 단계
 */
export async function main() {
    const videoPath = await generateFinalVideo();
    return { videoPath };
}
