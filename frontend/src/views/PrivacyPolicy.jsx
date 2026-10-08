import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-8 md:py-12 px-4 md:px-6 flex flex-col gap-6 md:gap-8 pb-32 md:pb-48">
      <div className="flex items-center justify-between w-full">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors p-2 -ml-2 rounded-lg shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center shrink-0">
          <img src={logoImg} alt="SumanMusic" className="h-10 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div className="w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
              <ShieldCheck className="w-6 md:w-8 h-6 md:h-8" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight break-words min-w-0">Privacy Policy</h1>
          </div>
          <p className="text-xs md:text-sm text-text-secondary font-medium ml-12 md:ml-14">Effective Date: March 2026</p>
        </div>
      </div>

      <div className="space-y-8 text-sm md:text-base text-text-secondary/80 leading-relaxed tracking-wide break-words">
        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">1. Introduction</h2>
          <p>Welcome to SumanMusic. We are committed to protecting your privacy and ensuring your data is handled securely. This Privacy Policy explains how we use your data, particularly regarding authentication and the Google Drive integration.</p>
        </section>

        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">2. Account Creation & Sign-In</h2>
          <p>SumanMusic uses "Continue with Google" as our exclusive identity provider for signing up and logging in. When you authenticate using your Google Account, we receive basic profile information required to initialize your web player profile:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2 text-white/80">
            <li>Your Email Address (used as a secure account identifier)</li>
            <li>Your Display Name</li>
            <li>Your Public Profile Picture</li>
          </ul>
          <p className="mt-3">We securely tie this information to your private playlists and settings. We never sell, distribute, or track this personal profile data outside of keeping you logged into SumanMusic.</p>
        </section>

        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">3. Google API Services & Scopes</h2>
          <p>SumanMusic uses specific Google API services to function as a personal music streaming application. All OAuth tokens are stored strictly on your local device (Local Storage) and never transmitted to our servers.</p>
          
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <h3 className="text-primary font-bold mb-2">Google Drive (Read-Only)</h3>
              <p className="text-sm">We use the <code className="break-all bg-white/10 px-1 py-0.5 rounded text-xs px-1.5 font-mono">.../auth/drive.readonly</code> scope to search and stream audio files hosted in your personal Google Drive account.</p>
            </div>
            
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <h3 className="text-primary font-bold mb-2">YouTube Data API</h3>
              <p className="text-sm">We use the <code className="break-all bg-white/10 px-1 py-0.5 rounded text-xs px-1.5 font-mono">.../auth/youtube.readonly</code> scope to provide music search and discovery features. This allows you to use your own YouTube quota for searches.</p>
            </div>
          </div>
          
          <p className="mt-4">By using these integrations, you also agree to be bound by the <a href="https://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Privacy Policy</a>.</p>
        </section>

        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">4. Data Sharing & Disclosure</h2>
          <p>We do <strong>not</strong> share, transfer, or disclose Google user data to any third parties. All Google user data is used exclusively within the SumanMusic application to provide its core features. Specifically:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2 text-white/80">
            <li><strong>No Third-Party Sharing:</strong> We do not share your Google profile information, Google Drive file metadata, or YouTube search results with any third-party services, data brokers, or advertisers.</li>
            <li><strong>No Data Transfer:</strong> Your personal Google user data is never transferred out of the application environment. OAuth tokens are stored locally on your device and are never sent to our backend servers.</li>
            <li><strong>Internal Use Only:</strong> We only use your data to maintain your user session, display your personal playlists, and facilitate streaming from your own Google Drive.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">5. Data Storage & Security</h2>
          <p>We do <strong>not</strong> download, store, sell, or distribute your Google Drive files, metadata, or viewing habits to any external servers.</p>
          <ul className="list-disc pl-5 mt-2 space-y-2 text-white/80">
            <li>Your Google OAuth Access Tokens are stored securely and strictly on your local device's browser storage (Local Storage).</li>
            <li>Tokens are never transmitted to our backend databases.</li>
            <li>Streaming occurs directly peer-to-peer between Google's API servers and your web browser.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">6. Revoking Access</h2>
          <p>You may revoke SumanMusic's access to your Google Drive at any time by visiting your Google Account Security settings and removing SumanMusic from your list of connected third-party applications. Logging out of the application will also immediately clear your local OAuth tokens.</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
