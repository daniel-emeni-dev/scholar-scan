/**
 * Utility to compress base64 images on the client side using HTML5 Canvas
 * @param base64Str The raw data URL string from the camera capture
 * @param maxWidth The maximum width boundary for the scaled image (default: 1200px)
 * @param quality Compression factor between 0.0 and 1.0 (default: 0.75)
 */
export function compressImage(
  base64Str: string,
  maxWidth = 1200,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Calculate new scaled dimensions maintaining the original aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get 2D canvas context"));
        return;
      }

      // Draw the image onto the canvas shell at the new dimensions
      ctx.drawImage(img, 0, 0, width, height);

      // Export the compressed image as a JPEG data URL
      const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedBase64);
    };

    img.onerror = (error) => {
      reject(error);
    };
  });
}