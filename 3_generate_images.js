import { generateImagesForScenes } from "./lib/generate_images.js";

/**
 * 이미지 생성 단계
 */
export async function main() {
    const results = await generateImagesForScenes();
    return { imageFiles: results };
}
