"use server";

export async function analyzeImage(base64Image: string) {
  // SECURE: Pulled from env variables, completely hidden from GitHub logs
  const GROQ_KEY = process.env.GROQ_API_KEY; 

  try {
    const cleanBase64 = base64Image.includes(",") ? base64Image : `data:image/jpeg;base64,${base64Image}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct", 
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are an expert Engineering Professor. Analyze this circuit diagram scan. Provide a clear markdown transcription of any formulas, parameters, and diagrams, and give a clear step-by-step explanation of the solution."
              },
              {
                type: "image_url",
                image_url: {
                  url: cleanBase64
                }
              }
            ]
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Analysis completed, but no text was returned.";

  } catch (error: any) {
    console.error("Groq API Connection Error:", error);
    return `AI Link Error: ${error.message || "Failed to communicate with Groq endpoints."}`;
  }
}