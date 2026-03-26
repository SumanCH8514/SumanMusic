import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for Voice Search using the Web Speech API.
 */
export const useVoiceSearch = ({ onResult, onError }) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (event) => {
                setIsListening(false);
                if (onError) onError(event.error);
            };
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (onResult) onResult(transcript);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onResult, onError]);

    const startListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (err) {
                console.warn("Speech recognition already started or failed:", err);
            }
        } else {
            if (onError) onError("not-supported");
        }
    }, [onError]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    return { 
        isListening, 
        startListening, 
        stopListening,
        isSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    };
};
