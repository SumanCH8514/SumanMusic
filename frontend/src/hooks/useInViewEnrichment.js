import { useEffect, useRef } from 'react';

export const useInViewEnrichment = (song, enrichMetadata) => {
    const observerRef = useRef(null);
    const elementRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!song || song.album || !elementRef.current) return;

        const currentElement = elementRef.current;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => {
                        enrichMetadata(song);
                        if (entry.target && observerRef.current) {
                            observerRef.current.unobserve(entry.target);
                        }
                    }, 150);
                } else {
                    if (timerRef.current) {
                        clearTimeout(timerRef.current);
                        timerRef.current = null;
                    }
                }
            });
        }, {
            threshold: 0.05,
            rootMargin: '200px'
        });

        observer.observe(currentElement);
        observerRef.current = observer;

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (observerRef.current && currentElement) {
                observerRef.current.unobserve(currentElement);
            }
        };
    }, [song, enrichMetadata]);

    return elementRef;
};
