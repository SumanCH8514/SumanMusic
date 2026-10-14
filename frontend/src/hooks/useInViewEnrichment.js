import { useEffect, useRef } from 'react';

export const useInViewEnrichment = (song, enrichMetadata) => {
    const observerRef = useRef(null);
    const elementRef = useRef(null);

    useEffect(() => {
        if (!song || song.album || !elementRef.current) return;

        const currentElement = elementRef.current;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    enrichMetadata(song);
                    if (entry.target) {
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            threshold: 0.05,
            rootMargin: '300px'
        });

        observer.observe(currentElement);
        observerRef.current = observer;

        return () => {
            if (observerRef.current && currentElement) {
                observerRef.current.unobserve(currentElement);
            }
        };
    }, [song, enrichMetadata]);

    return elementRef;
};
