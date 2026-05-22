import { NextResponse } from 'next/server';
import { analyzeImage } from '@/src/lib/groq';

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    if (!image) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const result = await analyzeImage(image);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}