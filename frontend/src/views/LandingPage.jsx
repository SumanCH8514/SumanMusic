import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Globe,
  Shield,
  ArrowRight,
  X,
  Chrome,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Menu,
  Sliders,
  Music,
  HardDrive,
  Smartphone,
  Volume2,
  Folder,
  FileAudio,
  Disc,
  Laptop,
  Search
} from 'lucide-react';
import logoImg from '../assets/logo.png';

const FAQ_LIST = [
  {
    question: "Do my audio files get uploaded or stored on SumanMusic's servers?",
    answer: "No. SumanMusic runs entirely client-side inside your browser. Audio streams directly from your personal Google Drive account to your device via Google's official range-request HTTPS APIs. We do not host, store, copy, or proxy your files on any external server."
  },
  {
    question: "Does playback keep running when my phone screen is locked?",
    answer: "Yes. SumanMusic integrates directly with the standard browser Media Session API. On both iOS (Safari) and Android (Chrome), audio continues playing smoothly in the background, complete with lock screen controls, album artwork, track seeking, and Bluetooth car controls."
  },
  {
    question: "How do I install SumanMusic on my iPhone or Android device?",
    answer: "SumanMusic is built as a Progressive Web App (PWA). On iPhone, open the site in Safari, tap the Share icon, and select 'Add to Home Screen'. On Android, tap the three dots in Chrome and tap 'Install app'. You get a full, borderless native app experience."
  },
  {
    question: "What audio formats can I stream from Google Drive?",
    answer: "SumanMusic supports lossless FLAC (up to 24-bit / 96kHz studio masters), 320kbps MP3, AAC, M4A, WAV, OGG, and WebM. Files are streamed at their native source bitrate without lossy re-encoding."
  },
  {
    question: "Can I try SumanMusic before connecting my Google account?",
    answer: "Yes. Simply click 'Explore Live Demo' or 'Continue as Guest'. You can immediately test out the interface, equalizer, queue management, synchronized lyrics, and online search without granting any permissions."
  },
  {
    question: "Is SumanMusic free to use?",
    answer: "Yes, SumanMusic is free for personal use with your own Google Drive storage."
  }
];

const SCREENSHOT_TABS = [
  {
    id: 'library',
    label: 'Drive Library',
    src: '/screenshots/home_dark.png',
    alt: 'SumanMusic Drive Library View',
    tag: 'Organized & Tagged',
    desc: 'Instant indexing of all music folders with album art, artist grouping, and search.'
  },
  {
    id: 'player',
    label: 'Synced Lyrics & Player',
    src: '/screenshots/player_expanded.png',
    alt: 'SumanMusic Fullscreen Player with Synced Lyrics',
    tag: 'Live Karaoke',
    desc: 'Fullscreen player with synchronized line-by-line lyrics and audio visualizer.'
  },
  {
    id: 'search',
    label: 'Search & Browse',
    src: '/screenshots/search.png',
    alt: 'SumanMusic Search & Category Browse View',
    tag: 'Instant Query',
    desc: 'Quickly find any song, artist, album, or category with zero input lag.'
  }
];

const LandingPage = () => {
  const { user, loginWithGoogle, continueAsGuest, loading, authError: contextAuthError, isRedirecting } = useAuth();
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [activeTab, setActiveTab] = useState('library');
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    if (contextAuthError) {
      setAuthError(contextAuthError);
      setShowAuthModal(true);
    }
  }, [contextAuthError]);

  useEffect(() => {
    if (user) {
      navigate('/app', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn || isGuestLoading || isRedirecting) return;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
      navigate('/app', { replace: true });
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setIsLoggingIn(false);
        return;
      }
      let errorMessage = 'Failed to sign in with Google. Please try again.';
      if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked by browser. Please allow popups for this site.';
      }
      setAuthError(errorMessage);
      setIsLoggingIn(false);
    }
  };

  const handleGuestMode = async () => {
    if (isLoggingIn || isGuestLoading || isRedirecting) return;
    setIsGuestLoading(true);
    setAuthError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      continueAsGuest();
      navigate('/app');
    } catch {
      setAuthError('Failed to enter guest mode.');
    } finally {
      setIsGuestLoading(false);
    }
  };

  const currentScreenshot = SCREENSHOT_TABS.find((t) => t.id === activeTab) || SCREENSHOT_TABS[0];

  const isReturningFromRedirect = typeof window !== 'undefined' && sessionStorage.getItem('suman_google_redirect') === 'true';
  if (loading && isReturningFromRedirect) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center text-zinc-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center max-w-sm"
        >
          <img src={logoImg} alt="SumanMusic" width="160" height="50" className="h-11 w-auto object-contain mb-2" />
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <div className="absolute inset-0 blur-lg bg-emerald-500/20 rounded-full" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">Signing in with Google</h3>
            <p className="text-xs text-zinc-400">Verifying your account and preparing your music workspace...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300 antialiased overflow-x-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[750px] h-[450px] bg-emerald-500/10 blur-[130px] rounded-full" />
        <div className="absolute top-[40%] right-[-100px] w-[500px] h-[400px] bg-teal-500/5 blur-[120px] rounded-full" />
      </div>
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => !isLoggingIn && !isGuestLoading && setShowAuthModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-[#12131a] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 text-center"
            >
              <button
                onClick={() => !isLoggingIn && !isGuestLoading && setShowAuthModal(false)}
                disabled={isLoggingIn || isGuestLoading}
                aria-label="Close modal"
                className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-0"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex justify-center mb-5">
                <img
                  src={logoImg}
                  alt="SumanMusic"
                  width="160"
                  height="50"
                  className="h-11 w-auto object-contain"
                />
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Connect Your Music</h3>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed max-w-xs mx-auto">
                Sign in with Google to stream your Drive music folder, or explore with our live demo session.
              </p>

              <AnimatePresence>
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2 text-left"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn || isGuestLoading || isRedirecting}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-sm transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoggingIn || isRedirecting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <Chrome className="w-4 h-4 text-zinc-800" />
                  )}
                  <span>{isLoggingIn || isRedirecting ? 'Redirecting to Google...' : 'Continue with Google'}</span>
                </button>

                <button
                  onClick={handleGuestMode}
                  disabled={isLoggingIn || isGuestLoading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {isGuestLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  ) : (
                    <Globe className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{isGuestLoading ? 'Entering Demo...' : 'Continue as Guest'}</span>
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-zinc-500">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Read-only Drive scope • 100% Client-side direct stream</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-[#090a0f]/90 backdrop-blur-md border-b border-white/10 py-3 shadow-lg'
            : 'bg-transparent py-5 border-b border-white/5'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src={logoImg}
              alt="SumanMusic"
              width="150"
              height="44"
              className="h-9 sm:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
            />
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400 font-medium">
            <a href="#overview" className="hover:text-white transition-colors duration-200">
              Overview
            </a>
            <a href="#comparison" className="hover:text-white transition-colors duration-200">
              Why SumanMusic
            </a>
            <a href="#features" className="hover:text-white transition-colors duration-200">
              Features
            </a>
            <a href="#formats" className="hover:text-white transition-colors duration-200">
              Audio Specs
            </a>
            <a href="#faq" className="hover:text-white transition-colors duration-200">
              FAQ
            </a>
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={handleGuestMode}
              disabled={isGuestLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              Live Demo
            </button>

            <button
              onClick={() => {
                setAuthError(null);
                setShowAuthModal(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all duration-200 shadow-sm active:scale-95"
            >
              Sign in with Google
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-white/10 bg-[#0f1017] px-5 py-4 space-y-3 text-sm"
            >
              <a
                href="#overview"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1 text-zinc-300 hover:text-white"
              >
                Overview
              </a>
              <a
                href="#comparison"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1 text-zinc-300 hover:text-white"
              >
                Why SumanMusic
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1 text-zinc-300 hover:text-white"
              >
                Features
              </a>
              <a
                href="#formats"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1 text-zinc-300 hover:text-white"
              >
                Audio Specs
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1 text-zinc-300 hover:text-white"
              >
                FAQ
              </a>
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleGuestMode();
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/5 text-white font-medium text-xs text-center hover:bg-white/10 transition-colors"
                >
                  Explore as Guest
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowAuthModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs text-center hover:bg-emerald-400 transition-colors"
                >
                  Sign in with Google
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <section id="overview" className="relative z-10 pt-12 sm:pt-16 md:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Private Cloud Music Player</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12] max-w-4xl mx-auto mb-6"
        >
          Turn your Google Drive into a private, high-fidelity music streaming service.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-8 font-normal"
        >
          Stream your MP3, FLAC, and AAC library straight from Google Drive. Full background lock-screen playback on iPhone and Android, synchronized karaoke lyrics, 5-band studio equalizer, and zero server storage.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto mb-10"
        >
          <button
            onClick={() => {
              setAuthError(null);
              setShowAuthModal(true);
            }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 group"
          >
            <span>Connect Google Drive</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          <button
            onClick={handleGuestMode}
            disabled={isGuestLoading}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
          >
            {isGuestLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
            )}
            <span>Explore Live Demo</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.32 }}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400"
        >
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> 100% Client-Side Direct Stream
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> No Local Storage Consumed
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> Read-only Drive Scope
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> Installable PWA for Mobile
          </span>
        </motion.div>
      </section>
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-[#111219] border border-white/10 shadow-2xl overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-[#161722] border-b border-white/10 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]/70 inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]/70 inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f]/70 inline-block" />
              <div className="ml-3 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-md bg-black/40 border border-white/5 text-[11px] text-zinc-400 font-mono">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>app.sumanmusic.com</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs font-medium self-start sm:self-auto overflow-x-auto max-w-full">
              {SCREENSHOT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap text-xs ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative aspect-[16/9] w-full bg-[#0a0b10] overflow-hidden group">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentScreenshot.id}
                src={currentScreenshot.src}
                alt={currentScreenshot.alt}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full h-full object-cover object-top"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
              <button
                onClick={handleGuestMode}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-2xl flex items-center gap-2 transform group-hover:scale-105 transition-all duration-200"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Interactive Demo</span>
              </button>
            </div>
          </div>
          <div className="px-5 py-3.5 bg-[#141520] border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold text-[11px]">
                {currentScreenshot.tag}
              </span>
              <span>{currentScreenshot.desc}</span>
            </div>
            <button
              onClick={handleGuestMode}
              className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 self-start sm:self-auto hover:underline"
            >
              <span>Test live in browser</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </section>
      <section id="comparison" className="relative z-10 py-20 bg-[#0c0d14] border-y border-white/5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              Why not just use the standard Google Drive app?
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Google Drive is built for documents and PDFs. Playing audio in it is frustrating. SumanMusic brings the dedicated player experience your audio collection needs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl bg-[#12131b] border border-white/5 p-6 sm:p-8 space-y-4 hover:border-white/10 transition-colors"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span>Default Google Drive Player</span>
              </div>
              <ul className="space-y-3.5 text-sm text-zinc-400 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span>Playback stops as soon as your mobile screen locks or you switch apps.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span>Shows raw filenames like <code className="text-xs text-zinc-300 bg-white/5 px-1.5 py-0.5 rounded">track_02_master_final.mp3</code> with no cover art or artists.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span>No queue management, playlists, shuffle, repeat, or crossfading.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span>No equalizer or volume boost — older vinyl rips and acoustic sets sound quiet.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span>No synchronized lyrics or song credits.</span>
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl bg-[#111618] border border-emerald-500/25 p-6 sm:p-8 space-y-4 shadow-xl shadow-emerald-950/20 hover:border-emerald-500/40 transition-colors"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>With SumanMusic</span>
              </div>
              <ul className="space-y-3.5 text-sm text-zinc-200 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Uninterrupted background lock-screen playback on iPhone, Android, & desktop.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Automatic ID3 metadata extraction: high-res album covers, artist bios, and albums.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Real-time synchronized lyrics that autoscroll karaoke-style as you listen.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>5-band precision equalizer with up to 300% volume boost and crossfade.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Custom playlists, favorites, and instant search across thousands of tracks.</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>
      <section id="features" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center"
        >
          <div className="md:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-semibold text-emerald-400">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile-First Integration</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Plays in the background. Full lock-screen controls.
            </h3>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Lock your phone, slip it in your pocket, and keep listening. SumanMusic connects with the browser Media Session API so you can skip tracks, scrub timestamps, and see artwork on your iOS Lock Screen, Android Notification Shade, and Bluetooth car dashboard.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">iOS Lock Screen</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">Android Media Notification</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">Bluetooth & CarPlay / Auto</span>
            </div>
          </div>

          <div className="md:col-span-6">
            <div className="rounded-2xl bg-[#12131c] border border-white/10 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">Now Playing on Device</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" /> Active
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shrink-0 shadow-md">
                  <Music className="w-7 h-7 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">Somewhere Only We Know</h4>
                  <p className="text-xs text-zinc-400 truncate">Keane • Hopes and Fears (Deluxe)</p>
                  <p className="text-[11px] text-emerald-400 mt-1 font-mono">Streamed from Google Drive</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-2/5 rounded-full" />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>1:28</span>
                  <span>3:57</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center md:flex-row-reverse"
        >
          <div className="md:col-span-6 md:order-2 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-semibold text-emerald-400">
              <Sliders className="w-3.5 h-3.5" />
              <span>Web Audio DSP</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              5-band studio equalizer & 300% sound boost.
            </h3>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Quiet vinyl rips and older acoustic recordings can be boosted up to 300% with built-in soft-limiting to prevent distortion. Tailor your listening with Bass Boost, Vocal Clarity, Electronic, and Acoustic presets or create your own custom response curve.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">5 Biquad Bands</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">Pre-amp Gain Booster</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">Smooth Crossfading</span>
            </div>
          </div>

          <div className="md:col-span-6 md:order-1">
            <div className="rounded-2xl bg-[#12131c] border border-white/10 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Audio Studio DSP</span>
                </span>
                <span className="text-emerald-400 font-mono text-xs">+3.5 dB Pre-amp Gain</span>
              </div>
              <div className="grid grid-cols-5 gap-3 h-28 items-end pt-2">
                {[
                  { label: '60 Hz', h: '80%' },
                  { label: '230 Hz', h: '65%' },
                  { label: '910 Hz', h: '50%' },
                  { label: '3.6 kHz', h: '65%' },
                  { label: '14 kHz', h: '75%' }
                ].map((b, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-2.5 bg-white/10 rounded-full h-20 flex items-end overflow-hidden">
                      <div className="w-full bg-emerald-500 rounded-full transition-all duration-300" style={{ height: b.h }} />
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center"
        >
          <div className="md:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-semibold text-emerald-400">
              <FileAudio className="w-3.5 h-3.5" />
              <span>Karaoke Sync Engine</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Real-time synchronized lyrics for every song.
            </h3>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Follow along with synchronized line-by-line lyrics that scroll automatically with the music. Tap any line in the lyrics view to seek directly to that exact verse or chorus.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">Auto-scroll Follow</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">Tap any line to seek</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">LRC & Tagged Support</span>
            </div>
          </div>

          <div className="md:col-span-6">
            <div className="rounded-2xl bg-[#12131c] border border-white/10 p-6 space-y-3.5 text-center shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs text-zinc-500">
                <span>Lyrics View</span>
                <span className="text-emerald-400 font-mono">0:26 / 3:57</span>
              </div>
              <p className="text-zinc-500 text-xs">Somewhere only we know</p>
              <p className="text-lg font-bold text-white py-1">
                Oh simple thing, where have you gone?
              </p>
              <p className="text-zinc-400 text-xs">I'm getting old and I need something to rely on</p>
              <p className="text-zinc-500 text-xs">So tell me when you're gonna let me in</p>
            </div>
          </div>
        </motion.div>
      </section>
      <section id="formats" className="relative z-10 py-16 bg-[#0c0d14] border-y border-white/5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Lossless and high-bitrate audio formats supported.
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Streamed at the exact source bitrate without forced downsampling.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { format: 'FLAC', desc: 'Up to 24-bit / 96kHz' },
              { format: 'MP3', desc: 'Up to 320 kbps CBR/VBR' },
              { format: 'AAC / M4A', desc: 'Lossless & 256kbps' },
              { format: 'WAV', desc: 'Uncompressed PCM' },
              { format: 'OGG', desc: 'Vorbis & Opus audio' },
              { format: 'WebM', desc: 'Standard Opus streams' }
            ].map((f, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-[#12131d] border border-white/5 hover:border-white/15 transition-all text-center space-y-1"
              >
                <div className="text-base font-bold text-white">{f.format}</div>
                <div className="text-[11px] text-zinc-400">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
            Get started in 30 seconds
          </h2>
          <p className="text-sm text-zinc-400">
            No software installation required on your computer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-[#12131c] border border-white/5 p-6 space-y-3 hover:border-white/10 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-sm font-bold flex items-center justify-center">
              1
            </div>
            <h3 className="text-base font-bold text-white">Sign in with Google</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Connect your Google account. We request read-only Drive permissions to find and stream your audio files.
            </p>
          </div>

          <div className="rounded-2xl bg-[#12131c] border border-white/5 p-6 space-y-3 hover:border-white/10 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-sm font-bold flex items-center justify-center">
              2
            </div>
            <h3 className="text-base font-bold text-white">Pick your music folder</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Select the folder containing your music. SumanMusic automatically indexes artist names, album art, and tags.
            </p>
          </div>

          <div className="rounded-2xl bg-[#12131c] border border-white/5 p-6 space-y-3 hover:border-white/10 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-sm font-bold flex items-center justify-center">
              3
            </div>
            <h3 className="text-base font-bold text-white">Start listening</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Stream on your phone, tablet, or laptop with synchronized lyrics, playlists, and equalizers with zero ads.
            </p>
          </div>
        </div>
      </section>
      <section id="faq" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-zinc-400">
            Clear, honest answers about privacy, compatibility, and streaming.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_LIST.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl bg-[#12131c] border border-white/5 overflow-hidden transition-colors hover:border-white/10"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                className="w-full px-5 py-4 text-left font-semibold text-sm sm:text-base text-white hover:text-emerald-400 transition-colors flex items-center justify-between gap-4"
              >
                <span>{faq.question}</span>
                {activeFaq === index ? (
                  <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {activeFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 pt-1 text-sm text-zinc-400 leading-relaxed border-t border-white/5">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-gradient-to-b from-[#131622] to-[#0c0d14] border border-white/10 p-8 sm:p-14 space-y-6 shadow-2xl"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Ready to listen to your personal collection?
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
            Free, private, and open. Connect your Google Drive or jump into the live guest demo with one click.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto pt-2">
            <button
              onClick={() => {
                setAuthError(null);
                setShowAuthModal(true);
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition-all duration-200 shadow-md active:scale-95 flex items-center justify-center gap-2 group"
            >
              <span>Connect Google Drive</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-1" />
            </button>
            <button
              onClick={handleGuestMode}
              disabled={isGuestLoading}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm transition-all duration-200 active:scale-95"
            >
              <span>Explore Live Demo</span>
            </button>
          </div>
        </motion.div>
      </section>
      <footer className="relative z-10 border-t border-white/5 bg-[#06070a] py-12 px-4 sm:px-6 lg:px-8 text-xs text-zinc-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="SumanMusic"
              width="130"
              height="38"
              className="h-8 w-auto object-contain cursor-pointer"
              onClick={() => navigate('/')}
            />
            <span className="text-zinc-500 hidden sm:inline">•</span>
            <span className="text-zinc-400">Personal Google Drive Music Player</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/about-us" className="hover:text-white transition-colors duration-200">
              About
            </Link>
            <Link to="/contact-us" className="hover:text-white transition-colors duration-200">
              Contact
            </Link>
            <Link to="/privacy-policy" className="hover:text-white transition-colors duration-200">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-white transition-colors duration-200">
              Terms of Service
            </Link>
          </div>

          <p className="text-zinc-400">© {new Date().getFullYear()} SumanMusic. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
