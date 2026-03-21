import React from 'react';
import { ArrowLeft, Mail, Github, Heart, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ContactUs = () => {
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
              <Mail className="w-6 md:w-8 h-6 md:h-8" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight break-words min-w-0">Contact Us</h1>
          </div>
          <p className="text-xs md:text-sm text-text-secondary font-medium ml-12 md:ml-14">Get In Touch</p>
        </div>
      </div>

      <div className="space-y-8 text-sm md:text-base text-text-secondary/80 leading-relaxed tracking-wide break-words">
        <section>
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">We'd love to hear from you</h2>
          <p>Whether you've run into a nasty bug, have a brilliant idea for a layout tweak, or simply want to say hello, we are always open to feedback. SumanMusic is continuously evolving, and community collaboration is the driving force behind our roadmap.</p>
        </section>

        <section className="bg-bg-surface/50 p-6 md:p-8 rounded-2xl border border-white/5">
          <h2 className="text-lg md:text-xl font-black text-white mb-6">Direct Channels</h2>

          <div className="space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Mail className="w-5 h-5 text-text-primary group-hover:text-primary transition-colors" />
              </div>
              <div>
                <h3 className="font-bold text-white">General Inquiries</h3>
                <a href="mailto:contact@sumanonline.com" className="text-primary hover:underline text-sm font-medium">contact@sumanonline.com</a>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Github className="w-5 h-5 text-text-primary group-hover:text-primary transition-colors" />
              </div>
              <div>
                <h3 className="font-bold text-white">Bug Reports & Open Source</h3>
                <a href="https://github.com/SumanCH8514/SumanMusic" className="text-primary hover:underline text-sm font-medium">github.com/SumanCH8514/SumanMusic</a>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                <Send className="w-5 h-5 text-text-primary group-hover:text-blue-500 transition-colors -ml-1 mt-0.5" />
              </div>
              <div>
                <h3 className="font-bold text-white">Telegram Support</h3>
                <a href="https://t.me/Contact_SumanOnline_bot" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm font-medium">@Contact_SumanOnline_bot</a>
              </div>
            </div>
          </div>
        </section>

        <div className="py-8 flex flex-col items-center justify-center text-center opacity-50">
          <Heart className="w-6 h-6 mb-3 text-text-primary" />
          <p className="text-xs font-bold tracking-widest uppercase">Built with passion.<br />Thank you for listening.</p>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
