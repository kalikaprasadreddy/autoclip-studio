import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  RefreshCw,
  Server
} from 'lucide-react';
import { LLMConfig, LLMProvider, TestConnectionResult } from '../types';
import { testConnection, discoverLocalModels } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  onSave: (config: LLMConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  if (!isOpen) return null;

  const [formConfig, setFormConfig] = useState<LLMConfig>({ ...config });
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [discovering, setDiscovering] = useState(false);

  const handleProviderChange = (provider: LLMProvider) => {
    let defaultModel = formConfig.modelName;
    let defaultBaseUrl = formConfig.baseUrl;

    if (provider === 'gemini') {
      defaultModel = 'gemini-3.1-flash-lite';
      defaultBaseUrl = '';
    } else if (provider === 'groq') {
      defaultModel = 'llama-3.3-70b-versatile';
      defaultBaseUrl = '';
    } else if (provider === 'openai') {
      defaultModel = 'gpt-4o-mini';
      defaultBaseUrl = '';
    } else if (provider === 'anthropic') {
      defaultModel = 'claude-3-5-haiku-20241022';
      defaultBaseUrl = '';
    } else if (provider === 'ollama') {
      defaultModel = 'llama3.2';
      defaultBaseUrl = formConfig.baseUrl || 'http://localhost:11434';
    } else if (provider === 'lmstudio') {
      defaultModel = 'local-model';
      defaultBaseUrl = formConfig.baseUrl || 'http://localhost:1234/v1';
    } else if (provider === 'openrouter') {
      defaultModel = 'meta-llama/llama-3.3-70b-instruct';
      defaultBaseUrl = 'https://openrouter.ai/api/v1';
    } else if (provider === 'mock') {
      defaultModel = 'mock-viral-engine-v1';
    }

    setFormConfig({
      ...formConfig,
      provider,
      modelName: defaultModel,
      baseUrl: defaultBaseUrl,
    });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(formConfig);
      setTestResult(res);
      if (res.success && res.models.length > 0) {
        if (!res.models.includes(formConfig.modelName)) {
          setFormConfig(prev => ({ ...prev, modelName: res.models[0] }));
        }
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Connection failed',
        models: [],
      });
    } finally {
      setTesting(false);
    }
  };

  const handleAutoDiscover = async () => {
    setDiscovering(true);
    try {
      const local = await discoverLocalModels();
      if (local.ollama.available) {
        handleProviderChange('ollama');
        if (local.ollama.models.length > 0) {
          setFormConfig(prev => ({
            ...prev,
            provider: 'ollama',
            baseUrl: 'http://localhost:11434',
            modelName: local.ollama.models[0]
          }));
        }
        setTestResult({
          success: true,
          message: `Detected running Ollama with ${local.ollama.models.length} model(s)!`,
          models: local.ollama.models,
        });
      } else if (local.lmstudio.available) {
        handleProviderChange('lmstudio');
        setTestResult({
          success: true,
          message: `Detected running LM Studio server!`,
          models: local.lmstudio.models,
        });
      } else {
        setTestResult({
          success: false,
          message: 'No local Ollama (11434) or LM Studio (1234) detected. Ensure your local server is running.',
          models: [],
        });
      }
    } finally {
      setDiscovering(false);
    }
  };

  const handleSave = () => {
    onSave(formConfig);
    onClose();
  };

  const isLocal = formConfig.provider === 'ollama' || formConfig.provider === 'lmstudio';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-card border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-dark-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Engine & Model Settings</h2>
              <p className="text-xs text-slate-400">Bring Your Own Key (BYOK) or connect 100% private local LLMs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Provider Selection Cards */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Intelligence Provider
              </label>
              <button
                type="button"
                onClick={handleAutoDiscover}
                disabled={discovering}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${discovering ? 'animate-spin' : ''}`} />
                <span>Auto-detect Local Models</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'gemini', label: 'Google Gemini', tag: 'Fast Flash', color: 'border-indigo-500/40 hover:border-indigo-400' },
                { id: 'groq', label: 'Groq Cloud', tag: 'Fastest Llama', color: 'border-orange-500/40 hover:border-orange-400' },
                { id: 'openai', label: 'OpenAI', tag: 'GPT-4o', color: 'border-blue-500/40 hover:border-blue-400' },
                { id: 'anthropic', label: 'Claude', tag: '3.5 Sonnet', color: 'border-purple-500/40 hover:border-purple-400' },
                { id: 'ollama', label: 'Ollama', tag: '100% Local', color: 'border-emerald-500/40 hover:border-emerald-400' },
                { id: 'lmstudio', label: 'LM Studio', tag: 'Local/vLLM', color: 'border-teal-500/40 hover:border-teal-400' },
                { id: 'openrouter', label: 'OpenRouter', tag: 'DeepSeek/Any', color: 'border-pink-500/40 hover:border-pink-400' },
                { id: 'mock', label: 'Mock Demo', tag: 'No Key / Free', color: 'border-slate-600 hover:border-slate-500' },
              ].map((p) => {
                const isSelected = formConfig.provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id as LLMProvider)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-brand-900/30 border-brand-500 shadow-md shadow-brand-500/10'
                        : `bg-dark-bg/60 border-slate-800 ${p.color}`
                    }`}
                  >
                    <div className="font-semibold text-sm text-white truncate">{p.label}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {p.tag}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration Inputs based on Selected Provider */}
          <div className="space-y-4 bg-dark-bg/50 p-4 rounded-xl border border-slate-800">
            {/* API Key (Cloud Providers) */}
            {!isLocal && formConfig.provider !== 'mock' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {formConfig.provider.toUpperCase()} API Key (BYOK)
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={formConfig.apiKey}
                    onChange={(e) => setFormConfig({ ...formConfig, apiKey: e.target.value })}
                    placeholder={
                      formConfig.provider === 'gemini'
                        ? 'AIzaSy... or AQ.Ab8...'
                        : formConfig.provider === 'groq'
                        ? 'gsk_...'
                        : formConfig.provider === 'openai'
                        ? 'sk-...'
                        : formConfig.provider === 'anthropic'
                        ? 'sk-ant-...'
                        : 'Key here...'
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-dark-card border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Keys are stored exclusively in your browser localStorage and sent directly to the model endpoint.
                </p>
              </div>
            )}

            {/* Base URL (Local Models or Custom) */}
            {(isLocal || formConfig.provider === 'openrouter' || formConfig.provider === 'custom') && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Server Endpoint / Base URL</span>
                </label>
                <input
                  type="text"
                  value={formConfig.baseUrl}
                  onChange={(e) => setFormConfig({ ...formConfig, baseUrl: e.target.value })}
                  placeholder={
                    formConfig.provider === 'ollama'
                      ? 'http://localhost:11434'
                      : 'http://localhost:1234/v1'
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg bg-dark-card border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {formConfig.provider === 'ollama'
                    ? 'Default: http://localhost:11434'
                    : 'Default: http://localhost:1234/v1'}
                </p>
              </div>
            )}

            {/* Model Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Model Name / Checkpoint
              </label>
              {testResult && testResult.models.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={formConfig.modelName}
                    onChange={(e) => setFormConfig({ ...formConfig, modelName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-dark-card border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500 font-mono"
                  >
                    {testResult.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-emerald-400">
                    Discovered {testResult.models.length} model(s) from server!
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={formConfig.modelName}
                    onChange={(e) => setFormConfig({ ...formConfig, modelName: e.target.value })}
                    placeholder={
                      formConfig.provider === 'gemini'
                        ? 'gemini-3.1-flash-lite'
                        : formConfig.provider === 'groq'
                        ? 'llama-3.3-70b-versatile'
                        : 'gpt-4o-mini'
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-dark-card border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 font-mono"
                  />
                  {formConfig.provider === 'gemini' && (
                    <div className="flex gap-2 text-[11px] text-slate-400 mt-1">
                      <span>Quick picks:</span>
                      <button
                        type="button"
                        onClick={() => setFormConfig({ ...formConfig, modelName: 'gemini-3.1-flash-lite' })}
                        className="text-brand-400 hover:underline"
                      >
                        gemini-3.1-flash-lite
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setFormConfig({ ...formConfig, modelName: 'gemini-3-flash-preview' })}
                        className="text-brand-400 hover:underline"
                      >
                        gemini-3-flash-preview
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Test Connection Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition active:scale-[0.99] disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 text-yellow-400 ${testing ? 'animate-bounce' : ''}`} />
                <span>{testing ? 'Testing connection & latency...' : 'Test Connection & Fetch Models'}</span>
              </button>

              {/* Test Connection Status Banner */}
              {testResult && (
                <div
                  className={`mt-2.5 p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">{testResult.message}</div>
                    {testResult.latency_ms !== undefined && (
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Latency: <span className="font-mono font-bold">{testResult.latency_ms}ms</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-dark-bg/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-600/30 transition active:scale-95"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
