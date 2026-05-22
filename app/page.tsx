"use client";

import { useState } from "react";
// FIX: Removed the extra '/src' from the path
import Camera from "@/src/components/ui/camera";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// OPTIMIZATION IMPORT: Client-side downscaler helper
import { compressImage } from "@/src/lib/compressor";

/**
 * ScholarScan Home Page
 * Manages the workflow from capturing a note to AI analysis with robust signal recovery error cards.
 */
export default function Home() {
  // --- STATE ---
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // ERROR TRACKING STATE
  const [error, setError] = useState<string | null>(null);

  // --- HANDLERS ---

  // OPTIMIZED WORKFLOW: Catches raw data and downsamples data load asynchronously
  const handleCapture = async (imageData: string) => {
    try {
      setIsAnalyzing(true); // Engages load layout during canvas processing calculations
      setAnalysisResult(null); // Reset result if a new photo is taken
      setError(null); // Wipe any old errors

      // Compresses raw multi-megabyte string into optimized 1200px footprint at 75% quality
      const optimizedImage = await compressImage(imageData, 1200, 0.75);
      setCapturedImage(optimizedImage);
    } catch (error) {
      console.error(
        "Client-side compression failed, falling back to raw payload:",
        error,
      );
      setCapturedImage(imageData); // Graceful recovery fallback if browser canvas processing drops
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setCopied(false);
    setError(null);
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
    setError(null); // Always clear previous errors when starting an analysis cycle

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
        throw new Error(
          data.error || "Serverless gateway timeout. Transmission broken.",
        );
      }

      setAnalysisResult(data.result);
    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      setError(
        error.message ||
          "Network connection interrupted. Failed to reach server.",
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
            <div className="relative rounded-2xl overflow-hidden border-2 border-yellow-500/30 bg-zinc-900 select-none">
              <img
                src={capturedImage}
                alt="Scan"
                className={`w-full object-contain max-h-[45vh] transition-all duration-700 ${
                  isAnalyzing
                    ? "brightness-[0.4] contrast-[1.1] scale-[1.01]"
                    : "brightness-100"
                } ${error ? "border-red-500/40 grayscale brightness-[0.5]" : ""}`}
              />

              {/* Dynamic rendering of mechanical scanning lens hardware */}
              {isAnalyzing && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-500/5 to-transparent pointer-events-none" />
                  <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_15px_rgba(234,179,8,0.8)] animate-scan pointer-events-none" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-950/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-zinc-800 text-[10px] uppercase font-bold tracking-widest text-zinc-400 animate-pulse whitespace-nowrap">
                    Reading Schematic Matrix...
                  </div>
                </>
              )}
            </div>

            {/* 2. ERROR RECOVERY BOUNDARY CARD (CLASSIC MODERNIZED) */}
            {error && !isAnalyzing && (
              <div className="w-full bg-zinc-900 border border-red-950/50 rounded-2xl p-5 shadow-xl animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500/70" />
                    <h2 className="text-zinc-400 text-[11px] font-bold uppercase tracking-widest font-mono">
                      System Diagnostics
                    </h2>
                  </div>
                  <span className="text-[10px] text-red-400/80 font-mono bg-red-950/30 px-2 py-0.5 rounded border border-red-900/30 uppercase tracking-wider">
                    Offline
                  </span>
                </div>

                <p className="text-zinc-400 text-xs font-mono bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/80 mb-4 leading-relaxed">
                  Status: <span className="text-zinc-300">{error}</span>
                </p>

                <button
                  onClick={analyzeWithAI}
                  className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.99] uppercase tracking-widest text-[11px]"
                >
                  Connect Link & Retry
                </button>
              </div>
            )}

            {/* 3. AI RESULT BOX */}
            {analysisResult && !error && (
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <h2 className="text-yellow-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Professor's Breakdown
                  </h2>

                  <button
                    onClick={handleCopy}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700 transition-all font-medium active:scale-95"
                  >
                    {copied ? "✓ Copied!" : "Copy Text"}
                  </button>
                </div>

                <div className="text-zinc-300 text-sm leading-relaxed space-y-4 whitespace-pre-line">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
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
                      ul: ({ node, ...props }) => (
                        <ul
                          className="list-disc list-inside space-y-2 my-3 pl-1 text-zinc-400"
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li
                          className="marker:text-yellow-500 text-zinc-300"
                          {...props}
                        />
                      ),
                      p: ({ node, ...props }) => (
                        <p
                          className="text-zinc-300 font-normal leading-relaxed mb-3 inline-block w-full"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {analysisResult.replace(/\$/g, "")}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* 4. MAIN ACTION BUTTONS */}
            <div className="flex gap-4">
              <button
                onClick={handleReset}
                disabled={isAnalyzing}
                className="flex-1 py-4 text-zinc-400 font-semibold hover:text-white transition-colors disabled:opacity-30"
              >
                {analysisResult || error ? "Clear" : "Retake"}
              </button>

              {!analysisResult && !error && (
                <button
                  onClick={analyzeWithAI}
                  disabled={isAnalyzing}
                  className="flex-[2] py-4 bg-yellow-500 text-black font-extrabold rounded-xl shadow-lg active:scale-95 disabled:opacity-50 transition-all tracking-wider text-xs uppercase"
                >
                  {isAnalyzing ? "Processing Signal..." : "ANALYZE SCAN"}
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
