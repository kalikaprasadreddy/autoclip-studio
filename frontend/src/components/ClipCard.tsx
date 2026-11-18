import React, { useState } from 'react';
import {
  Play,
  Scissors,
  Download,
  Copy,
  Check,
  Flame,
  Clock,
  Sparkles,
  Share2
} from 'lucide-react';
import { ClipItem } from '../types';

interface ClipCardProps {
  clip: ClipItem;
  isActive: boolean;
  onPreview: (clip: ClipItem) => void;
  onEdit: (clip: ClipItem) => void;
  onRender: (clip: ClipItem) => void;
}

export const ClipCard: React.FC<ClipCardProps> = ({
  clip,
  isActive,
  onPreview,
  onEdit,
  onRender,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCaption = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `${clip.title}\n\n${clip.social_caption}\n\n${clip.hashtags.join(' ')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'from-emerald-500 to-teal-400 text-emerald-950';
    if (score >= 80) return 'from-amber-500 to-yellow-400 text-amber-950';
    return 'from-purple-500 to-indigo-400 text-purple-950';
  };

  return (
    <div
      onClick={() => onPreview(clip)}
      className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden flex flex-col justify-between ${
        isActive
          ? 'bg-dark-card border-brand-500 shadow-xl shadow-brand-500/10 ring-1 ring-brand-500'
          : 'bg-dark-card/60 border-slate-800/80 hover:border-slate-700 hover:bg-dark-card'
      }`}
    >
      {/* Top Bar: Title & Virality Score */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="font-bold text-white text-base leading-snug line-clamp-1">
            {clip.title}
          </h4>
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 bg-gradient-to-r shadow-md ${getScoreColor(
              clip.virality_score
            )}`}
            title="AI Virality Score (1-100)"
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{clip.virality_score}</span>
          </div>
        </div>

        {/* Hook quote */}
        <div className="p-2.5 rounded-xl bg-dark-bg/60 border border-slate-800/80 mb-3 text-xs text-slate-300 italic flex items-start gap-2">
          <span className="text-brand-400 font-bold not-italic shrink-0">Hook:</span>
          <span className="line-clamp-2">"{clip.hook}"</span>
        </div>

        {/* Timestamp & Duration tags */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {clip.start_time.toFixed(1)}s - {clip.end_time.toFixed(1)}s
          </span>
          <span className="text-slate-600">•</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px] font-semibold">
            {clip.duration.toFixed(1)}s duration
          </span>
        </div>

        {/* AI Virality Reasoning */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
          <Sparkles className="w-3 h-3 text-yellow-400 inline mr-1" />
          {clip.virality_reason}
        </p>

        {/* Hashtags */}
        {clip.hashtags && clip.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {clip.hashtags.slice(0, 4).map((tag, i) => (
              <span
                key={i}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-950/40 text-brand-300 border border-brand-900/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(clip);
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            title="Preview Clip in Player"
          >
            <Play className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(clip);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Scissors className="w-3.5 h-3.5 text-brand-400" />
            <span>Edit & Style</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCaption}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            title="Copy Social Media Caption & Hashtags"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRender(clip);
          }}
          className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Render</span>
        </button>
      </div>
    </div>
  );
};
