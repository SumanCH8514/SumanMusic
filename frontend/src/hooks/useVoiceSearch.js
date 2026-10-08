import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for Voice Search using the Web Speech API.
 */
export const useVoiceSearch = ({ onResult, onError }) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            if (onError) onError("not-supported");
            return;
        }

        // Always create a fresh instance for mobile compatibility
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            setIsListening(false);
            if (onError) onError(event.error);
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (event.results[0].isFinal && onResult) {
                onResult(transcript);
                recognition.stop();
            }
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch (err) {
            console.warn("Speech recognition failed to start:", err);
            if (onError) onError("failed-to-start");
        }
    }, [onResult, onError]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    return { 
        isListening, 
        startListening, 
        stopListening,
        isSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    };
};
