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
    setTimeout(() => setSaveSuccess(false), 2500);
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
    setTimeout(() => setTestStatus('idle'), 4000);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-6 py-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-stone-100 flex items-center gap-2">
          <span>Settings & AI Models</span>
          <Sparkles className="w-5 h-5 text-amber-400" />
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Configure your Model Provider (BYOK), Cloud Sync credentials, and Vault defaults.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* AI Provider Selector */}
        <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-200">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>AI Model Provider (BYOK)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'gemini', label: 'Google Gemini', active: true, tag: 'Primary' },
              { id: 'openai', label: 'OpenAI (GPT)', active: false, tag: 'Ready' },
              { id: 'claude', label: 'Claude', active: false, tag: 'Ready' },
              { id: 'ollama', label: 'Ollama (Local)', active: false, tag: 'Offline' }
            ].map(p => (
              <button
                type="button"
                key={p.id}
                onClick={() => setProvider(p.id as any)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === p.id
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <div className="text-xs font-semibold">{p.label}</div>
                <div className="text-[10px] text-amber-400/80 mt-1">{p.tag}</div>
              </button>
            ))}
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              Model Name
            </label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:outline-none focus:border-amber-500/50"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Ultra fast, recommended)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (Deep reasoning)</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-stone-500" />
                <span>Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <span>Get free Gemini Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... (leave blank to use simulated engine)"
                className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs font-mono focus:outline-none focus:border-amber-500/50"
              />
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testStatus === 'testing'}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium shrink-0"
              >
                {testStatus === 'testing' ? 'Testing...' : 'Test Key'}
              </button>
            </div>

            {testStatus === 'success' && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>API Key verified successfully!</span>
              </div>
            )}
            {testStatus === 'error' && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Invalid API Key or connection failed.</span>
              </div>
            )}
          </div>
        </div>

        {/* Cloud Sync & Firebase Status */}
        <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-200">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Google Cloud & Firebase Sync</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              Connected (Local-First Persistence)
            </span>
          </div>
          <p className="text-xs text-stone-400">
            Notes are saved instantly to your local device and synchronized with your private Google Cloud vault.
          </p>
        </div>

        {/* Reset & Test Data Controls */}
        <div className="p-4 rounded-xl bg-stone-900/40 border border-stone-800/80 space-y-3">
          <div className="text-sm font-semibold text-stone-200 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Sample Vault & Testing</span>
          </div>
          <p className="text-xs text-stone-400">
            Reload the complete Harry Potter knowledge base (Wiki Pages, Quick Notes, and Knowledge Graph associations).
          </p>
          <button
            type="button"
            onClick={onResetSeedData}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>Restore Harry Potter Vault Seed</span>
          </button>
        </div>

        {/* Save Changes Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Settings saved!</span>
            </span>
          )}
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
