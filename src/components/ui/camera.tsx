"use client";

import React, { useRef, useState, useCallback } from "react";

/**
 * Camera Component
  * Handles mobile camera access and captures images as Base64 strings.
   */
interface CameraProps {
  onCapture: (imageData: string) => void;
}

export default function Camera({ onCapture }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Starts the camera stream with fallback logic for Android
  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Play error:", e));
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Primary camera failed, trying fallback...", err);
      try {
        const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = basicStream;
          setIsCameraActive(true);
        }
      } catch (secondErr) {
        alert("Camera access denied. Please check site permissions in your browser settings.");
      }
    }
  };

  // Stops the camera tracks
  const stopCamera = useCallback(() => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      setIsCameraActive(false);
    }
  }, []);

  // Captures current video frame and converts to Base64
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (video && video.videoWidth > 0) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      context?.drawImage(video, 0, 0);

      const base64Image = canvas.toDataURL("image/jpeg", 0.9);
      onCapture(base64Image);

      stopCamera();
    }
  }, [onCapture, stopCamera]);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {!isCameraActive ? (
        <div className="w-full space-y-4">
          {/* Your original Live Scanner Button */}
          <button
            onClick={startCamera}
            className="w-full py-4 bg-yellow-500 text-black font-bold rounded-xl active:scale-95 transition-transform shadow-lg"
          >
            Open Live Scanner
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink mx-4 text-zinc-600 text-[10px] uppercase font-black tracking-widest">Or</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          {/* NEW: The Android System Fallback Button */}
          <label className="w-full py-4 bg-zinc-900 text-zinc-300 font-bold rounded-xl flex items-center justify-center cursor-pointer active:bg-zinc-800 border border-zinc-800 transition-colors">
            <span className="text-sm">Use Phone Camera App</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => onCapture(reader.result as string);
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
        </div>
      ) : (
        /* This is the Live Camera view logic you already have */
        <div className="relative w-full aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            onLoadedMetadata={() => videoRef.current?.play()}
          />
          <button onClick={stopCamera} className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold">✕ Close</button>
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Live</span>
          </div>
          <button onClick={capturePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 border-4 border-white rounded-full bg-white/20 active:bg-white/40 active:scale-90 transition-all" />
        </div>
      )}
    </div>
  );
}