export async function main() {
    const { generateFinalVideo } = await import("/home/node/app/generate_video.js");
    const videoPath = await generateFinalVideo();
    return { videoPath };
}
