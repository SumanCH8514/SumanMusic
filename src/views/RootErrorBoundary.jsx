import React from 'react';
import { useRouteError, useNavigate, isRouteErrorResponse } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

const RootErrorBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  
  console.error("Route Error:", error);

  let errorMessage = "An unexpected error occurred.";
  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-8 border border-red-500/20">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>

      <h1 className="text-3xl font-black text-white mb-4 tracking-tight">Something went wrong</h1>
      
      <div className="max-w-md bg-white/5 border border-white/10 rounded-2xl p-4 mb-8">
        <p className="text-zinc-400 font-mono text-sm break-words">
          {errorMessage}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button 
          onClick={() => window.location.reload()}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        
        <button 
          onClick={() => navigate('/')}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-800 text-white font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default RootErrorBoundary;
