
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AppMode, Message, Subject, Source } from "./types";
import { SYSTEM_INSTRUCTION, MODE_SPECIFIC_INSTRUCTIONS } from "./constants";

export interface MedhaResponse {
  text: string;
  sources: Source[];
}

export const sendMessageToMedha = async (
  userMessage: string,
  mode: AppMode,
  subject: Subject,
  history: Message[],
  isSearchEnabled: boolean
): Promise<MedhaResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents = history.slice(-10).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const formattedPrompt = `Mode: ${mode}\nSubject: ${subject !== Subject.NONE ? subject : 'N/A'}\nQuestion: ${userMessage}`;

  contents.push({
    role: 'user',
    parts: [{ text: formattedPrompt }]
  });

  const fullSystemInstruction = `${SYSTEM_INSTRUCTION}\n\n${MODE_SPECIFIC_INSTRUCTIONS[mode]}`;

  try {
    const config: any = {
      systemInstruction: fullSystemInstruction,
      temperature: 0.6,
      topP: 0.9,
    };

    // Only add search tool if enabled
    if (isSearchEnabled) {
      config.tools = [{ googleSearch: {} }];
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: contents as any,
      config: config,
    });

    const text = response.text || "দুঃখিত, আমি উত্তর দিতে পারছি না।";
    
    const sources: Source[] = [];
    if (isSearchEnabled) {
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && Array.isArray(chunks)) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) {
            sources.push({
              uri: chunk.web.uri,
              title: chunk.web.title || chunk.web.uri
            });
          }
        });
      }
    }

    return { text, sources };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("quota") || error.message?.includes("429")) {
      throw new Error("API লিমিট শেষ হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।");
    }
    throw new Error("নেটওয়ার্ক সমস্যা। অনুগ্রহ করে আবার চেষ্টা করুন।");
  }
};
