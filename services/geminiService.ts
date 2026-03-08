import { GoogleGenAI } from "@google/genai";

// We don't initialize here to allow for dynamic key injection if needed, 
// but for this demo we assume process.env or a passed key.
// In a real client-side app without a proxy, exposing key is risky,
// but for the purpose of the requested spec using process.env.API_KEY or user input.

export const createGeminiClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

export const improveText = async (apiKey: string, text: string, type: 'fix' | 'professional' | 'shorten' | 'expand') => {
  if (!apiKey) throw new Error("API Key is missing");
  
  const ai = createGeminiClient(apiKey);
  
  let prompt = "";
  switch (type) {
    case 'fix':
      prompt = `Fix grammar and spelling errors in the following resume text. Keep the tone professional. Return only the corrected text:\n\n"${text}"`;
      break;
    case 'professional':
      prompt = `Rewrite the following resume text to sound more professional, impactful, and action-oriented. Use strong verbs. Return only the rewritten text:\n\n"${text}"`;
      break;
    case 'shorten':
      prompt = `Shorten the following resume text while retaining key achievements. Make it concise. Return only the shortened text:\n\n"${text}"`;
      break;
    case 'expand':
      prompt = `Expand on the following resume text to add more detail and context, assuming standard professional duties. Return only the expanded text:\n\n"${text}"`;
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: prompt,
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
