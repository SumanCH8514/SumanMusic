import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Mic, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';

const DesktopHeaderSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isVoiceSearchEnabled = true } = useSettings() || {};
  
  const isSearchPage = location.pathname === '/app/search';
  const urlQuery = isSearchPage ? (new URLSearchParams(location.search).get('q') || '') : '';
  const [localQuery, setLocalQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const query = isSearchPage ? urlQuery : localQuery;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (isSearchPage) {
      if (val.trim()) {
        navigate(`/app/search?q=${encodeURIComponent(val)}`, { replace: true });
      } else {
        navigate('/app/search', { replace: true });
      }
    } else {
      setLocalQuery(val);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/app/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/app/search');
    }
  };

  const handleClear = () => {
    if (isSearchPage) {
      navigate('/app/search', { replace: true });
    } else {
      setLocalQuery('');
    }
  };

  const toggleVoiceSearch = () => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      navigate('/app/search');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript?.trim()) {
          const text = transcript.trim();
          if (!isSearchPage) {
            setLocalQuery(text);
          }
          navigate(`/app/search?q=${encodeURIComponent(text)}`);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setIsListening(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl group">
      <button
        type="submit"
        aria-label="Search"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none z-10"
      >
        <Search className="w-4 h-4" />
      </button>

      <input
        type="text"
        id="desktop-header-search-input"
        name="desktop-header-search-input"
        value={query}
        onChange={handleInputChange}
        placeholder={isListening ? "Listening... Speak now" : "Artists, songs, or podcasts"}
        enterKeyHint="search"
        autoComplete="off"
        maxLength={100}
        className={cn(
          "w-full bg-bg-surface/80 border rounded-full py-2 pl-10 pr-20 text-xs sm:text-sm font-medium text-text-primary transition-all shadow-xs",
          "placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary/40",
          isListening
            ? "border-primary/60 ring-1 ring-primary/40 placeholder:text-primary animate-pulse"
            : "border-border-main/15 hover:border-border-main/30 focus:border-primary/50"
        )}
      />

      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="p-1 rounded-full text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {isVoiceSearchEnabled && (
          <button
            type="button"
            onClick={toggleVoiceSearch}
            aria-label="Voice search"
            className={cn(
              "p-1.5 rounded-full transition-all active:scale-95 flex items-center justify-center",
              isListening
                ? "bg-primary text-black shadow-md shadow-primary/30 animate-pulse"
                : "text-text-secondary hover:text-text-primary hover:bg-border-main/10"
            )}
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </form>
  );
};

export default DesktopHeaderSearch;
