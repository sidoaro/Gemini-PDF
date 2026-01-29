import { GoogleGenAI, Type } from "@google/genai";
import { SmartActionResponse } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing. Please configure it in Cloudflare Pages settings.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const enhanceNote = async (content: string, action: 'summarize' | 'tag' | 'improve' | 'title'): Promise<SmartActionResponse> => {
  const ai = getAI();
  if (!ai) {
    throw new Error("Clé API non configurée. Veuillez l'ajouter dans les paramètres Cloudflare.");
  }
  
  const model = 'gemini-3-flash-preview';

  const prompts = {
    summarize: "Provide a concise summary of this note.",
    tag: "Suggest 3-5 relevant hashtags for this content.",
    improve: "Correct grammar and improve the clarity of this note while preserving the original meaning.",
    title: "Generate a short, catchy title for this note based on its content."
  };

  const response = await ai.models.generateContent({
    model,
    contents: `Content: ${content}\n\nTask: ${prompts[action]}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedTitle: { type: Type.STRING },
          summary: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvedContent: { type: Type.STRING }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return {};
  }
};