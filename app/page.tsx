"use client";

import { useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { useEffect } from "react";
import Camera from "@/src/components/ui/camera";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { compressImage } from "@/src/lib/compressor";

// CRITICAL: Load static fonts and symbol configurations for KaTeX math rendering
import "katex/dist/katex.min.css";

// Define what a history item looks like
interface HistoryItem {
  id: string;
  image: string;
  result: string;
  timestamp: string;
}

export default function Home() {
  // --- STATE ---
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HISTORY STATES
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- HANDLERS ---

  const handleCapture = async (imageData: string) => {
    try {
      setIsAnalyzing(true);
      setAnalysisResult(null);
      setError(null);

      const optimizedImage = await compressImage(imageData, 1200, 0.75);
      setCapturedImage(optimizedImage);
    } catch (error) {
      console.error("Compression failed, falling back to raw payload:", error);
      setCapturedImage(imageData);
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

  const handleCopy = async () => {
    if (!analysisResult) return;
    try {
      await navigator.clipboard.writeText(analysisResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // --- CLOUD HISTORY SYNCHRONIZATION LOOP ---
  useEffect(() => {
    const fetchCloudHistory = async () => {
      try {
        const { data, error } = await supabase
          .from("scans")
          .select("id, image_url, analysis_text, created_at")
          .order("created_at", { ascending: false })
          .limit(20); // Pull down the 20 most recent transmissions

        if (error) {
          console.error("Failed to query cloud logbook:", error.message);
          return;
        }

        if (data) {
          // Map the Supabase table naming structure cleanly back into your HistoryItem UI format
          const mappedHistory: HistoryItem[] = data.map((row) => ({
            id: row.id,
            image: row.image_url,
            result: row.analysis_text,
            timestamp: new Date(row.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
          setHistory(mappedHistory);
        }
      } catch (err) {
        console.error("Unexpected error loading network logs:", err);
      }
    };

    fetchCloudHistory();
  }, []); // Fires once when the component mounts in the viewport

  const analyzeWithAI = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: capturedImage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Serverless gateway timeout.");
      }

      setAnalysisResult(data.result);

      // AUTOMATICALLY SAVE THE GENUINE CLOUD RECORD TO FRONTEND HISTORY
      const newItem: HistoryItem = {
        id: data.id || Math.random().toString(36).substring(2, 11),
        image: capturedImage,
        result: data.result,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setHistory((prev) => [newItem, ...prev]);
    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      setError(error.message || "Network connection interrupted.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load a past scan from the sidebar back into main view
  const loadHistoryItem = (item: HistoryItem) => {
    setCapturedImage(item.image);
    setAnalysisResult(item.result);
    setError(null);
    setIsSidebarOpen(false); // Close drawer on selection
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col items-center relative overflow-x-hidden">
      {/* HEADER WITH SIDEBAR TOGGLE BUTTON */}
      <header className="w-full max-w-md flex items-center justify-between mt-8 mb-12 relative">
        <div className="w-8" />{" "}
        {/* Spacer to balance the header center alignment */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-yellow-500 italic tracking-tighter">
            SCHOLARSCAN
          </h1>
          <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest">
            AI Engineering Assistant
          </p>
        </div>
        {/* History Toggle Trigger */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 rounded-xl text-zinc-400 hover:text-yellow-500 transition-all relative active:scale-95 flex items-center justify-center group"
          title="Open History"
        >
          {/* Modern High-Class History Vector Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-4 h-4 transition-transform group-hover:rotate-[-12deg]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>

          {/* Counter Badge */}
          {history.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-500 text-black font-black text-[9px] rounded-full flex items-center justify-center border border-zinc-950">
              {history.length}
            </span>
          )}
        </button>
      </header>

      {/* MAIN SCREEN WORKSPACE */}
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

            {/* 2. ERROR RECOVERY CARD */}
            {error && !isAnalyzing && (
              <div className="w-full bg-red-950/20 border-2 border-red-500/30 rounded-2xl p-5 shadow-2xl animate-in shake duration-300">
                <div className="flex items-center gap-3 border-b border-red-500/20 pb-3 mb-4">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <h2 className="text-red-400 text-xs font-black uppercase tracking-widest">
                    SIGNAL TRANSMISSION INTERRUPTED
                  </h2>
                </div>
                <p className="text-zinc-400 text-xs font-mono bg-zinc-950/60 p-3 rounded-xl border border-zinc-900 mb-4 leading-relaxed">
                  Code: <span className="text-red-400 font-bold">{error}</span>
                </p>
                <button
                  onClick={analyzeWithAI}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-xl transition-all active:scale-[0.98] uppercase tracking-wider text-xs shadow-[0_4px_20px_rgba(239,68,68,0.2)]"
                >
                  Retry Signal Transmission
                </button>
              </div>
            )}

            {/* 3. AI RESULT BOX WITH MATH RENDERING */}
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

                <div className="text-zinc-300 text-sm leading-relaxed space-y-4 prose prose-invert max-w-none [&&_pre]:bg-zinc-950 [&&_code]:text-yellow-400">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
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
                    {analysisResult
                      ? analysisResult
                          .replace(/\\\[/g, "$$\n") // Convert \[ to standalone block start
                          .replace(/\\\]/g, "\n$$") // Convert \] to standalone block end
                          .replace(/\\\(/g, "$") // Convert \( to inline start
                          .replace(/\\\)/g, "$") // Convert \) to inline end
                      : ""}
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

      {/* --- SIDEBAR DRAWER OVERLAY PANEL --- */}
      {/* Dimmed Backdrop Shroud */}
      <div
        onClick={() => setIsSidebarOpen(false)}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-out Sheet Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-zinc-900 border-l border-zinc-800 z-50 p-6 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
          <h2 className="text-sm font-bold tracking-widest text-zinc-400 uppercase">
            Scan History log
          </h2>  
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-zinc-500 hover:text-white text-xs active:scale-95"
          >
            ✕ Close
          </button>
        </div>

        {/* Dynamic List Rendering */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <span className="text-2xl mb-2 opacity-30">📁</span>
              <p className="text-zinc-600 text-xs uppercase tracking-wider">
                Logbook Empty
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className="group flex items-center gap-3 bg-zinc-950/50 hover:bg-zinc-800/80 p-2.5 rounded-xl border border-zinc-800/60 hover:border-yellow-500/30 transition-all cursor-pointer select-none active:scale-[0.98]"
              >
                {/* Micro Thumbnail Preview */}
                <div className="h-12 w-12 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0">
                  <img
                    src={item.image}
                    alt="Thumbnail"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>

                {/* Meta details */}
                <div className="min-w-0 flex-1">
                  <p className="text-zinc-300 text-xs font-semibold truncate group-hover:text-yellow-500 transition-colors">
                    {item.result.slice(0, 45).replace(/[#*`]/g, "")}...
                  </p>
                  <span className="text-[10px] text-zinc-600 font-mono block mt-0.5">
                    Transmission • {item.timestamp}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </main>
  );
}