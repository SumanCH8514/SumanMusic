import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}


export async function fetchImageToBase64(url, size = 64) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => {
        console.warn("Failed to load image for Base64 conversion (likely rate limited). Falling back to original URL.");
        resolve(null);
      };
      img.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error("Base64 conversion error:", error);
    return null;
  }
}
