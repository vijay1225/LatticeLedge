import React, { useState, useRef } from 'react';
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
  FolderSync
} from 'lucide-react';
import { AIProviderConfig, Note } from '../types';
import { downloadVaultBackup, importVaultFromJson } from '../utils/vaultExportImport';
import { downloadSqliteDatabaseFile, importSqliteDatabaseFile } from '../services/sqliteService';

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

  const sqliteInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex-1 h-full overflow-y-auto px-6 lg:px-12 py-8 max-w-2xl mx-auto w-full text-xs">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <span>Settings & Database</span>
          <Sparkles className="w-4 h-4 text-zinc-400" />
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          High-speed SQLite database engine, Google Drive single-file vault sync, and AI configuration.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* 1. High-Speed SQLite Database Engine & Google Drive Vault */}
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-3">
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

        {/* 2. Model Provider & Gemini API Key (Direct Connection) */}
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
