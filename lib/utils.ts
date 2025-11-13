import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PixelCrop } from 'react-image-crop';
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFriendlyErrorMessage(error: unknown, context: string): string {
    let rawMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        rawMessage = error.message;
    } else if (typeof error === 'string') {
        rawMessage = error;
    } else if (error) {
        rawMessage = String(error);
    }

    if (rawMessage.includes("Rpc failed due to xhr error")) {
        return `${context}. A network error occurred while contacting the AI model. This can be due to a temporary connection issue or browser security policies (CORS). Please check your internet connection and try again. If the problem persists, your network may be blocking access.`;
    }

    if (rawMessage.includes("Unsupported MIME type")) {
        try {
            const errorJson = JSON.parse(rawMessage);
            const nestedMessage = errorJson?.error?.message;
            if (nestedMessage && nestedMessage.includes("Unsupported MIME type")) {
                const mimeType = nestedMessage.split(': ')[1] || 'unsupported';
                return `File type '${mimeType}' is not supported. Please use a format like PNG, JPEG, or WEBP.`;
            }
        } catch (e) {
            // Not a JSON string, but contains the text.
        }
        return `Unsupported file format. Please upload an image format like PNG, JPEG, or WEBP.`;
    }
    
    return `${context}. ${rawMessage}`;
}

export const urlToFile = async (url: string, filename: string): Promise<File> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], filename, { type: blob.type });
    } catch (error) {
        console.error("Error converting URL to File:", error);
        throw new Error(`Could not load image from URL: ${url}`);
    }
};

export const urlToDataUrl = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }
            ctx.drawImage(image, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };

        image.onerror = () => {
            reject(new Error(`Could not load image from URL. This may be due to a network issue or a cross-origin (CORS) restriction on the server.`));
        };

        image.src = url;
    });
};

export const enforceAspectRatio = (
  dataUrl: string,
  targetRatio: number = 1, // 1:1 square aspect ratio
  fillColor: string = '#f0f0f0' // Neutral light gray background
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const imgW = image.naturalWidth;
      const imgH = image.naturalHeight;
      const currentRatio = imgW / imgH;

      // Allow a small tolerance to avoid reprocessing nearly perfect images
      if (Math.abs(currentRatio - targetRatio) < 0.01) {
        resolve(dataUrl);
        return;
      }

      let canvasW, canvasH;

      if (currentRatio > targetRatio) {
        // Image is wider than target, so canvas height needs to increase
        canvasW = imgW;
        canvasH = imgW / targetRatio;
      } else {
        // Image is taller than target, so canvas width needs to increase
        canvasH = imgH;
        canvasW = imgH * targetRatio;
      }

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context for aspect ratio enforcement.'));
      }

      // Fill the background with a neutral color
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Draw the original image centered on the new canvas
      const dx = (canvasW - imgW) / 2;
      const dy = (canvasH - imgH) / 2;
      ctx.drawImage(image, dx, dy);

      resolve(canvas.toDataURL('image/png'));
    };

    image.onerror = (error) => {
      reject(new Error(`Could not load image for aspect ratio enforcement. Error: ${error}`));
    };

    image.src = dataUrl;
  });
};


export async function canvasPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: PixelCrop
) {
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();
  
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight
  );

  ctx.restore();
}


interface UsageMetadata {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
}

// Pricing is based on public information for similar models (e.g., Gemini 1.5 Flash) and is for estimation purposes.
// Check the official Google Cloud pricing page for the most accurate and up-to-date information.
const PRICING_TABLE: Record<string, { input: number; output: number; imageInput?: number }> = {
    'gemini-2.5-flash-image': {
        input: 0.35 / 1_000_000,      // ~$0.35 per 1M input tokens
        output: 1.05 / 1_000_000,     // ~$1.05 per 1M output tokens
        imageInput: 0.0025            // ~$0.0025 per image input
    },
};

export function logApiUsage(
    context: string,
    model: string,
    usage: UsageMetadata | undefined,
    imageInputs: number = 0
) {
    if (!usage) {
        console.log(`[API USAGE] ${context}: No usage metadata returned from the API.`);
        return;
    }

    const { promptTokenCount, candidatesTokenCount, totalTokenCount } = usage;

    console.groupCollapsed(`[API USAGE] ${context}`);
    console.log(`Model: %c${model}`, 'font-weight: bold;');
    console.log(`Prompt Tokens: %c${promptTokenCount ?? 'N/A'}`, 'color: blue;');
    console.log(`Output Tokens: %c${candidatesTokenCount ?? 'N/A'}`, 'color: green;');
    console.log(`Total Tokens: %c${totalTokenCount ?? 'N/A'}`, 'color: purple;');
    console.log(`Image Inputs: %c${imageInputs}`, 'color: orange;');
    
    const modelPricing = PRICING_TABLE[model];

    if (modelPricing) {
        const inputTokens = promptTokenCount ?? 0;
        const outputTokens = candidatesTokenCount ?? 0;
        
        const tokenCost = (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output);
        const imageCost = imageInputs * (modelPricing.imageInput ?? 0);
        const totalCost = tokenCost + imageCost;
        
        console.log(`Estimated Cost: %c$${totalCost.toFixed(6)}`, 'font-weight: bold; color: red;');
        console.log(`  - Token Cost: $${tokenCost.toFixed(6)}`);
        console.log(`  - Image Input Cost: $${imageCost.toFixed(6)}`);
        console.log('%cNote: This is an estimate. Refer to your Google Cloud billing for actual costs.', 'font-style: italic; color: gray;');
    } else {
        console.log("Cost estimation is not available for this model.");
    }
    console.groupEnd();
}