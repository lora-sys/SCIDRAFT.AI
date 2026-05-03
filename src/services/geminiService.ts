import { GoogleGenAI } from "@google/genai";

export async function generateResearchMethod(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const systemInstruction = `You are a professional scientific research assistant. 
Your task is to generate detailed experimental methods and experimental settings based on the user's research topic or request.
Follow these rules:
1. Output MUST be in well-formatted Markdown.
2. Include scientific formulas where appropriate using LaTeX notation (e.g., $E=mc^2$ or $$PE = mgh$$).
3. Use tables for experimental parameters or settings.
4. Structure the content with clear headers (H1, H2, H3).
5. Be precise, technical, and objective.
6. The output should be ready for academic publication or laboratory use.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Failed to generate content.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to communicate with AI service.");
  }
}
