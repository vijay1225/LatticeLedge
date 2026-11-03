import React, { useState } from 'react';
import { 
  Key, 
  Cpu, 
  Cloud, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Save, 
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { AIProviderConfig } from '../types';

interface SettingsModalProps {
  config: AIProviderConfig;
  onSaveConfig: (config: AIProviderConfig) => void;
  onResetSeedData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  onSaveConfig,
  onResetSeedData
}) => {
  const [provider, setProvider] = useState(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [modelName, setModelName] = useState(config.modelName);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      provider,
      apiKey: apiKey.trim(),
      modelName
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      return;
    }
    setTestStatus('testing');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
      if (response.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch {
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus('idle'), 3500);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-6 lg:px-12 py-8 max-w-2xl mx-auto w-full text-xs">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <span>Settings & Models</span>
          <Sparkles className="w-4 h-4 text-zinc-400" />
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Configure model providers (BYOK), Google Cloud Sync, and sample data.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Model Provider */}
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 font-medium text-zinc-200">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Model Provider</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'gemini', label: 'Google Gemini', tag: 'Primary' },
              { id: 'openai', label: 'OpenAI (GPT)', tag: 'Adapter' },
              { id: 'claude', label: 'Claude', tag: 'Adapter' },
              { id: 'ollama', label: 'Ollama (Local)', tag: 'Offline' }
            ].map(p => (
              <button
                type="button"
                key={p.id}
                onClick={() => setProvider(p.id as any)}
                className={`p-2.5 rounded-lg border text-left transition-colors ${
                  provider === p.id
                    ? 'bg-zinc-800 text-zinc-100 font-semibold border-zinc-600'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="text-xs font-medium">{p.label}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{p.tag}</div>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Model
            </label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-zinc-700"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Ultra fast, recommended)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (Deep reasoning)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                <Key className="w-3 h-3 text-zinc-500" />
                <span>Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 underline"
              >
                <span>Get API Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... (leave blank to use simulated engine)"
                className="flex-1 px-2.5 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-mono focus:outline-none focus:border-zinc-700"
              />
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testStatus === 'testing'}
                className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium shrink-0"
              >
                {testStatus === 'testing' ? 'Testing...' : 'Test Key'}
              </button>
            </div>

            {testStatus === 'success' && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-400">
                <Check className="w-3 h-3" />
                <span>API Key verified!</span>
              </div>
            )}
            {testStatus === 'error' && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-rose-400">
                <AlertCircle className="w-3 h-3" />
                <span>Failed to verify API key.</span>
              </div>
            )}
          </div>
        </div>

        {/* Sync */}
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-zinc-200">
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Cloud Sync</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              Active (Local-First Persistence)
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Notes are saved instantly on device and synchronized to your private cloud vault.
          </p>
        </div>

        {/* Reset */}
        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="font-medium text-zinc-200 flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sample Vault</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Reload the Harry Potter test vault (pages, quick notes, and graph links).
          </p>
          <button
            type="button"
            onClick={onResetSeedData}
            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            Reset to Harry Potter Vault
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Saved!</span>
            </span>
          )}
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-3 h-3" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
