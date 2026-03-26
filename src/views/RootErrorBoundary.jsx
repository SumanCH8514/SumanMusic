import React from 'react';
import { useRouteError, useNavigate, isRouteErrorResponse } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

import logger from '../lib/logger';
import { Trash2 } from 'lucide-react';

const RootErrorBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  
  logger.error("Route Error:", error);

  let errorMessage = "An unexpected error occurred.";
  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  const handleReset = async () => {
    try {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Clear local storage (be careful with essential items if needed, but here we reset)
      localStorage.clear();
      
      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      
      window.location.href = '/';
    } catch (e) {
      window.location.reload();
    }
  };

  return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-8 border border-red-500/20">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>

      <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Application Error</h1>
      <p className="text-zinc-500 mb-8 max-w-sm">
        We encountered an error that we couldn't recover from. You can try refreshing or resetting the app.
      </p>
      
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/50 block mb-2">Error Details</span>
        <p className="text-zinc-400 font-mono text-xs break-all line-clamp-4">
          {errorMessage}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
        <button 
          onClick={() => window.location.reload()}
          className="w-full h-12 rounded-xl bg-white text-black font-black flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4" />
          Try Refreshing
        </button>
        
        <button 
          onClick={handleReset}
          className="w-full h-12 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-black flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all active:scale-[0.98]"
        >
          <Trash2 className="w-4 h-4" />
          Reset App
        </button>
      </div>

      <button 
        onClick={() => navigate('/')}
        className="mt-8 text-zinc-500 hover:text-white font-bold flex items-center gap-2 transition-colors py-2 px-4 rounded-lg"
      >
        <Home className="w-4 h-4" />
        Return to Home
      </button>
    </div>
  );
};

export default RootErrorBoundary;
