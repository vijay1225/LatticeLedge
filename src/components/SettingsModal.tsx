import React, { useState, useRef } from 'react';
import { 
  Key, 
  Cpu, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Save, 
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Download,
  Upload,
  FolderSync,
  Smartphone,
  HardDrive
} from 'lucide-react';
import { AIProviderConfig, Note } from '../types';
import { downloadVaultBackup, importVaultFromJson } from '../utils/vaultExportImport';

interface SettingsModalProps {
  config: AIProviderConfig;
  onSaveConfig: (config: AIProviderConfig) => void;
  onResetSeedData: () => void;
  notes?: Note[];
  onNotesUpdated?: (notes: Note[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  onSaveConfig,
  onResetSeedData,
  notes = [],
  onNotesUpdated
}) => {
  const [provider, setProvider] = useState(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [modelName, setModelName] = useState(config.modelName);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportBackup = () => {
    downloadVaultBackup(notes);
    setImportStatus(`Exported ${notes.length} notes. Save this file to your Google Drive folder.`);
    setTimeout(() => setImportStatus(null), 5000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const result = importVaultFromJson(content);
      if (result.success && result.notes && onNotesUpdated) {
        onNotesUpdated(result.notes);
        setImportStatus(`Successfully imported ${result.notes.length} notes from Google Drive / file!`);
      } else {
        setImportStatus(`Import failed: ${result.error || 'Invalid file format'}`);
      }
      setTimeout(() => setImportStatus(null), 6000);
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-6 lg:px-12 py-8 max-w-2xl mx-auto w-full text-xs">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <span>Settings & Storage</span>
          <Sparkles className="w-4 h-4 text-zinc-400" />
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Standalone local-first note database, Google Drive folder sharing, and AI configuration.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* 1. Standalone Architecture & Google Drive Folder Sync */}
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-zinc-200">
              <FolderSync className="w-4 h-4 text-indigo-400" />
              <span>Google Drive Folder & Shared Database</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              100% Standalone & Offline
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            LatticeLedger stores all notes locally on this device. You can link and share the same note vault across your <strong>Phone APK</strong> and upcoming <strong>Desktop app</strong> by keeping your notes in a Google Drive folder.
          </p>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                <span>Current Vault Database</span>
              </span>
              <span className="font-mono text-indigo-400 font-semibold">{notes.length} notes</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700/60"
                title="Export vault file to save to Google Drive"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export Vault to Google Drive</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700/60"
                title="Select vault file from Google Drive or local storage"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Import from Google Drive</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.md"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {importStatus && (
              <div className="text-[11px] font-medium p-2 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300">
                {importStatus}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-zinc-500 leading-normal">
            <Smartphone className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <span>
              <strong>Cross-Platform Plan:</strong> The desktop app and mobile APK share identical markdown note structures. Linking to your Google Drive folder allows instantaneous bi-directional sync without depending on any local server!
            </span>
          </div>
        </div>

        {/* 2. Model Provider & Gemini API Key (BYOK) */}
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 font-medium text-zinc-200">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Model & Gemini API Key (Direct Device Connection)</span>
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
                <span>Google Gemini API Key</span>
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
                placeholder="AIzaSy... (leave blank for offline smart heuristic engine)"
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
                <span>Gemini API Key verified directly with Google!</span>
              </div>
            )}
            {testStatus === 'error' && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-rose-400">
                <AlertCircle className="w-3 h-3" />
                <span>Failed to verify API key. Please check your key.</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Sample Vault Reset */}
        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="font-medium text-zinc-200 flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sample Knowledge Vault</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Reload the Harry Potter test vault (pages, quick notes, and bi-directional graph links).
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
              <span>Settings Saved!</span>
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
