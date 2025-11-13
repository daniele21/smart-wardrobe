import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { enforceAspectRatio, urlToDataUrl, logApiUsage } from "../lib/utils";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const imageUrlToPart = async (imageUrl: string) => {
    if (imageUrl.startsWith('data:')) {
        return dataUrlToPart(imageUrl);
    }
    const dataUrl = await urlToDataUrl(imageUrl);
    return dataUrlToPart(dataUrl);
};

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash-image';

export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = "You are an expert fashion photographer AI. Transform the person in this image into a full-body fashion model photo suitable for an e-commerce website. The background must be a clean, neutral studio backdrop (light gray, #f0f0f0). The person should have a neutral, professional model expression. Preserve the person's identity, unique features, and body type, but place them in a standard, relaxed standing model pose. The final image must be photorealistic and have a 1:1 aspect ratio (square). Return ONLY the final image.";
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    logApiUsage('generateModelImage', model, response.usageMetadata, 1);
    const resultDataUrl = handleApiResponse(response);
    return enforceAspectRatio(resultDataUrl);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentFiles: File[]): Promise<string> => {
    const modelImagePart = await imageUrlToPart(modelImageUrl);
    const garmentImageParts = await Promise.all(garmentFiles.map(fileToPart));
    const prompt = `You are an expert virtual try-on AI. You will be given a 'model image' and one or more 'garment images'. Your task is to create a new photorealistic image where the person from the 'model image' is wearing the complete outfit from the 'garment images'.

**Crucial Rules:**
1.  **Combine Garments:** Intelligently combine all provided garments into a single, layered outfit. For example, a t-shirt should be under a jacket.
2.  **Complete Garment Replacement:** You MUST completely REMOVE and REPLACE any relevant clothing worn by the person in the 'model image' with the new garments. No part of the original clothing should be visible.
3.  **Preserve the Model & Background:** The person's face, hair, body shape, pose, and the entire background from the 'model image' MUST be preserved perfectly.
4.  **Realistic Fit:** Realistically fit the new outfit onto the person. It should adapt to their pose with natural folds, shadows, and lighting consistent with the original scene.
5.  **Aspect Ratio:** The final output image MUST have a 1:1 aspect ratio (square).
6.  **Output:** Return ONLY the final, edited image. Do not include any text.`;
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [modelImagePart, ...garmentImageParts, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    logApiUsage('generateVirtualTryOnImage', model, response.usageMetadata, 1 + garmentFiles.length);
    const resultDataUrl = handleApiResponse(response);
    return enforceAspectRatio(resultDataUrl);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const tryOnImagePart = await imageUrlToPart(tryOnImageUrl);
    const prompt = `You are an expert fashion photographer AI. Take this image and regenerate it from a different perspective. The person, clothing, and background style must remain identical. The new perspective should be: "${poseInstruction}". The final image MUST have a 1:1 aspect ratio (square). Return ONLY the final image.`;
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    logApiUsage('generatePoseVariation', model, response.usageMetadata, 1);
    const resultDataUrl = handleApiResponse(response);
    return enforceAspectRatio(resultDataUrl);
};

export const removeImageBackground = async (sourceImageUrl: string): Promise<string> => {
    const sourceImagePart = await imageUrlToPart(sourceImageUrl);
    const prompt = "You are an expert background removal AI. Given this image, perfectly isolate the main subject (e.g., clothing item, person) and return a new image with the subject on a transparent background. The output must be a PNG file. Return ONLY the final image.";
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [sourceImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    logApiUsage('removeImageBackground', model, response.usageMetadata, 1);
    return handleApiResponse(response);
};