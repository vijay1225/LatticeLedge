import React, { useState, useRef, useEffect } from 'react';
import { 
  Key, 
  Cpu, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Save, 
  ExternalLink, 
  Sparkles, 
  Download, 
  Upload, 
  Database as DatabaseIcon, 
  HardDrive,
  Zap,
  FolderSync,
  Eye,
  EyeOff,
  Clipboard,
  Loader2,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { AIProviderConfig, Note, GeminiModelInfo } from '../types';
import { downloadVaultBackup, importVaultFromJson } from '../utils/vaultExportImport';
import { downloadSqliteDatabaseFile, importSqliteDatabaseFile } from '../services/sqliteService';
import { sanitizeApiKey, fetchAvailableGeminiModels, DEFAULT_GEMINI_MODELS } from '../services/aiService';

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
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testDetails, setTestDetails] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Dynamic models state
  const [availableModels, setAvailableModels] = useState<GeminiModelInfo[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('LL_AVAILABLE_MODELS');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
    return DEFAULT_GEMINI_MODELS;
  });
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);

  const sqliteInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Check if current model exists in availableModels; if not and it's deprecated gemini-2.5-flash, upgrade
  useEffect(() => {
    if (modelName === 'gemini-2.5-flash') {
      const recommended = availableModels.find(m => m.isRecommended) || availableModels[0];
      if (recommended) {
        setModelName(recommended.id);
        onSaveConfig({
          provider,
          apiKey: sanitizeApiKey(apiKey),
          modelName: recommended.id
        });
      }
    }
  }, [availableModels]);

  // Auto-save key directly whenever user modifies the key input
  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    const cleanKey = sanitizeApiKey(val);
    onSaveConfig({
      provider,
      apiKey: cleanKey,
      modelName
    });
    if (typeof window !== 'undefined') {
      if (cleanKey) {
        localStorage.setItem('LL_GEMINI_API_KEY', cleanKey);
      } else {
        localStorage.removeItem('LL_GEMINI_API_KEY');
      }
    }
  };

  const handleProviderChange = (p: any) => {
    setProvider(p);
    onSaveConfig({
      provider: p,
      apiKey: sanitizeApiKey(apiKey),
      modelName
    });
  };

  const handleModelChange = (m: string) => {
    setModelName(m);
    onSaveConfig({
      provider,
      apiKey: sanitizeApiKey(apiKey),
      modelName: m
    });
  };

  const handleManualSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = sanitizeApiKey(apiKey);
    onSaveConfig({
      provider,
      apiKey: cleanKey,
      modelName
    });
    if (typeof window !== 'undefined') {
      if (cleanKey) {
        localStorage.setItem('LL_GEMINI_API_KEY', cleanKey);
      } else {
        localStorage.removeItem('LL_GEMINI_API_KEY');
      }
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          handleApiKeyChange(text);
          setTestDetails('Key pasted and saved directly from clipboard!');
          setTimeout(() => setTestDetails(null), 3000);
        }
      }
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
  };

  // Fetch available models from Google for this key
  const handleFetchModels = async (keyOverride?: string) => {
    const keyToUse = sanitizeApiKey(keyOverride || apiKey);
    if (!keyToUse) {
      setTestStatus('error');
      setTestDetails('Please paste or enter your Gemini API key first to fetch models.');
      return;
    }

    setIsFetchingModels(true);
    setTestDetails('Fetching available models from Google for this key...');

    try {
      const models = await fetchAvailableGeminiModels(keyToUse);
      if (models && models.length > 0) {
        setAvailableModels(models);
        
        // If current model is not in available models or is deprecated, select the top recommended model
        const currentInList = models.some(m => m.id === modelName || m.name === modelName);
        if (!currentInList || modelName === 'gemini-2.5-flash') {
          const recommended = models.find(m => m.isRecommended) || models[0];
          setModelName(recommended.id);
          onSaveConfig({
            provider,
            apiKey: keyToUse,
            modelName: recommended.id
          });
        }
        setTestStatus('success');
        setTestDetails(`Successfully fetched ${models.length} active models from Google for your account!`);
      } else {
        setTestDetails('No models returned. Using default models list.');
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestDetails(`Failed to fetch models: ${err?.message || 'Check network connection or API key.'}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleTestKey = async () => {
    const cleanKey = sanitizeApiKey(apiKey);
    if (!cleanKey) {
      setTestStatus('error');
      setTestDetails('Please paste or type your Gemini API key first.');
      return;
    }

    setTestStatus('testing');
    setTestDetails('Connecting directly to Google Gemini API servers...');

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`);
      if (response.ok) {
        // Auto-save the verified key immediately
        onSaveConfig({
          provider,
          apiKey: cleanKey,
          modelName
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('LL_GEMINI_API_KEY', cleanKey);
        }
        
        // Auto-fetch models right away!
        await handleFetchModels(cleanKey);
      } else {
        const errorJson = await response.json().catch(() => null);
        const serverMsg = errorJson?.error?.message || response.statusText || 'Verification failed';
        setTestStatus('error');
        setTestDetails(`Google Error (HTTP ${response.status}): ${serverMsg}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestDetails(`Network Error: ${err?.message || 'Failed to reach Google Gemini API servers. Check device internet connection.'}`);
    }
  };

  // SQLite Database Export (.db)
  const handleExportSqlite = async () => {
    try {
      await downloadSqliteDatabaseFile();
      setImportStatus('Exported lattice_vault.db! Save this single file to your Google Drive folder.');
      setTimeout(() => setImportStatus(null), 5000);
    } catch (err: any) {
      setImportStatus(`Export failed: ${err.message}`);
    }
  };

  // SQLite Database Import (.db or .sqlite)
  const handleSqliteFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('Loading SQLite database from Google Drive / file...');
      const buffer = await file.arrayBuffer();
      const importedNotes = await importSqliteDatabaseFile(buffer);
      if (onNotesUpdated) {
        onNotesUpdated(importedNotes);
        setImportStatus(`Loaded SQLite database successfully (${importedNotes.length} notes).`);
      }
    } catch (err: any) {
      setImportStatus(`SQLite import error: ${err.message}`);
    }
    setTimeout(() => setImportStatus(null), 6000);
    e.target.value = '';
  };

  // JSON / Backup Handlers
  const handleExportJson = () => {
    downloadVaultBackup(notes);
    setImportStatus(`Exported JSON backup (${notes.length} notes).`);
    setTimeout(() => setImportStatus(null), 5000);
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const result = importVaultFromJson(content);
      if (result.success && result.notes && onNotesUpdated) {
        onNotesUpdated(result.notes);
        setImportStatus(`Imported ${result.notes.length} notes successfully.`);
      } else {
        setImportStatus(`Import failed: ${result.error || 'Invalid format'}`);
      }
      setTimeout(() => setImportStatus(null), 6000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const recommendedModels = availableModels.filter(m => m.isRecommended);
  const otherModels = availableModels.filter(m => !m.isRecommended);

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 sm:px-6 lg:px-12 py-8 max-w-2xl mx-auto w-full text-xs">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <span>Settings & Configuration</span>
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Manage your Gemini AI Key, fetch active models, configure SQLite engine, and sync Google Drive vault.
        </p>
      </div>

      <form onSubmit={handleManualSave} className="space-y-5 pb-16">
        {/* 1. TOP SECTION: AI Model & Google Gemini API Key (Direct Connection) */}
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-indigo-500/30 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-zinc-100 text-sm">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Google Gemini API Key (Direct Connection)</span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline font-medium"
            >
              <span>Get Free Key</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            LatticeLedger connects <strong>directly from your phone/desktop</strong> to Google Gemini using your API key. No intermediate servers or subscriptions required.
          </p>

          {/* API Key Input Box with Eye Toggle, Paste, and Auto-save */}
          <div className="space-y-2">
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Paste AIzaSy... or AQ... key here"
                className="w-full pl-3 pr-20 py-2.5 rounded-lg bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 shadow-inner"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="p-1 rounded text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800 transition-colors"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Test, Fetch Models & Save Key Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testStatus === 'testing' || isFetchingModels}
                className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
              >
                {testStatus === 'testing' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying & Fetching Models...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Test & Verify Key</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleFetchModels()}
                disabled={isFetchingModels || testStatus === 'testing'}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-indigo-300 text-xs font-medium flex items-center gap-1.5 border border-indigo-500/30 transition-colors shadow-sm disabled:opacity-50"
                title="Fetch all active models available for your Google Gemini API key"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingModels ? 'animate-spin' : ''}`} />
                <span>{isFetchingModels ? 'Fetching Models...' : 'Fetch Available Models'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleManualSave()}
                className="px-3 py-1.5 rounded-md bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-medium flex items-center gap-1.5 border border-zinc-700 transition-colors"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Save Key</span>
                  </>
                )}
              </button>
            </div>

            {/* Verification & Fetch Status Feedback Banner */}
            {testDetails && (
              <div className={`p-2.5 rounded-lg text-[11px] leading-relaxed border flex items-start gap-2 animate-in fade-in ${
                testStatus === 'success' 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                  : testStatus === 'error'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-300'
              }`}>
                {testStatus === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                {testStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                {(testStatus === 'testing' || isFetchingModels) && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0 mt-0.5" />}
                <div className="flex-1 font-medium">{testDetails}</div>
              </div>
            )}
          </div>

          {/* Dynamic Model Selection */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Selected Gemini Model ({availableModels.length} available)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomModel(!isCustomModel)}
                  className="text-[10px] text-zinc-400 hover:text-indigo-300 flex items-center gap-1 underline"
                >
                  <Sliders className="w-2.5 h-2.5" />
                  <span>{isCustomModel ? 'Pick from List' : 'Custom Model ID'}</span>
                </button>
              </div>
            </div>

            {isCustomModel ? (
              <div className="space-y-1">
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => handleModelChange(e.target.value)}
                  placeholder="e.g. gemini-3.8-flash or fine-tuned-model"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-zinc-500 block">
                  Enter any valid model name supported by your Gemini API key.
                </span>
              </div>
            ) : (
              <select
                value={modelName}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 font-mono shadow-inner"
              >
                {recommendedModels.length > 0 && (
                  <optgroup label="Recommended for Note Synthesis">
                    {recommendedModels.map(m => (
                      <option key={m.id} value={m.id}>
                        ★ {m.displayName}
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherModels.length > 0 && (
                  <optgroup label="Other Available Models">
                    {otherModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.displayName}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
            
            <p className="text-[10px] text-zinc-500 leading-normal">
              Tap <strong>Fetch Available Models</strong> to query Google and populate all active models your key has permission to use.
            </p>
          </div>

          {/* Provider Selection */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <label className="text-[11px] font-medium text-zinc-400">
              Provider Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'gemini', label: 'Google Gemini', tag: 'Direct Active' },
                { id: 'openai', label: 'OpenAI (GPT)', tag: 'Adapter' },
                { id: 'claude', label: 'Claude', tag: 'Adapter' },
                { id: 'ollama', label: 'Ollama (Local)', tag: 'Offline' }
              ].map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handleProviderChange(p.id as any)}
                  className={`p-2 rounded-lg border text-left transition-colors ${
                    provider === p.id
                      ? 'bg-zinc-800 text-zinc-100 font-semibold border-indigo-500/50'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-medium">{p.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{p.tag}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. SECOND SECTION: High-Speed SQLite Database Engine & Google Drive Vault */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-zinc-200">
              <DatabaseIcon className="w-4 h-4 text-indigo-400" />
              <span>SQLite Engine (Single File: lattice_vault.db)</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              <Zap className="w-3 h-3" />
              B-Tree Indexed (Ultra Fast)
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            All notes are saved into an indexed <strong>SQLite database</strong> for instantaneous sub-millisecond loading and saving without loose markdown file overhead. You can share this exact same <code>lattice_vault.db</code> file across <strong>Mobile</strong> and <strong>Desktop</strong> via Google Drive.
          </p>

          <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                <span>SQLite Vault Records</span>
              </span>
              <span className="font-mono text-indigo-400 font-semibold">{notes.length} notes</span>
            </div>

            {/* Primary SQLite .db Controls */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportSqlite}
                  className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Export real SQLite database file (.db) to Google Drive"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export SQLite DB (lattice_vault.db)</span>
                </button>

                <button
                  type="button"
                  onClick={() => sqliteInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700/60"
                  title="Select lattice_vault.db from Google Drive"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Import SQLite DB from Google Drive</span>
                </button>

                <input
                  ref={sqliteInputRef}
                  type="file"
                  accept=".db,.sqlite"
                  onChange={handleSqliteFileChange}
                  className="hidden"
                />
              </div>

              {/* Secondary JSON Export / Import */}
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-1">
                <span>Secondary Backup:</span>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="underline hover:text-zinc-300"
                >
                  Export JSON
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="underline hover:text-zinc-300"
                >
                  Import JSON
                </button>
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleJsonFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {importStatus && (
              <div className="text-[11px] font-medium p-2 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 animate-in fade-in">
                {importStatus}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-zinc-500 leading-normal">
            <FolderSync className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <span>
              <strong>Google Drive Single-File Strategy:</strong> Because everything resides in <code>lattice_vault.db</code>, Google Drive syncs just one unified database file. When the desktop app opens, it reads this same database file with zero file system fragmentation!
            </span>
          </div>
        </div>

        {/* 3. THIRD SECTION: Sample Vault Reset */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="font-medium text-zinc-200 flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sample Knowledge Vault</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Reset SQLite database to the original Harry Potter vault (pages, quick notes, and links).
          </p>
          <button
            type="button"
            onClick={onResetSeedData}
            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            Reset to Harry Potter Vault
          </button>
        </div>

        {/* Master Bottom Save Button */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>All Settings Saved!</span>
            </span>
          )}
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
