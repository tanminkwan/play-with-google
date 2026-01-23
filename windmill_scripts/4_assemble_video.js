export async function main() {
    const { generateFinalVideo } = await import("#root/generate_video.js");
    const videoPath = await generateFinalVideo();
    return { videoPath };
}
