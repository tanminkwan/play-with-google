export async function main() {
    // Note: generateImagesForScenes currently reads from disk (videos/scenes/*.txt)
    // In a stateless worker, we should ideally pass data, but we shared the volume.
    const { APP_DIR } = await import("./path_config.js");
    const { generateImagesForScenes } = await import(`${APP_DIR}/generate_images.js`);
    const results = await generateImagesForScenes();
    return { imageFiles: results };
}
