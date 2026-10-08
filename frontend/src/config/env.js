const getYoutubeKeys = () => {
    const keys = [
        import.meta.env.VITE_YOUTUBE_API_KEY,
        ...Array.from({ length: 10 }, (_, i) => import.meta.env[`VITE_YOUTUBE_API_KEY_${i + 1}`])
    ].filter(Boolean);
    
    return [...new Set(keys)].filter(k => k.length > 5 && k !== "YOUR_YOUTUBE_API_KEY_HERE");
};

export const ENV = {
    IS_PROD: import.meta.env.PROD,
    IS_DEV: import.meta.env.DEV,
    BASE_URL: import.meta.env.BASE_URL || '/',
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'https://api.backend.songs.sumanonline.com',
    
    YOUTUBE: {
        API_KEYS: getYoutubeKeys(),
        BASE_URL: "https://www.googleapis.com/youtube/v3"
    },
    
    GDRIVE: {
        API_KEY: import.meta.env.VITE_GDRIVE_API_KEY_1 || "",
        FOLDER_ID: import.meta.env.VITE_GDRIVE_FOLDER_ID || "",
    },
    
    LRCLIB: {
        BASE_URL: "https://lrclib.net/api"
    },

    LASTFM: {
        API_KEY: import.meta.env.VITE_LASTFM_API_KEY || "",
    },

    REDIS: {
        REST_URL: import.meta.env.VITE_REDIS_REST_URL || import.meta.env.VITE_UPSTASH_REDIS_REST_URL || "",
        REST_TOKEN: import.meta.env.VITE_REDIS_REST_TOKEN || import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN || "",
    },
    
    FIREBASE: {
        API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || "",
        AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
        PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
        STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
        MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
        APP_ID: import.meta.env.VITE_FIREBASE_APP_ID || "",
    }
};

if (ENV.IS_DEV) {
    if (!ENV.YOUTUBE.API_KEYS.length) console.warn("Missing VITE_YOUTUBE_API_KEY");
    if (!ENV.GDRIVE.API_KEY) console.warn("Missing VITE_GDRIVE_API_KEY_1");
    if (!ENV.FIREBASE.API_KEY) console.warn("Missing Firebase configuration");
}
