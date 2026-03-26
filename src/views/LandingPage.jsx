import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Music, Play, Globe, Shield, Zap, ArrowRight, Github, Twitter, Instagram, Cloud, Sparkles, X, Chrome, Loader2, AlertCircle, SkipBack, SkipForward, Pause, Volume2, Shuffle, Repeat, Heart, MoreHorizontal, ChevronDown } from 'lucide-react';

const LandingPage = () => {
  const { user, loginWithGoogle, continueAsGuest, loading } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, loading, navigate]);
  const targetRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, -100]);

  const handleLogin = async () => {
    if (isLoggingIn || isGuestLoading) return;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
      navigate('/app');
    } catch (error) {
      console.error("Login failed:", error);
      let errorMessage = "Failed to sign in. Please try again.";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in popup was closed before completion.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your connection.";
      }
      setAuthError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGuestMode = async () => {
    if (isLoggingIn || isGuestLoading) return;
    setIsGuestLoading(true);
    setAuthError(null);
    try {
      // Small artificial delay for smoother transition
      await new Promise(resolve => setTimeout(resolve, 800));
      continueAsGuest();
      navigate('/app');
    } catch {
      setAuthError("Failed to enter guest mode.");
    } finally {
      setIsGuestLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 },
    },
  };

  return (
    <div className="relative min-h-screen bg-bg-base text-text-primary selection:bg-primary/30 overflow-x-hidden font-sans transition-colors duration-500">
      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoggingIn && !isGuestLoading && setShowAuthModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-all"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md overflow-hidden"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-br from-primary/30 via-text-primary/10 to-blue-600/30 rounded-[32px]" />
              <div className="relative bg-bg-surface rounded-[31px] p-8 md:p-10 border border-border-main/10 shadow-2xl transition-colors">
                <button
                  onClick={() => !isLoggingIn && !isGuestLoading && setShowAuthModal(false)}
                  disabled={isLoggingIn || isGuestLoading}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-bg-surface transition-colors group disabled:opacity-0"
                >
                  <X className="w-5 h-5 text-text-secondary group-hover:text-text-primary" />
                </button>

                <div className="flex flex-col items-center text-center">
                  <img
                    src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQcq9JW-7OCvpIQ9XvoF52Fe1G4EUkPlGGRLL0rxShLbT_1taBp0XuT2hmJDU6S2NWZh_WmwFwEpnosKk1mWXaLNqpCRGSleFgbtQLPdMo518w2Vedsnh2dZUMYyZv8YdJrghW4v3SGp8dMdCthac7Zkvi4hizggT0ueTpExsy6OEUAuIs4-2x2uGP17Po/s0/SumanMusic-logo.png"
                    alt="SumanMusic"
                    className="h-20 w-auto object-contain mb-8"
                  />
                  <p className="text-text-secondary text-sm font-medium mb-8 max-w-[240px]">
                    Connect your Google Drive and start streaming your library.
                  </p>

                  <AnimatePresence>
                    {authError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-xs font-semibold text-left overflow-hidden"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p>{authError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="w-full space-y-4">
                    <button
                      onClick={handleLogin}
                      disabled={isLoggingIn || isGuestLoading}
                      className="w-full group relative flex items-center justify-center gap-4 py-4 px-6 rounded-2xl bg-white text-black font-bold hover:bg-zinc-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        {isLoggingIn ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : (
                          <Chrome className="w-5 h-5" />
                        )}
                      </div>
                      {isLoggingIn ? 'Connecting...' : 'Continue With Google'}
                      <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/0 group-hover:ring-primary/20 transition-all" />
                    </button>

                    <button
                      onClick={handleGuestMode}
                      disabled={isLoggingIn || isGuestLoading}
                      className="w-full group relative flex items-center justify-center gap-4 py-4 px-6 rounded-2xl bg-bg-surface border border-border-main/10 text-text-primary font-bold hover:bg-bg-surface/80 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGuestLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
                      ) : (
                        <Globe className="w-5 h-5 text-text-secondary" />
                      )}
                      {isGuestLoading ? 'Entering...' : 'Continue as Guest'}
                      <div className="absolute inset-0 rounded-2xl ring-2 ring-white/0 group-hover:ring-white/10 transition-all" />
                    </button>
                  </div>

                  <div className="mt-6 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-text-secondary/50 uppercase">
                      <Shield className="w-3 h-3" />
                      Secure Cloud Encryption
                    </div>
                    <p className="text-[10px] text-text-secondary/60 leading-relaxed font-medium px-4 mt-2">
                      By continuing, you agree to our <Link to="/terms-of-service" className="text-primary hover:underline hover:text-white transition-colors" target="_blank">Terms of Service</Link> and <Link to="/privacy-policy" className="text-primary hover:underline hover:text-white transition-colors" target="_blank">Privacy Policy</Link>.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(29,185,84,0.05),transparent_70%)]" />
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[160px]" />

        {/* Subtle Mesh Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <motion.nav
        role="navigation"
        aria-label="Main Navigation"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="relative z-50 flex items-center justify-between px-4 md:px-8 py-6 md:py-10 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img
            src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQcq9JW-7OCvpIQ9XvoF52Fe1G4EUkPlGGRLL0rxShLbT_1taBp0XuT2hmJDU6S2NWZh_WmwFwEpnosKk1mWXaLNqpCRGSleFgbtQLPdMo518w2Vedsnh2dZUMYyZv8YdJrghW4v3SGp8dMdCthac7Zkvi4hizggT0ueTpExsy6OEUAuIs4-2x2uGP17Po/s0/SumanMusic-logo.png"
            alt="SumanMusic Logo"
            className="h-14 md:h-16 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex gap-8 text-sm font-medium text-text-secondary">
            <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
            <a href="#cloud" className="hover:text-text-primary transition-colors">Cloud</a>
            <Link to="/about-us" className="hover:text-text-primary transition-colors">About</Link>
          </div>
          <button
            onClick={() => {
              setAuthError(null);
              setShowAuthModal(true);
            }}
            aria-label="Get Started with SumanMusic"
            className="relative px-6 py-2.5 rounded-full overflow-hidden group font-semibold text-sm transition-all"
          >
            <div className="absolute inset-0 bg-text-primary group-hover:bg-primary transition-colors duration-300" />
            <span className="relative text-bg-base font-black">Get Started</span>
          </button>
        </div>
      </motion.nav>

      <header ref={targetRef} className="relative z-10 pt-12 md:pt-20 pb-10 md:pb-16 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          style={{ opacity, scale, y }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-bg-surface/50 border border-border-main/10 text-xs font-bold text-primary mb-12 shadow-2xl shadow-primary/10 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            BETA ACCESS OPENED
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-6xl lg:text-[9rem] font-black tracking-[calc(-0.04em)] mb-10 leading-[0.95] md:leading-[0.85] uppercase"
          >
            SumanMusic:<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-primary via-primary/80 to-blue-600">A New Way To Listen.</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="max-w-2xl mx-auto text-text-secondary text-lg md:text-xl mb-14 leading-relaxed font-medium"
          >
            SumanMusic proxies directly into your personal Google Drive, instantly generating a premium YouTube Music-styled streaming experience out of your private MP3 archives.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:row items-center justify-center gap-6"
          >
            <button
              onClick={() => {
                setAuthError(null);
                setShowAuthModal(true);
              }}
              aria-label="Continue With Google"
              className="group relative w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 rounded-full bg-primary text-black font-black text-lg md:text-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
              Continue With Google
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform stroke-[3px]" />
            </button>
            <div className="text-text-secondary text-sm font-semibold flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              No local storage required.
            </div>
          </motion.div>
        </motion.div>
      </header>

      <main>
        {/* High-Impact App Preview */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 1, ease: "circOut" }}
          className="mt-10 md:mt-16 relative"
        >
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[120%] h-[120%] bg-primary/5 blur-[120px] rounded-full" />
          <div className="relative group max-w-5xl mx-auto perspective-1000 px-4 md:px-0">
            <div className="glass rounded-3xl border border-border-main/10 p-2 md:p-4 shadow-[0_0_100px_rgba(var(--primary-rgb),0.1)] group-hover:rotate-x-2 group-hover:rotate-y-[-2deg] transition-transform duration-1000 ease-out overflow-hidden">
              <div className="w-full aspect-square sm:aspect-video lg:aspect-[16/9] rounded-2xl bg-[#0a0f0d] overflow-hidden relative border border-white/5 flex flex-col p-5 md:p-6 lg:p-8 xl:p-10">
                {/* Background Ambient Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[40%] bg-gradient-to-r from-primary/20 via-orange-500/20 to-primary/20 blur-[100px] pointer-events-none rounded-full z-0" />
                
                {/* Simulated Audio Waveform bottom */}
                <div className="absolute bottom-0 left-0 w-full h-20 opacity-[0.08] pointer-events-none flex items-end justify-center gap-1 md:gap-[2px] overflow-hidden z-0">
                  {[...Array(60)].map((_, i) => (
                     <div key={`wave-${i}`} className="w-1 md:w-2 bg-white rounded-t-sm" style={{ height: `${10 + Math.random() * 60}%` }} />
                  ))}
                </div>

                {/* Header */}
                <div className="relative z-20 flex items-center mb-4 pl-2 gap-2 md:gap-3">
                  <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-white cursor-pointer hover:scale-110 transition-transform" />
                  <p className="text-[10px] md:text-sm font-medium text-text-secondary tracking-wide">
                    Playing from <span className="font-bold text-white">Google Drive Library</span>
                  </p>
                </div>

                {/* Main 3-Column Layout */}
                <div className="relative z-20 flex-1 flex gap-6 h-full min-h-0">
                  
                  {/* Left Column: UP NEXT */}
                  <div className="hidden lg:flex flex-col w-[25%] h-full bg-white/[0.03] rounded-2xl p-5 border border-white/5 backdrop-blur-md overflow-hidden [mask-image:linear-gradient(to_bottom,white_80%,transparent_100%)]">
                    <h4 className="text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-4">"UP NEXT"</h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 p-2 rounded-xl bg-white/10 border border-white/10 shadow-lg cursor-pointer shrink-0">
                        <img src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop" className="w-10 h-10 rounded-lg object-cover shadow-md" alt="Starboy Album Cover" />
                        <div className="overflow-hidden">
                          <p className="text-white text-xs font-bold truncate">Starboy</p>
                          <p className="text-text-secondary text-[10px] truncate">The Weeknd</p>
                        </div>
                      </div>
                      {[
                        { title: "Midnight City", artist: "M83", img: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop" },
                        { title: "Blinding Lights", artist: "The Weeknd", img: "https://images.unsplash.com/photo-1619983081563-430f63602796?w=100&h=100&fit=crop" },
                        { title: "Kids", artist: "MGMT", img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop" },
                        { title: "Call Out My Name", artist: "The Weeknd", img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop" }
                      ].map((song, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors opacity-70 hover:opacity-100 shrink-0">
                          <img src={song.img} className="w-10 h-10 rounded-lg object-cover" alt={`${song.title} by ${song.artist}`} />
                          <div className="overflow-hidden">
                            <p className="text-white text-xs font-bold truncate">{song.title}</p>
                            <p className="text-text-secondary text-[10px] truncate">{song.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Center Column: Now Playing & Controls */}
                  <div className="flex-1 h-full flex flex-col items-center justify-center relative z-10">
                    <div className="relative mb-4 md:mb-6 group">
                      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-90 group-hover:scale-100 transition-transform duration-500 pointer-events-none" />
                      <img src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop" className="relative z-10 w-32 h-32 md:w-48 md:h-48 lg:w-56 lg:h-56 xl:w-64 xl:h-64 rounded-xl md:rounded-2xl shadow-2xl object-cover hover:scale-[1.02] transition-transform duration-500" alt="Starboy" />
                    </div>
                    
                    <div className="w-full max-w-md px-2 md:px-4 flex flex-col items-center text-center relative z-20">
                      <div className="w-full relative flex items-center justify-center mb-4 md:mb-6">
                        <div className="flex flex-col items-center justify-center px-10">
                          <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-white mb-1 truncate">Starboy</h2>
                          <p className="text-text-secondary text-xs md:text-base font-medium truncate">The Weeknd</p>
                        </div>
                        <div className="absolute right-0 flex gap-3 text-text-secondary hidden sm:flex">
                          <Heart className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                          <MoreHorizontal className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                        </div>
                      </div>
                      
                      {/* Playback Controls */}
                      <div className="w-full flex flex-col items-center gap-4">
                        <div className="flex items-center gap-4 md:gap-6 lg:gap-8">
                          <Shuffle className="w-4 h-4 text-text-secondary hover:text-white cursor-pointer hidden sm:block transition-colors" />
                          <SkipBack className="w-5 h-5 text-text-secondary hover:text-white cursor-pointer transition-colors" />
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md cursor-pointer hover:bg-white hover:text-black hover:scale-105 transition-all shadow-xl group">
                            <Play className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:text-black ml-1 transition-colors" fill="currentColor" />
                          </div>
                          <SkipForward className="w-5 h-5 text-text-secondary hover:text-white cursor-pointer transition-colors" />
                          <Repeat className="w-4 h-4 text-text-secondary hover:text-white cursor-pointer hidden sm:block transition-colors" />
                        </div>
                        
                        <div className="w-full flex items-center gap-3">
                          <span className="text-[10px] md:text-xs font-medium text-text-secondary w-8 text-right shrink-0">0:01</span>
                          <div className="flex-1 h-1.5 md:h-[6px] bg-white/10 rounded-full cursor-pointer overflow-hidden group">
                            <div className="h-full w-[10%] bg-primary group-hover:bg-primary-light transition-colors relative" />
                          </div>
                          <span className="text-[10px] md:text-xs font-medium text-text-secondary w-8 shrink-0">3:50</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Lyrics */}
                  <div className="hidden lg:flex flex-col w-[25%] h-full bg-white/[0.03] rounded-2xl p-6 border border-white/5 backdrop-blur-md overflow-hidden relative z-20 [mask-image:linear-gradient(to_bottom,white_80%,transparent_100%)]">
                    <div className="flex gap-6 border-b border-white/10 pb-4 mb-4 shrink-0">
                      <span className="text-xs font-black text-white tracking-widest cursor-pointer">LYRICS</span>
                      <span className="text-xs font-medium text-text-secondary hover:text-white transition-colors cursor-pointer">Up Next</span>
                    </div>
                    <div className="flex flex-col gap-4 text-sm font-medium">
                      <p className="text-text-secondary/40 hover:text-text-secondary transition-colors cursor-pointer truncate shrink-0">I'm tryna put you in the worst mood, ah</p>
                      <p className="text-white text-[15px] xl:text-base py-1 font-bold drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] shrink-0 line-clamp-2 leading-tight">P1 cleaner than your church shoes, ah</p>
                      <p className="text-text-secondary/40 hover:text-text-secondary transition-colors cursor-pointer truncate shrink-0">Milli point two just to hurt you, ah</p>
                      <p className="text-text-secondary/40 hover:text-text-secondary transition-colors cursor-pointer truncate shrink-0">All red Lamb' just to tease you, ah</p>
                      <p className="text-text-secondary/40 hover:text-text-secondary transition-colors cursor-pointer truncate shrink-0">None of these toys on lease too, ah</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Grid Features */}
        <section id="features" className="relative z-10 py-24 md:py-32 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-3xl md:text-6xl font-black mb-6 text-text-primary">WHY SUMANMUSIC?</h2>
            <p className="text-text-secondary font-medium px-4">Engineered for the modern audiophile.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 px-4 md:px-0">
            {[
              { icon: Globe, title: "Hybrid Library", desc: "Seamlessly cross-merge your personal Drive tracks with our curated global catalog, switching contexts without ever dropping the music.", color: "bg-primary" },
              { icon: Shield, title: "Uncompromised Privacy", desc: "Built safely on native browser APIs. Your Google OAuth keys and listen history absolutely never touch our servers.", color: "bg-blue-600" },
              { icon: Sparkles, title: "Intelligent UI", desc: "Experience a fully responsive YouTube Music-styled lyrics flow, complete with instant Related Track auto-generation natively mapped to your library.", color: "bg-white" }
            ].map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] bg-bg-surface/50 border border-border-main/10 hover:bg-bg-surface transition-all group backdrop-blur-sm"
              >
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl ${f.color} flex items-center justify-center mb-6 md:mb-8 shadow-2xl`}>
                  <f.icon className="w-6 h-6 md:w-8 md:h-8 text-black" fill="currentColor" />
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-4 group-hover:text-primary transition-colors text-text-primary">{f.title}</h3>
                <p className="text-text-secondary font-medium leading-[1.8] text-sm md:text-base">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="cloud" className="relative z-10 py-24 md:py-32 px-6 bg-primary overflow-hidden">
          <div className="hidden md:block absolute top-0 right-0 w-[40%] h-full bg-black skew-x-12 translate-x-[20%]" />
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-20 relative z-20">
            <div className="flex-1 text-black">
              <h2 className="text-4xl md:text-8xl font-black leading-[0.9] mb-8 md:mb-10">THE CLOUD<br />IS YOUR DISK.</h2>
              <p className="text-black/70 text-lg md:text-xl font-bold mb-10 md:mb-12">Connect your Google Drive folder and we securely stream the payload globally. We automatically fetch cover art, embed lyrics, and build out your metadata on the fly.</p>
              <div className="flex gap-4">
                <Cloud className="w-10 h-10 md:w-12 md:h-12" />
                <Play className="w-10 h-10 md:w-12 md:h-12" />
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-black p-10 rounded-[3rem] shadow-2xl rotate-3">
                <pre className="text-primary/50 text-xs font-mono leading-loose">
                  {`$ sumanmusic init --drive\n> Scanning your library...\n> Found 4,128 tracks\n> Syncing metadata...\n> Done. Ready to stream.`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 py-24 md:py-32 px-6 text-center max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-8xl font-black mb-10 md:mb-12">READY TO<br />LEVEL UP?</h2>
          <button
            onClick={() => {
              setAuthError(null);
              setShowAuthModal(true);
            }}
            aria-label="Start Streaming Now"
            className="w-full sm:w-auto px-10 md:px-12 py-5 md:py-6 rounded-full bg-white text-black font-black text-xl md:text-2xl hover:bg-primary transition-all active:scale-95 shadow-2xl shadow-primary/20"
          >
            START STREAMING NOW
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 pt-20 pb-10 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between mb-20 gap-16 items-center md:items-start text-center md:text-left">
            <div className="max-w-xs flex flex-col items-center md:items-start">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-6 w-full">
                <img
                  src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQcq9JW-7OCvpIQ9XvoF52Fe1G4EUkPlGGRLL0rxShLbT_1taBp0XuT2hmJDU6S2NWZh_WmwFwEpnosKk1mWXaLNqpCRGSleFgbtQLPdMo518w2Vedsnh2dZUMYyZv8YdJrghW4v3SGp8dMdCthac7Zkvi4hizggT0ueTpExsy6OEUAuIs4-2x2uGP17Po/s0/SumanMusic-logo.png"
                  alt="SumanMusic"
                  className="h-10 md:h-12 w-auto object-contain hover:scale-105 transition-transform cursor-pointer"
                />
              </div>
              <p className="text-text-secondary text-sm font-medium leading-relaxed">
                SumanMusic is a next-generation music player built for the modern internet. No compromises.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-8 md:flex md:justify-end md:gap-24 w-full">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-text-primary mb-6">Product</h4>
                <ul className="space-y-4 text-sm text-text-secondary font-medium">
                  <li>
                    <button onClick={() => setShowAuthModal(true)} className="hover:text-primary transition-colors cursor-pointer text-left">Get Started</button>
                  </li>
                  <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                  <li><a href="#cloud" className="hover:text-primary transition-colors">Cloud</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-text-primary mb-6">Legal & Company</h4>
                <ul className="space-y-4 text-sm text-text-secondary font-medium">
                  <li><Link to="/about-us" className="hover:text-primary transition-colors cursor-pointer">About Us</Link></li>
                  <li><Link to="/contact-us" className="hover:text-primary transition-colors cursor-pointer">Contact Us</Link></li>
                  <li><Link to="/privacy-policy" className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</Link></li>
                  <li><Link to="/terms-of-service" className="hover:text-primary transition-colors cursor-pointer">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-border-main/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-text-secondary/30 text-[10px] font-black tracking-widest uppercase">© 2024 SUMANMUSIC INC. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-6">
              <Github className="w-4 h-4 text-text-secondary hover:text-text-primary transition-colors cursor-pointer" />
              <Twitter className="w-4 h-4 text-text-secondary hover:text-text-primary transition-colors cursor-pointer" />
              <Instagram className="w-4 h-4 text-text-secondary hover:text-text-primary transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
