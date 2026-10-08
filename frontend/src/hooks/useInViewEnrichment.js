import { useEffect, useRef } from 'react';

/**
 * Hook to trigger metadata enrichment when a component enters the viewport.
 * @param {Object} song - The song object to enrich.
 * @param {Function} enrichMetadata - The enrichment function from usePlayerMetadata.
 */
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
            rootMargin: '300px' // Prefetch 300px before scrolling into view
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
