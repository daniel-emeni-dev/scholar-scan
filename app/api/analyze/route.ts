import { NextResponse } from 'next/server';
import { analyzeImage } from '@/src/lib/groq';
import { supabase } from '@/src/lib/supabase/client'; // Import your clean Supabase client

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    if (!image) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    // 1. Run your original, working Groq analysis helper
    const result = await analyzeImage(image);

    // 2. INTERCEPT & SYNC TO SUPABASE (Fault-Tolerant Loop)
    try {
      const { error: dbError } = await supabase
        .from("scans")
        .insert([
          {
            image_url: image,         // Raw capture payload string
            analysis_text: result,    // The generated KaTeX-compatible Markdown text
          },
        ]);

      if (dbError) {
        console.error("⚠️ Supabase sync skipped:", dbError.message);
      } else {
        console.log("✅ Cloud logbook updated successfully.");
      }
    } catch (dbCatch) {
      console.error("⚠️ Database connection timed out:", dbCatch);
    }

    // 3. Return response exactly matching your frontend state bounds ({ result })
    return NextResponse.json({ result });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}