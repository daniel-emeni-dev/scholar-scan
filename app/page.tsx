"use client";

import { useState } from "react";
// FIX: Removed the extra '/src' from the path
import Camera from "@/src/components/ui/camera";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * ScholarScan Home Page
 * Manages the workflow from capturing a note to AI analysis via a secure API route.
 */
export default function Home() {
  // --- STATE ---
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Added state to hold the AI's response
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  // State for clipboard copy confirmation feedback
  const [copied, setCopied] = useState(false);

  // --- HANDLERS ---

  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData);
    setAnalysisResult(null); // Reset result if a new photo is taken
  };

  const handleReset = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setCopied(false);
  };

  // Handles seamless clipboard copy interaction
  const handleCopy = async () => {
    if (!analysisResult) return;
    try {
      await navigator.clipboard.writeText(analysisResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset state label after 2s
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // SECURE UPDATE: Hits our Route Handler instead of parsing server code on the client side
  const analyzeWithAI = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: capturedImage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong during analysis");
      }

      setAnalysisResult(data.result);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAnalysisResult(
        "Error: Could not reach the AI. Check your connection.",
      );
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
              <img
                src={capturedImage}
                alt="Scan"
                className="w-full object-contain max-h-[45vh]"
              />
            </div>

            {/* 2. AI RESULT BOX */}
            {analysisResult && (
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <h2 className="text-yellow-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Professor's Breakdown
                  </h2>
                  
                  {/* Action button to copy output directly */}
                  <button 
                    onClick={handleCopy}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700 transition-all font-medium active:scale-95"
                  >
                    {copied ? "✓ Copied!" : "Copy Text"}
                  </button>
                </div>

                {/* Styled Markdown Container */}
                <div className="text-zinc-300 text-sm leading-relaxed space-y-4 whitespace-pre-line">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Turns ## Headings into clean, highlighted section titles
                      h2: ({ node, ...props }) => (
                        <h2
                          className="text-yellow-500 font-semibold text-base mt-6 mb-2 border-l-2 border-yellow-500/50 pl-2 uppercase tracking-wide"
                          {...props}
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3
                          className="text-zinc-100 font-medium text-sm mt-4 mb-1 text-yellow-500/80"
                          {...props}
                        />
                      ),
                      // Fixes the ugly stacked lists and builds neat bullet points
                      ul: ({ node, ...props }) => (
                        <ul
                          className="list-disc list-inside space-y-2 my-3 pl-1 text-zinc-400"
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="marker:text-yellow-500 text-zinc-300" {...props} />
                      ),
                      // Keeps paragraph spacing natural
                      p: ({ node, ...props }) => (
                        <p
                          className="text-zinc-300 font-normal leading-relaxed mb-3 inline-block w-full"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {/* Wipes out the raw dollar signs so the formulas display cleanly */}
                    {analysisResult.replace(/\$/g, "")}
                  </ReactMarkdown>
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