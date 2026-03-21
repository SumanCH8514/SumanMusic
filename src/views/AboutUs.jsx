import React from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AboutUs = () => {
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
              <Info className="w-6 md:w-8 h-6 md:h-8" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight break-words min-w-0">About Us</h1>
          </div>
          <p className="text-xs md:text-sm text-text-secondary font-medium ml-12 md:ml-14">The SumanMusic Story</p>
        </div>
      </div>

      <div className="space-y-8 text-sm md:text-base text-text-secondary/80 leading-relaxed tracking-wide break-words">
        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">Our Mission</h2>
          <p>SumanMusic was built on a very simple premise: Your music belongs to you. In an era where audio catalogs are aggressively walled off by subscription payloads and heavy third-party tracking, we designed a minimalist escape hatch. Bring your own songs directly into a beautiful client interface with absolutely zero compromises.</p>
        </section>

        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">The Technology</h2>
          <p>Through bleeding-edge React architectures, SumanMusic serves as a pure proxy directly indexing your private, trusted Google Drive storage. This completely democratizes your streaming availability—providing ultra low-latency playback of your favorite MP3 and FLAC archives without relying on centralized, data-hungry streaming gatekeepers.</p>
        </section>

        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">Your Privacy, Guaranteed</h2>
          <p>We believe in total opacity. SumanMusic explicitly leverages client-side OAuth pipelines meaning your login tokens, account identity, and music library metadata fundamentally never touch our servers. It is entirely locally constrained inside your personal web browser, providing a uniquely ironclad acoustic journey.</p>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
