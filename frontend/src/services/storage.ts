import { LLMConfig, SubtitleStyle } from '../types';

const STORAGE_KEY_LLM = 'autoclip_llm_config';
const STORAGE_KEY_SUBTITLE = 'autoclip_subtitle_style';

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'mock',
  apiKey: '',
  baseUrl: '',
  modelName: 'mock-viral-engine-v1'
};

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  enabled: true,
  preset: 'hormozi',
  font_size: 28,
  primary_color: '#FFFFFF',
  highlight_color: '#FFE600',
  stroke_color: '#000000',
  position: 'bottom',
  uppercase: true,
  show_karaoke: true
};

export function loadStoredLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LLM);
    if (raw) {
      return { ...DEFAULT_LLM_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load LLM config from storage', e);
  }
  return DEFAULT_LLM_CONFIG;
}

export function saveStoredLLMConfig(config: LLMConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_LLM, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save LLM config to storage', e);
  }
}

export function loadStoredSubtitleStyle(): SubtitleStyle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBTITLE);
    if (raw) {
      return { ...DEFAULT_SUBTITLE_STYLE, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load subtitle style from storage', e);
  }
  return DEFAULT_SUBTITLE_STYLE;
}

export function saveStoredSubtitleStyle(style: SubtitleStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY_SUBTITLE, JSON.stringify(style));
  } catch (e) {
    console.error('Failed to save subtitle style to storage', e);
  }
}
