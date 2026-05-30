import { NextResponse } from 'next/server';
import { analyzeImage } from '@/src/lib/groq';
import { createClient } from '@/src/lib/supabase/server'; // Import the server client instead

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    if (!image) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    // 1. Initialize server client
    const supabaseServer = await createClient();

    // --- ADD THIS PART TO FIX THE 401 ---
    // Get the token we sent in the 'Authorization' header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1]; // Grabs the actual code after 'Bearer'

    // Tell Supabase to use this specific token to find the user
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    // ------------------------------------

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to log scans." },
        { status: 401 }
      );
    }

    // 2. Run your original analysis
    const result = await analyzeImage(image);

    // 3. Sync to Supabase
    const { error: dbError } = await supabaseServer
      .from("scans")
      .insert([
        {
          image_url: image,
          analysis_text: result,
          user_id: user.id,
        },
      ]);

    if (dbError) {
      console.error("Supabase sync skipped:", dbError.message);
    }

    return NextResponse.json({ result });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
