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

export function getShareBaseUrl() {
  if (typeof window === 'undefined') return 'https://v1.songs.sumanonline.com';
  const hostname = (window.location.hostname || '').toLowerCase();
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname === 'v1.songs.sumanonline.com';

  if (isLocal) {
    return 'https://v1.songs.sumanonline.com';
  }
  return window.location.origin;
}

export function getShareUrl(pathOrUrl = '') {
  const base = getShareBaseUrl();
  if (!pathOrUrl) {
    if (typeof window === 'undefined') return base;
    return `${base}${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    try {
      const parsed = new URL(pathOrUrl);
      return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return pathOrUrl;
    }
  }
  const normalized = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${normalized}`;
}
