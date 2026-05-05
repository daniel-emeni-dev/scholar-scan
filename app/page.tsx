"use client";

import { useState } from 'react';
import Camera from '@/components/ui/camera';

/**
 * ScholarScan Home Page
  * Manages the workflow from capturing a note to AI analysis.
   */
   export default function Home() {
     // --- STATE ---
       const [capturedImage, setCapturedImage] = useState<string | null>(null);
         const [isAnalyzing, setIsAnalyzing] = useState(false);

           // --- HANDLERS ---
             
               const handleCapture = (imageData: string) => {
                   setCapturedImage(imageData);
                     };

                       const handleReset = () => {
                           setCapturedImage(null);
                               setIsAnalyzing(false);
                                 };

                                   const analyzeWithAI = async () => {
                                       setIsAnalyzing(true);
                                           // This console log uses the variable so it won't throw an error
                                               console.log("Analyzing image...", capturedImage?.slice(0, 20));
                                                   
                                                       // Simulate a delay for now
                                                           setTimeout(() => {
                                                                 setIsAnalyzing(false);
                                                                       alert("AI Analysis feature coming in the next commit!");
                                                                           }, 2000);
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
                                                                                                                                                                                                                                                         <div className="space-y-6">
                                                                                                                                                                                                                                                                     <div className="rounded-2xl overflow-hidden border-2 border-yellow-500/50 bg-zinc-900">
                                                                                                                                                                                                                                                                                   <img src={capturedImage} alt="Scan" className="w-full object-contain max-h-[50vh]" />
                                                                                                                                                                                                                                                                                               </div>

                                                                                                                                                                                                                                                                                                           <div className="flex gap-4">
                                                                                                                                                                                                                                                                                                                         <button onClick={handleReset} className="flex-1 py-4 text-zinc-400 font-semibold">
                                                                                                                                                                                                                                                                                                                                         Retake
                                                                                                                                                                                                                                                                                                                                                       </button>
                                                                                                                                                                                                                                                                                                                                                                     <button
                                                                                                                                                                                                                                                                                                                                                                                     onClick={analyzeWithAI}
                                                                                                                                                                                                                                                                                                                                                                                                     disabled={isAnalyzing}
                                                                                                                                                                                                                                                                                                                                                                                                                     className="flex-[2] py-4 bg-yellow-500 text-black font-extrabold rounded-xl disabled:opacity-50"
                                                                                                                                                                                                                                                                                                                                                                                                                                   >
                                                                                                                                                                                                                                                                                                                                                                                                                                                   {isAnalyzing ? "ANALYZING..." : "ANALYZE SCAN"}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                 </button>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                             </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               )}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     </section>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         </main>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      