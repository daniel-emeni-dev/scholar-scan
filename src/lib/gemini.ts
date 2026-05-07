"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * GEMINI SERVICE CONFIGURATION
  * We initialize the AI with the API Key from your .env.local file.
   * The 'use server' directive at the top ensures your API key stays 
    * hidden from the browser for security.
     */
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * analyzeImage
  * This function takes a Base64 image from your camera, sends it to 
   * Gemini 1.5 Flash, and returns a professor-style explanation.
    */
export async function analyzeImage(base64Image: string) {
    // 1. Safety check: If the API key is missing, stop early and warn the developer
    if (!apiKey) {
        return "Developer Note: Gemini API Key is missing. Check your .env.local file.";
    }

    try {
        // 2. Initialize the Model
        // We use 'gemini-1.5-flash' because it is fast, multimodal, and ideal for mobile.
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: "You are an expert Engineering Professor. Your goal is to help students understand their notes. Transcribe text accurately, explain circuit diagrams if present, and format all mathematical equations using LaTeX."
        });

        // 3. Prepare the Image Data
        // We remove the "data:image/jpeg;base64," prefix so Gemini only gets the raw data.
        const imageParts = [
            {
                inlineData: {
                    data: base64Image.split(",")[1],
                    mimeType: "image/jpeg",
                },
            },
        ];

        // 4. Set the prompt
        const prompt = "Analyze this scan. Provide a clear transcription and a brief explanation of the engineering concepts shown.";

        // 5. Generate and return the result
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;

        return response.text();

    } catch (error) {
        // 6. Error handling for network issues or API limits
        console.error("Gemini Service Error:", error);
        return "AI analysis failed. Please check your internet connection and try again.";
    }
}
