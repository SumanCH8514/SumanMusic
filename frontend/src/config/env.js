export const ENV = {
    IS_PROD: import.meta.env.PROD,
    IS_DEV: import.meta.env.DEV,
    BASE_URL: import.meta.env.BASE_URL || '/',
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'https://api.backend.songs.sumanonline.com',
    
    YOUTUBE: {
        BASE_URL: "https://www.googleapis.com/youtube/v3"
    },
    
    LRCLIB: {
        BASE_URL: "https://lrclib.net/api"
    },
    
    FIREBASE: {
        API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || "",
        AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
        PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
        STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
        MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
        APP_ID: import.meta.env.VITE_FIREBASE_APP_ID || "",
        MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
    }
};

if (ENV.IS_DEV) {
    if (!ENV.FIREBASE.API_KEY) console.warn("Missing Firebase configuration");
}
