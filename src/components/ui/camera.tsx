"use client";

import React, { useRef, useState, useCallback } from 'react';

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

  // Starts the back camera stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Unable to access camera. Please check browser permissions.");
    }
  };

  // Captures current video frame and converts to Base64
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (video && video.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0);
      
      // High quality JPEG format
      const base64Image = canvas.toDataURL('image/jpeg', 0.9);
      onCapture(base64Image);
      
      // Stop the camera tracks to save battery and privacy
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  }, [onCapture]);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {!isCameraActive ? (
        <button
          onClick={startCamera}
          className="w-full py-4 bg-yellow-500 text-black font-bold rounded-xl active:scale-95 transition-transform"
        >
          Open Scanner
        </button>
      ) : (
        <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Shutter Button */}
          <button
            onClick={capturePhoto}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 border-4 border-white rounded-full bg-white/20 hover:bg-white/40 transition-colors"
          />
        </div>
      )}
    </div>
  );
}
