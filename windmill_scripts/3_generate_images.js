export async function main() {
    // Note: generateImagesForScenes currently reads from disk (videos/scenes/*.txt)
    // In a stateless worker, we should ideally pass data, but we shared the volume.
    const { generateImagesForScenes } = await import("#root/generate_images.js");
    const results = await generateImagesForScenes();
    return { imageFiles: results };
}
