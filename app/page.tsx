"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase/client";
import Camera from "@/src/components/ui/camera";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { compressImage } from "@/src/lib/compressor";
import { User } from "@supabase/supabase-js";

// Load static fonts and symbol configurations for KaTeX math rendering
import "katex/dist/katex.min.css";

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

  // HISTORY & NAVIGATION STATES
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // AUTHENTICATION STATES
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- AUTHENTICATION ACTIONS ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsAuthModalOpen(false); 
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Account created successfully! You can now sign in.");
        setAuthMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      setEmail("");
      setPassword("");
    } catch (err: any) {
      console.error("Auth transaction failed:", err.message);
      setAuthError(err.message || "Something went wrong. Please check your credentials.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setHistory([]); 
      handleReset();  
    } catch (err) {
      console.error("Sign out execution interrupted:", err);
    }
  };

  // --- CORE SYSTEM HANDLERS ---
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

  // --- CLOUD SYNC LOGIC ---
  useEffect(() => {
    const fetchCloudHistory = async () => {
      if (!user) {
        setHistory([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("scans")
          .select("id, image_url, analysis_text, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        if (data) {
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
      } catch (err: any) {
        console.error("Error loading logs:", err.message);
      }
    };
    fetchCloudHistory();
  }, [user]);

  // --- AI ANALYSIS WITH AUTH SECURITY FIXED ---
  const analyzeWithAI = async () => {
    if (!capturedImage) return;

    // Direct UX check: If there is no user session active, open the login modal and stop execution safely
    if (!user) {
      setAuthMode("signin");
      setAuthError("Please sign in to process and save image scans.");
      setIsAuthModalOpen(true);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Pull the active session token dynamically from Supabase client
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Pass the bearer token to clear the 401 gate on the backend
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify({ image: capturedImage }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not connect to the solver. Please try again.");

      setAnalysisResult(data.result);

      const newItem: HistoryItem = {
        id: data.id || Math.random().toString(36).substring(2, 11),
        image: capturedImage,
        result: data.result,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setHistory((prev) => [newItem, ...prev]);
    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      setError(error.message || "Connection lost. Please check your internet connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setCapturedImage(item.image);
    setAnalysisResult(item.result);
    setError(null);
    setIsSidebarOpen(false);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col items-center relative overflow-x-hidden">
      
      {/* APP TOP NAVIGATION BAR */}
      <header className="w-full max-w-md flex items-center justify-between mt-4 mb-10">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-yellow-500 transition-all active:scale-95 flex items-center gap-2 text-xs font-medium relative"
          title="Open Library"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          Library
          {history.length > 0 && (
            <span className="h-4 px-1.5 bg-yellow-500 text-black font-black text-[9px] rounded-full flex items-center justify-center">
              {history.length}
            </span>
          )}
        </button>

        <div className="text-right">
          <h1 className="text-2xl font-black text-yellow-500 italic tracking-tighter">
            SCHOLARSCAN
          </h1>
          <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-widest">
            AI Study Assistant
          </p>
        </div>
      </header>

      {/* COMPONENT INTERACTIVE WORKSPACE */}
      <section className="w-full max-w-md flex-1">
        {!capturedImage ? (
          <div className="space-y-4">
            <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/80 backdrop-blur-sm">
              <p className="text-zinc-400 text-center text-xs mb-4 font-medium tracking-wide">
                Center your equation or diagram inside the frame
              </p>
              <Camera onCapture={handleCapture} />
            </div>

            {/* QUICK LINK IN-LINE SIGN IN NOTICE */}
            <div className="text-center pt-2">
              {user ? (
                <p className="text-zinc-500 text-xs">
                  Logged in as <span className="text-zinc-400 font-medium">{user.email}</span>
                </p>
              ) : (
                <p className="text-zinc-500 text-xs">
                  Want to save your calculations?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("signin");
                      setAuthError(null);
                      setIsAuthModalOpen(true);
                    }}
                    className="text-yellow-500 hover:text-yellow-400 font-semibold underline underline-offset-2 transition-colors"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* IMAGE PREVIEW SCREEN */}
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 select-none">
              <img
                src={capturedImage}
                alt="Scan Preview"
                className={`w-full object-contain max-h-[42vh] transition-all duration-500 ${
                  isAnalyzing ? "brightness-[0.4] blur-xs scale-102" : "brightness-100"
                } ${error ? "border-zinc-800 grayscale brightness-[0.5]" : ""}`}
              />

              {isAnalyzing && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-800 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide text-yellow-500 animate-pulse whitespace-nowrap shadow-xl">
                  Analyzing your problem...
                </div>
              )}
            </div>

            {/* HIGH-CLASS ERROR INTERFACE */}
            {error && !isAnalyzing && (
              <div className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <span className="text-base text-zinc-500">✕</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider">
                    An error occurred
                  </h2>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                  {error}
                </p>
                <button
                  onClick={analyzeWithAI}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold rounded-xl tracking-wide transition-all active:scale-[0.99]"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* INTERPRETED OUTPUT ENGINE */}
            {analysisResult && !error && (
              <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <h2 className="text-yellow-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Solution Breakdown
                  </h2>
                  <button
                    onClick={handleCopy}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700/60 active:scale-95 transition-all"
                  >
                    {copied ? "✓ Copied" : "Copy Solution"}
                  </button>
                </div>

                <div className="text-zinc-300 text-sm leading-relaxed space-y-4 prose prose-invert max-w-none [&&_pre]:bg-zinc-950 [&&_code]:text-yellow-400">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h2: ({ ...props }) => <h2 className="text-yellow-500 font-bold text-sm mt-5 mb-2 uppercase tracking-wide" {...props} />,
                      h3: ({ ...props }) => <h3 className="text-zinc-200 font-semibold text-xs mt-3 mb-1" {...props} />,
                      p: ({ ...props }) => <p className="text-zinc-300 mb-2 leading-relaxed" {...props} />,
                    }}
                  >
                    {analysisResult
                      ? analysisResult
                          .replace(/\\\[/g, "$$\n")
                          .replace(/\\\]/g, "\n$$")
                          .replace(/\\\(|\\\)/g, "$")
                      : ""}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* USER CONTROL INTERACTION BLOCK */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                disabled={isAnalyzing}
                className="flex-1 py-3.5 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-400 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-20"
              >
                {analysisResult || error ? "Clear Screen" : "Discard"}
              </button>

              {!analysisResult && !error && (
                <button
                  onClick={analyzeWithAI}
                  disabled={isAnalyzing}
                  className="flex-[2] py-3.5 bg-yellow-500 text-black font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-40 transition-all"
                >
                  {isAnalyzing ? "Solving..." : "Get Solution"}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* --- SIDEBAR LOG PANEL SYSTEM --- */}
      <div
        onClick={() => setIsSidebarOpen(false)}
        className={`fixed inset-0 bg-black/70 backdrop-blur-xs z-40 transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed top-0 left-0 h-full w-76 max-w-[80vw] bg-zinc-900 border-r border-zinc-800/80 z-50 p-5 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
          <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Your Library
          </span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-zinc-500 hover:text-zinc-200 text-sm">
            ✕
          </button>
        </div>

        {/* LOGBOOK SCANS CONTAINER */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {history.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-zinc-800/60">
              <span className="text-lg mb-1 opacity-20">📁</span>
              <p className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider">Library is empty</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className="group flex items-center gap-3 bg-zinc-950/40 hover:bg-zinc-800 p-2 rounded-xl border border-zinc-800/60 hover:border-yellow-500/20 transition-all cursor-pointer"
              >
                <div className="h-10 w-10 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-zinc-800">
                  <img src={item.image} alt="Thumbnail" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-zinc-300 text-xs font-semibold truncate group-hover:text-yellow-500 transition-colors">
                    {item.result.slice(0, 35).replace(/[#*`]/g, "")}...
                  </p>
                  <span className="text-[10px] text-zinc-500 block">
                    {item.timestamp}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* USER CONFIGURATION BLOCK AT BOTTOM OF SIDEBAR */}
        <div className="pt-4 border-t border-zinc-800 mt-auto">
          {user && (
            <div className="space-y-2">
              <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-3">
                <p className="text-[9px] font-bold tracking-wider text-zinc-500 uppercase">Profile</p>
                <p className="text-zinc-400 text-xs truncate mt-0.5">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full py-2.5 bg-zinc-950 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-500/20 rounded-xl font-bold text-xs tracking-wider transition-colors active:scale-95"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* --- AUTHENTICATION MODAL DIALOG --- */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 text-sm"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-yellow-500 uppercase tracking-wide">
                {authMode === "signin" ? "Sign In" : "Create Account"}
              </h2>
              <p className="text-zinc-500 text-xs mt-1">
                {authMode === "signin" ? "Access your personalized solution history" : "Save and track your solution history over time"}
              </p>
            </div>

            {authError && (
              <div className="bg-zinc-950 text-red-400 border border-red-500/20 text-xs p-3 rounded-xl mb-4">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-yellow-500/40 transition-colors"
                  placeholder="yourname@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-yellow-500/40 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-all mt-2"
              >
                {isAuthLoading ? "Connecting..." : authMode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-zinc-800/80 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "signin" ? "signup" : "signin");
                  setAuthError(null);
                }}
                className="text-zinc-400 hover:text-yellow-500 text-xs transition-colors"
              >
                {authMode === "signin" ? "New around here? Create an account" : "Already have an account? Sign In"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}