import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

export const scholarModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
    systemInstruction: "You are ScholarScan. Your job is to convert images of textbooks, diagrams, and handwritten notes into clean Markdown. If you see an engineering circuit, describe its components and purpose."
    });
    