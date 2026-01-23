export async function main() {
    const { APP_DIR } = await import("./path_config.js");
    const { generateFinalVideo } = await import(`${APP_DIR}/generate_video.js`);
    const videoPath = await generateFinalVideo();
    return { videoPath };
}
