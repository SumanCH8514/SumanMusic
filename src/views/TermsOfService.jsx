import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
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
          <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQcq9JW-7OCvpIQ9XvoF52Fe1G4EUkPlGGRLL0rxShLbT_1taBp0XuT2hmJDU6S2NWZh_WmwFwEpnosKk1mWXaLNqpCRGSleFgbtQLPdMo518w2Vedsnh2dZUMYyZv8YdJrghW4v3SGp8dMdCthac7Zkvi4hizggT0ueTpExsy6OEUAuIs4-2x2uGP17Po/s0/SumanMusic-logo.png" alt="SumanMusic" className="h-10 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div className="w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
              <FileText className="w-6 md:w-8 h-6 md:h-8" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight break-words min-w-0">Terms of Service</h1>
          </div>
          <p className="text-xs md:text-sm text-text-secondary font-medium ml-12 md:ml-14">Effective Date: March 2026</p>
        </div>
      </div>

      <div className="space-y-8 text-sm md:text-base text-text-secondary/80 leading-relaxed tracking-wide break-words">
        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">1. Acceptance of Terms</h2>
          <p>By accessing or using the SumanMusic application, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.</p>
        </section>

        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">2. Account Registration via Google</h2>
          <p>In order to use personalized features of the service, you must sign up and log in using "Continue with Google". By authenticating your Google account, you grant us permission to uniquely identify you across devices and sync your playback settings. You are solely responsible for maintaining the confidentiality and security of your own Google account credentials.</p>
        </section>

        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">3. Description of Service</h2>
          <p>SumanMusic provides a personalized web-based music streaming interface. Users implicitly authorize SumanMusic to orchestrate searches and stream retrieval of authorized media specifically residing on the End User's own Google Drive space.</p>
        </section>

        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">4. User Conduct</h2>
          <p>You agree to use the Service only for lawful purposes. SumanMusic acts exclusively as a local media player for your own legitimately owned and hosted files.</p>
        </section>

        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">5. Intellectual Property</h2>
          <p>The Service and its original content, features, and functionality are and will remain the exclusive property of SumanMusic. We do not claim ownership of the media files you stream from your personal Google Drive.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">6. Disclaimer of Liability</h2>
          <p>Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. SumanMusic is not responsible for data loss, unavailability of third-party platforms (like Google Drive), or account bans associated with API abuse outside our control.</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
