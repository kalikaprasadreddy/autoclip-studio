import React from 'react';
import { Scissors, Settings, Sparkles, Video, Cpu, KeyRound } from 'lucide-react';
import { LLMConfig } from '../types';

interface NavbarProps {
  llmConfig: LLMConfig;
  onOpenSettings: () => void;
  onLoadDemo: () => void;
  isLoadingDemo: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  llmConfig,
  onOpenSettings,
  onLoadDemo,
  isLoadingDemo,
}) => {
  const getProviderBadge = () => {
    switch (llmConfig.provider) {
      case 'ollama':
        return { label: `Ollama (${llmConfig.modelName || 'llama3.2'})`, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'lmstudio':
        return { label: `LM Studio (Local)`, color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
      case 'groq':
        return { label: `Groq (${llmConfig.modelName || 'Llama-3.3'})`, color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
      case 'openai':
        return { label: `OpenAI (${llmConfig.modelName || 'GPT-4o'})`, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'gemini':
        return { label: `Gemini (${llmConfig.modelName || 'Flash'})`, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'anthropic':
        return { label: `Claude (${llmConfig.modelName || 'Haiku'})`, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      default:
        return { label: 'Mock Engine (Instant Demo)', color: 'bg-slate-700/60 text-slate-300 border-slate-600' };
    }
  };

  const badge = getProviderBadge();

  return (
    <header className="border-b border-slate-800 bg-dark-card/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-black text-xl">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                AutoClip Studio
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                AI Clipper
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Turn long videos into viral 9:16 Shorts & Reels with AI captions
            </p>
          </div>
        </div>

        {/* Current Provider Pill & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Active AI Provider Status Badge */}
          <button
            onClick={onOpenSettings}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition hover:opacity-90 ${badge.color}`}
            title="Click to configure AI providers or local models"
          >
            {llmConfig.provider === 'ollama' || llmConfig.provider === 'lmstudio' ? (
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <KeyRound className="w-3.5 h-3.5" />
            )}
            <span>{badge.label}</span>
          </button>

          {/* Quick Demo Video Button */}
          <button
            onClick={onLoadDemo}
            disabled={isLoadingDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 disabled:opacity-50"
            title="Load ready-made demo video with sound & graphics"
          >
            <Video className="w-3.5 h-3.5 text-brand-400" />
            <span>{isLoadingDemo ? 'Generating...' : 'Load Demo Video'}</span>
          </button>

          {/* Settings (BYOK & Local LLMs) */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30 transition active:scale-95"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">BYOK & Models</span>
          </button>
        </div>
      </div>
    </header>
  );
};
