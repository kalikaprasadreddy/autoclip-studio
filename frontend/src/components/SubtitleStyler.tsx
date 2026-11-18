import React from 'react';
import { Type, Sparkles, Sliders } from 'lucide-react';
import { SubtitleStyle } from '../types';

interface SubtitleStylerProps {
  style: SubtitleStyle;
  onChange: (newStyle: SubtitleStyle) => void;
}

export const SubtitleStyler: React.FC<SubtitleStylerProps> = ({ style, onChange }) => {
  const presets: Array<{
    id: SubtitleStyle['preset'];
    name: string;
    description: string;
    previewClass: string;
    bgClass: string;
  }> = [
    {
      id: 'hormozi',
      name: 'Hormozi Bold',
      description: 'High retention yellow/white with thick black stroke',
      previewClass: 'font-caption-hormozi text-[#FFE600]',
      bgClass: 'border-yellow-500/30 bg-yellow-950/20',
    },
    {
      id: 'minimal',
      name: 'Minimal Clean',
      description: 'Elegant white with soft backdrop shadow',
      previewClass: 'font-sans font-bold text-white',
      bgClass: 'border-slate-600/30 bg-slate-900/30',
    },
    {
      id: 'neon',
      name: 'Neon Cyber',
      description: 'Glowing cyan & purple cyberpunk aesthetic',
      previewClass: 'font-caption-neon text-cyan-300',
      bgClass: 'border-cyan-500/30 bg-cyan-950/20',
    },
    {
      id: 'punchy',
      name: 'Punchy Red',
      description: 'High energy red and white boxing style',
      previewClass: 'font-black uppercase tracking-wider text-rose-400',
      bgClass: 'border-rose-500/30 bg-rose-950/20',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Enable Subtitles Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Type className="w-4 h-4 text-brand-400" />
          <span>Burned-in Subtitles & Captions</span>
        </label>
        <button
          type="button"
          onClick={() => onChange({ ...style, enabled: !style.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            style.enabled ? 'bg-brand-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              style.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {style.enabled && (
        <div className="space-y-4 pt-1 animate-fadeIn">
          {/* Preset Cards */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
              Caption Style Preset
            </span>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => {
                const isSelected = style.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      let primary = style.primary_color;
                      let highlight = style.highlight_color;
                      if (p.id === 'hormozi') {
                        primary = '#FFFFFF';
                        highlight = '#FFE600';
                      } else if (p.id === 'neon') {
                        primary = '#00FFFF';
                        highlight = '#FF00FF';
                      } else if (p.id === 'punchy') {
                        primary = '#FFFFFF';
                        highlight = '#FF3344';
                      }
                      onChange({
                        ...style,
                        preset: p.id,
                        primary_color: primary,
                        highlight_color: highlight,
                      });
                    }}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-brand-500 bg-brand-950/30 shadow-md shadow-brand-500/10 ring-1 ring-brand-500'
                        : `border-slate-800 ${p.bgClass} hover:border-slate-700`
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{p.name}</div>
                    <div className={`text-sm mt-1.5 truncate ${p.previewClass}`}>
                      VIRAL CAPTION
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls: Font Size, Uppercase & Karaoke */}
          <div className="grid grid-cols-2 gap-3 bg-dark-bg/60 p-3 rounded-xl border border-slate-800/80">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
                <span>Font Size</span>
                <span className="font-mono text-brand-400">{style.font_size}px</span>
              </div>
              <input
                type="range"
                min="18"
                max="42"
                value={style.font_size}
                onChange={(e) => onChange({ ...style, font_size: parseInt(e.target.value) })}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            <div>
              <span className="text-xs text-slate-300 font-semibold block mb-1">Position</span>
              <div className="grid grid-cols-2 gap-1">
                {(['bottom', 'middle'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => onChange({ ...style, position: pos })}
                    className={`py-1 text-xs rounded font-medium capitalize transition ${
                      style.position === pos
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-800">
              <label className="text-xs text-slate-300 font-medium cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={style.uppercase}
                  onChange={(e) => onChange({ ...style, uppercase: e.target.checked })}
                  className="rounded accent-brand-500"
                />
                <span>ALL CAPS (Shorts Style)</span>
              </label>

              <label className="text-xs text-slate-300 font-medium cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={style.show_karaoke}
                  onChange={(e) => onChange({ ...style, show_karaoke: e.target.checked })}
                  className="rounded accent-brand-500"
                />
                <span>Fast Word Chunks</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
