import { getApiUrl } from "../utils";
import { getAiHeaders } from "./storeConfigService";
import { tryFetchWithClientFallback, clientAnalyzeMeal, clientModerateImage } from "./clientAiFallback";

export interface AnalyzedMealFood {
  food_name: string;
  amount: number;
  unit: string;
  grams_per_unit: number;
  calories_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fat_per_100: number;
  confidence_explanation: string;
  
  // Backward compatibility
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface AnalyzeMealResponse {
  foods: AnalyzedMealFood[];
}

export const analyzeFoodInput = async (
  input: string | { data: string; mimeType: string }
): Promise<AnalyzeMealResponse | null> => {
  try {
    const isImage = typeof input !== "string";
    const body: any = {};
    if (isImage) {
      body.image = input.data;
      body.mimeType = input.mimeType;
    } else {
      body.text = input;
    }

    const fallbackFn = async () => {
      if (isImage) {
        return await clientAnalyzeMeal({ image: input.data, mimeType: input.mimeType });
      } else {
        return await clientAnalyzeMeal({ text: input });
      }
    };

    const data = await tryFetchWithClientFallback<AnalyzeMealResponse>(
      getApiUrl("/api/ai/analyze-meal"),
      {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify(body),
      },
      fallbackFn
    );

    return data;
  } catch (error) {
    console.error("Error calling server AI analyzer:", error);
    return null;
  }
};

export interface ImageModerationResponse {
  isSafe: boolean;
  reason: string;
  category: string;
}

export const moderateProfileImage = async (
  imageDataUrl: string
): Promise<ImageModerationResponse | null> => {
  try {
    // Extract base64 and mimeType from data URL
    let mimeType = 'image/jpeg';
    let data = imageDataUrl;
    if (imageDataUrl.startsWith('data:')) {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        data = match[2];
      }
    }

    const fallbackFn = async () => {
      return await clientModerateImage(imageDataUrl);
    };

    const result = await tryFetchWithClientFallback<ImageModerationResponse>(
      getApiUrl("/api/ai/moderate-image"),
      {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({ image: data, mimeType }),
      },
      fallbackFn
    );

    return result;
  } catch (error) {
    console.error("Error calling server image moderator:", error);
    return {
      isSafe: true, // Graceful fallback
      reason: "Houve um erro técnico. A imagem foi liberada de forma provisória.",
      category: "safe"
    };
  }
};


