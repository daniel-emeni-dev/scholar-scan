"use client";

import { useState } from 'react';
// FIX: Removed the extra '/src' from the path
import Camera from '@/src/components/ui/camera';
// NEW: Importing the real AI function we just built
import { analyzeImage } from '@/src/lib/gemini';

/**
 * ScholarScan Home Page
 * Manages the workflow from capturing a note to AI analysis.
 */
export default function Home() {
  // --- STATE ---
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // NEW: Added state to hold the AI's response
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // --- HANDLERS ---
  
  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData);
    setAnalysisResult(null); // Reset result if a new photo is taken
  };

  const handleReset = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
  };

  // UPDATED: Now calls the real Gemini API instead of just an alert
  const analyzeWithAI = async () => {
    if (!capturedImage) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeImage(capturedImage);
      setAnalysisResult(result);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAnalysisResult("Error: Could not reach the AI. Check your connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col items-center">
      <header className="w-full max-w-md text-center mt-8 mb-12">
        <h1 className="text-4xl font-black text-yellow-500 italic tracking-tighter">
          SCHOLARSCAN
        </h1>
        <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest">
          AI Engineering Assistant
        </p>
      </header>

      <section className="w-full max-w-md">
        {!capturedImage ? (
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
            <p className="text-zinc-300 text-center text-sm mb-4">
              Point your camera at a textbook or diagram
            </p>
            <Camera onCapture={handleCapture} />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* 1. IMAGE PREVIEW */}
            <div className="rounded-2xl overflow-hidden border-2 border-yellow-500/30 bg-zinc-900">
              <img src={capturedImage} alt="Scan" className="w-full object-contain max-h-[45vh]" />
            </div>

            {/* 2. AI RESULT BOX (Only shows when result exists) */}
            {analysisResult && (
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl">
                <h2 className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-3">
                  Analysis Result
                </h2>
                <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {analysisResult}
                </div>
              </div>
            )}

            {/* 3. BUTTONS */}
            <div className="flex gap-4">
              <button 
                onClick={handleReset} 
                className="flex-1 py-4 text-zinc-400 font-semibold hover:text-white transition-colors"
              >
                {analysisResult ? "Clear" : "Retake"}
              </button>
              
              {!analysisResult && (
                <button
                  onClick={analyzeWithAI}
                  disabled={isAnalyzing}
                  className="flex-[2] py-4 bg-yellow-500 text-black font-extrabold rounded-xl shadow-lg active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isAnalyzing ? "ANALYZING..." : "ANALYZE SCAN"}
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
