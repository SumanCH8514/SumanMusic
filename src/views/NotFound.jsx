import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Music2, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px]" />
      
      <div className="relative z-10 text-center px-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/5 border border-white/10 mb-8 animate-bounce">
          <Music2 className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 tracking-tighter mb-4">
          404
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
          Lost in the rhythm?
        </h2>
        
        <p className="text-zinc-400 max-w-md mx-auto mb-10 text-lg">
          The track you're looking for seems to have been skipped or moved to a different playlist.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => navigate('/app')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary text-black font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </button>
          
          <button 
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em]">
        SumanMusic &copy; 2026 • Premium Audio Experience
      </div>
    </div>
  );
};

export default NotFound;
