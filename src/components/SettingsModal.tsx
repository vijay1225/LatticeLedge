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
  Sliders,
  Folder,
  FolderOpen,
  Unlink,
  Share2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Palette,
  Moon,
  Sun,
  BookOpen,
  Compass
} from 'lucide-react';
import { AIProviderConfig, Note, GeminiModelInfo, AppTheme } from '../types';
import { downloadVaultBackup, importVaultFromJson } from '../utils/vaultExportImport';
import { downloadSqliteDatabaseFile, importSqliteDatabaseFile, replaceAllNotesInSql } from '../services/sqliteService';
import { sanitizeApiKey, fetchAvailableGeminiModels, DEFAULT_GEMINI_MODELS } from '../services/aiService';
import {
  chooseVaultFolder,
  setMobileVaultFolder,
  shareVaultDatabaseFile,
  subscribeVaultSyncState,
  VaultSyncState,
  disconnectVaultFolder,
  getVaultSyncState,
  saveVaultDbToFolder,
  pushVaultDbToFolder,
  pullVaultDbFromFolder
} from '../services/vaultSyncService';

interface SettingsModalProps {
  config: AIProviderConfig;
  onSaveConfig: (config: AIProviderConfig) => void;
  onResetSeedData: () => void;
  notes?: Note[];
  onNotesUpdated?: (notes: Note[]) => void;
  theme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  onSaveConfig,
  onResetSeedData,
  notes = [],
  onNotesUpdated,
  theme = 'dark',
  onThemeChange
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

  // Vault Sync State
  const [syncState, setSyncState] = useState<VaultSyncState>(getVaultSyncState());
  const [isBindingFolder, setIsBindingFolder] = useState(false);
  const [isEditingMobilePath, setIsEditingMobilePath] = useState(false);
  const [mobilePathInput, setMobilePathInput] = useState(getVaultSyncState().folderPath || 'Documents/LatticeLedger');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    return subscribeVaultSyncState((state) => {
      setSyncState(state);
      if (state.folderPath) {
        setMobilePathInput(state.folderPath);
      }
    });
  }, []);

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

  // Share / Export SQLite DB (.db) directly to Google Drive or download
  const handleShareToGoogleDrive = async () => {
    try {
      setImportStatus('Preparing lattice_vault.db for Google Drive...');
      const res = await shareVaultDatabaseFile();
      setImportStatus(res.message || 'lattice_vault.db export complete!');
      setTimeout(() => setImportStatus(null), 5000);
    } catch (err: any) {
      setImportStatus(`Export notice: ${err.message}`);
      setTimeout(() => setImportStatus(null), 5000);
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
        setImportStatus(`Loaded SQLite database successfully (${importedNotes.length} notes from Google Drive)!`);
      }
      // Also automatically save to bound folder if one exists
      if (syncState.isConfigured) {
        await saveVaultDbToFolder(new Uint8Array(buffer));
      }
    } catch (err: any) {
      setImportStatus(`SQLite import error: ${err.message}`);
    }
    setTimeout(() => setImportStatus(null), 6000);
    e.target.value = '';
  };

  // Vault Folder Binding (Google Drive / Local Directory)
  const handleChooseFolder = async () => {
    if (syncState.platform === 'capacitor') {
      setIsEditingMobilePath(true);
      return;
    }

    setIsBindingFolder(true);
    setImportStatus('Selecting vault folder (Google Drive / Local)...');
    try {
      const res = await chooseVaultFolder();
      if (res.success) {
        if (res.isFresh) {
          if (onNotesUpdated) {
            onNotesUpdated([]);
          }
          setImportStatus(`Bound to empty folder "${res.folderName || res.folderPath}"! Created fresh empty vault (0 notes). Ready for new notes.`);
        } else if (res.loadedNotes && onNotesUpdated) {
          onNotesUpdated(res.loadedNotes);
          setImportStatus(`Bound to folder: "${res.folderName || res.folderPath}"! Resumed from existing vault (${res.loadedNotes.length} notes loaded).`);
        } else {
          setImportStatus(`Bound to folder: "${res.folderName || res.folderPath}"!`);
        }
      } else if (res.error && res.error !== 'Folder selection canceled') {
        setImportStatus(`Folder selection notice: ${res.error}`);
      }
    } catch (err: any) {
      setImportStatus(`Failed to bind folder: ${err.message}`);
    } finally {
      setIsBindingFolder(false);
      setTimeout(() => setImportStatus(null), 6000);
    }
  };

  const handleSaveMobileFolder = async (customPath?: string) => {
    const pathToUse = (customPath || mobilePathInput || 'Documents/LatticeLedger').trim();
    setIsBindingFolder(true);
    setImportStatus(`Configuring mobile vault folder: "${pathToUse}"...`);
    try {
      const res = await setMobileVaultFolder(pathToUse);
      if (res.success) {
        if (res.isFresh) {
          if (onNotesUpdated) {
            onNotesUpdated([]);
          }
          setImportStatus(`Bound to empty folder "${res.folderPath}"! Created fresh empty vault (0 notes). Ready for new notes.`);
        } else if (res.loadedNotes && onNotesUpdated) {
          onNotesUpdated(res.loadedNotes);
          setImportStatus(`Bound to "${res.folderPath}"! Resumed from existing vault (${res.loadedNotes.length} notes loaded).`);
        } else {
          setImportStatus(`Bound to "${res.folderPath}"!`);
        }
        setIsEditingMobilePath(false);
      } else {
        setImportStatus(`Failed to bind folder: ${res.error}`);
      }
    } catch (err: any) {
      setImportStatus(`Mobile folder error: ${err.message}`);
    } finally {
      setIsBindingFolder(false);
      setTimeout(() => setImportStatus(null), 5000);
    }
  };

  // Push / Save all active notes into lattice_vault.db in folder
  const handlePushToFolder = async () => {
    setIsBindingFolder(true);
    setImportStatus('Saving current notes to lattice_vault.db in folder...');
    try {
      const res = await pushVaultDbToFolder();
      setImportStatus(res.message);
    } catch (err: any) {
      setImportStatus(`Save error: ${err.message}`);
    } finally {
      setIsBindingFolder(false);
      setTimeout(() => setImportStatus(null), 5000);
    }
  };

  // Pull / Reload entire notes from lattice_vault.db in folder
  const handlePullFromFolder = async () => {
    setIsBindingFolder(true);
    setImportStatus('Reloading entire notes from folder lattice_vault.db...');
    try {
      const res = await pullVaultDbFromFolder();
      if (res.success && res.notes && onNotesUpdated) {
        onNotesUpdated(res.notes);
      }
      setImportStatus(res.message);
    } catch (err: any) {
      setImportStatus(`Reload error: ${err.message}`);
    } finally {
      setIsBindingFolder(false);
      setTimeout(() => setImportStatus(null), 5000);
    }
  };

  const handleDisconnectFolder = async () => {
    await disconnectVaultFolder();
    setImportStatus('Disconnected vault folder binding.');
    setTimeout(() => setImportStatus(null), 4000);
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
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const result = importVaultFromJson(content);
      if (result.success && result.notes && result.notes.length > 0) {
        try {
          const updatedSqlNotes = await replaceAllNotesInSql(result.notes);
          if (onNotesUpdated) {
            onNotesUpdated(updatedSqlNotes);
          }
          setImportStatus(`Imported ${updatedSqlNotes.length} notes successfully from JSON! Replaced active vault.`);
        } catch (err: any) {
          setImportStatus(`Import error: ${err.message}`);
        }
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
        {/* Appearance & Color Theme Section */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-zinc-100 text-sm">
              <Palette className="w-4 h-4 text-amber-500" />
              <span>Appearance & Color Theme</span>
            </div>
            <span className="text-[11px] font-medium text-zinc-400 capitalize">
              Active: {
                theme === 'dark' ? 'Obsidian Dark' : 
                theme === 'slate' ? 'Midnight Slate (Cool Dark)' : 
                theme === 'sepia' ? 'Warm Paper (Sepia)' : 
                'Modern Light'
              }
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Choose your preferred reading and writing aesthetic. Instantly transforms the editor, pages, navigation, and knowledge graph.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Theme 1: Obsidian Dark */}
            <button
              type="button"
              onClick={() => onThemeChange?.('dark')}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                theme === 'dark'
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-zinc-950/90 shadow-md'
                  : 'border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                      <Moon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-100">Obsidian Dark</span>
                  </div>
                  {theme === 'dark' && (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2">
                  Classic midnight black with amber & sky accents. High-contrast OLED focus.
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-zinc-800/60">
                <div className="w-3.5 h-3.5 rounded-full bg-[#09090b] border border-zinc-700" title="Canvas #09090b" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#18181b] border border-zinc-700" title="Card #18181b" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#f59e0b]" title="Amber Accent" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#38bdf8]" title="Sky Accent" />
              </div>
            </button>

            {/* Theme 2: Midnight Slate (Cool Dark Reading Mode) */}
            <button
              type="button"
              onClick={() => onThemeChange?.('slate')}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                theme === 'slate'
                  ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-[#0f172a] shadow-md'
                  : 'border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#18212f] border border-[#283548] flex items-center justify-center text-cyan-400">
                      <Compass className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-100">Midnight Slate</span>
                  </div>
                  {theme === 'slate' && (
                    <span className="w-4 h-4 rounded-full bg-cyan-600 flex items-center justify-center text-white">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2">
                  Deep cool dark slate with soft frost typography & glacier cyan accents. Zero harsh glare for notes.
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-zinc-800/60">
                <div className="w-3.5 h-3.5 rounded-full bg-[#0f172a] border border-[#283548]" title="Canvas #0f172a" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#18212f] border border-[#283548]" title="Card #18212f" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#38bdf8]" title="Glacier Cyan" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#818cf8]" title="Cool Indigo" />
              </div>
            </button>

            {/* Theme 3: Warm Paper (Sepia) - The Ultimate Note Writing Palette */}
            <button
              type="button"
              onClick={() => onThemeChange?.('sepia')}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                theme === 'sepia'
                  ? 'border-amber-600 ring-2 ring-amber-600/20 bg-[#fbf8f2] shadow-md'
                  : 'border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#eee7d8] border border-[#d6cbba] flex items-center justify-center text-amber-700">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-100">Warm Paper</span>
                  </div>
                  {theme === 'sepia' && (
                    <span className="w-4 h-4 rounded-full bg-amber-600 flex items-center justify-center text-white">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2">
                  Moleskine cream with espresso ink. Zero blue-light glare, most comfortable for 10+ hours of writing.
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-zinc-800/60">
                <div className="w-3.5 h-3.5 rounded-full bg-[#fbf8f2] border border-[#ded3bc]" title="Paper #fbf8f2" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#f5f0e6] border border-[#ded3bc]" title="Panel #f5f0e6" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#b45309]" title="Warm Bronze" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#2b221b]" title="Espresso Ink" />
              </div>
            </button>

            {/* Theme 4: Modern Light */}
            <button
              type="button"
              onClick={() => onThemeChange?.('light')}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                theme === 'light'
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white shadow-md'
                  : 'border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-300 flex items-center justify-center text-amber-500">
                      <Sun className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-100">Modern Light</span>
                  </div>
                  {theme === 'light' && (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2">
                  Clean crisp paper white with slate typography and indigo accents for bright daytime clarity.
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-zinc-800/60">
                <div className="w-3.5 h-3.5 rounded-full bg-[#ffffff] border border-slate-300" title="Canvas #ffffff" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#f8fafc] border border-slate-300" title="Card #f8fafc" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#4f46e5]" title="Indigo Accent" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#0284c7]" title="Sky Accent" />
              </div>
            </button>
          </div>
        </div>

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
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-zinc-200">
              <DatabaseIcon className="w-4 h-4 text-indigo-400" />
              <span>SQLite Engine & Cloud Folder Sync (lattice_vault.db)</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              <Zap className="w-3 h-3" />
              B-Tree Indexed (Ultra Fast)
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            All notes are saved into an indexed <strong>SQLite database</strong> for instantaneous sub-millisecond loading and saving without loose markdown file overhead. You can share this exact same <code>lattice_vault.db</code> file across <strong>Mobile</strong> and <strong>Desktop</strong> via Google Drive or any synchronized folder.
          </p>

          {/* Google Drive Cross-Device Sync Guide */}
          <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800/90 space-y-2.5">
            <button
              type="button"
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="w-full flex items-center justify-between text-left text-xs font-semibold text-zinc-200 hover:text-indigo-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span>How to Sync with Google Drive between Desktop & Phone</span>
              </div>
              {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
            </button>

            {isGuideOpen && (
              <div className="pt-2 text-[11px] text-zinc-400 space-y-3 leading-relaxed border-t border-zinc-800/60 animate-in fade-in">
                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  <div>
                    <strong className="text-zinc-200">On Windows PC Desktop:</strong>
                    <p className="text-zinc-400 mt-0.5">
                      In Settings, click <strong>"Choose Vault Folder"</strong> and select your Google Drive folder (e.g. <code>G:\My Drive\LatticeLedger</code>). The desktop app will automatically write and monitor <code>lattice_vault.db</code>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                  <div>
                    <strong className="text-zinc-200">On Android Phone (1-Tap Google Drive Sync):</strong>
                    <p className="text-zinc-400 mt-0.5">
                      Tap <strong className="text-indigo-300">"Import from Google Drive"</strong> below → pick <code>lattice_vault.db</code> directly from the Google Drive app. All notes load instantly!
                    </p>
                    <p className="text-zinc-400 mt-1">
                      To send phone edits back to Google Drive, tap <strong className="text-emerald-300">"Save / Share to Google Drive"</strong> → tap <em>"Save to Drive"</em> in the Android share menu.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                  <div>
                    <strong className="text-zinc-200">Continuous Auto-Sync (Optional):</strong>
                    <p className="text-zinc-400 mt-0.5">
                      If you use Google Drive offline sync or <em>FolderSync</em> on Android to sync a device folder (e.g. <code>Documents/LatticeLedger</code>), configure that path below. LatticeLedger will write all changes directly to that folder in real time!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Google Drive 1-Tap Sync Hub */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => sqliteInputRef.current?.click()}
              className="p-3 rounded-lg bg-zinc-950 border border-indigo-500/40 hover:border-indigo-400/70 text-left transition-all group shadow-sm active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 text-indigo-300 font-medium text-xs">
                <Upload className="w-4 h-4 text-indigo-400 group-hover:-translate-y-0.5 transition-transform" />
                <span>Import from Google Drive</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                Pick <code>lattice_vault.db</code> from Google Drive to load all your notes instantly.
              </p>
            </button>

            <button
              type="button"
              onClick={handleShareToGoogleDrive}
              className="p-3 rounded-lg bg-zinc-950 border border-emerald-500/40 hover:border-emerald-400/70 text-left transition-all group shadow-sm active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 text-emerald-300 font-medium text-xs">
                <Share2 className="w-4 h-4 text-emerald-400 group-hover:-translate-y-0.5 transition-transform" />
                <span>Save / Share to Google Drive</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                Export and upload <code>lattice_vault.db</code> directly to your Google Drive folder.
              </p>
            </button>
          </div>

          {/* Real-time Folder Binding Card */}
          <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-zinc-200 text-xs">
                <FolderSync className="w-4 h-4 text-indigo-400" />
                <span>Device Synced Folder</span>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                syncState.isConfigured
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
              }`}>
                {syncState.isConfigured ? '🟢 In Sync' : '⚪ Not Bound'}
              </span>
            </div>

            {/* Mobile Folder Path Editor */}
            {isEditingMobilePath && (
              <div className="p-3 rounded-lg bg-zinc-900 border border-indigo-500/40 space-y-2.5 animate-in fade-in">
                <div className="text-[11px] font-medium text-zinc-200 flex items-center justify-between">
                  <span>Configure Device Folder Path:</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Internal Storage / Documents</span>
                </div>
                <input
                  type="text"
                  value={mobilePathInput}
                  onChange={(e) => setMobilePathInput(e.target.value)}
                  placeholder="e.g. Documents/LatticeLedger or Documents/GoogleDrive"
                  className="w-full px-3 py-2 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
                
                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-zinc-500">Presets:</span>
                  {[
                    'Documents/LatticeLedger',
                    'Documents/GoogleDrive',
                    'Download/LatticeLedger'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMobilePathInput(preset)}
                      className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveMobileFolder()}
                    disabled={isBindingFolder}
                    className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    {isBindingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save & Bind Folder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingMobilePath(false)}
                    className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {syncState.isConfigured ? (
              <div className="space-y-2.5 p-3 rounded-lg bg-zinc-900/80 border border-indigo-500/30">
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    Bound Vault Folder ({syncState.platform === 'electron' ? 'Desktop App' : syncState.platform === 'capacitor' ? 'Android Device' : 'Browser Engine'})
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-indigo-300 bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-800 overflow-x-auto break-all">
                    <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{syncState.folderPath || syncState.folderName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Automatic sync active (<code>{syncState.fileName}</code>)</span>
                  </div>
                  {syncState.lastSyncedAt && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Last sync: {new Date(syncState.lastSyncedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handlePushToFolder}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Export and save all active notes into lattice_vault.db in this folder"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save / Push Notes to Folder</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromFolder}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700"
                    title="Read lattice_vault.db from this folder and reload notes"
                  >
                    <RefreshCw className="w-3 h-3 text-indigo-400" />
                    <span>Reload / Pull from Folder</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleChooseFolder}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700"
                    title="Change folder location"
                  >
                    <FolderOpen className="w-3 h-3 text-zinc-400" />
                    <span>Change Folder</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectFolder}
                    className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-rose-800/40 ml-auto"
                    title="Unbind folder"
                  >
                    <Unlink className="w-3 h-3 text-rose-400" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ) : (
              !isEditingMobilePath && (
                <div className="space-y-3">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Select or configure your <strong>Google Drive / Synced folder</strong> (e.g. <code>G:\My Drive\LatticeLedger</code> on Desktop or <code>Documents/LatticeLedger</code> on Mobile). Both devices will automatically share and edit the exact same <code>lattice_vault.db</code> file.
                  </p>

                  <button
                    type="button"
                    onClick={handleChooseFolder}
                    disabled={isBindingFolder}
                    className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    {isBindingFolder ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <FolderOpen className="w-4 h-4" />
                    )}
                    <span>{syncState.platform === 'capacitor' ? 'Configure Device Sync Folder' : 'Choose Vault Folder (Google Drive / Local)'}</span>
                  </button>
                </div>
              )
            )}
          </div>

          {/* Vault Records & Direct Transfer Controls */}
          <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-3.5">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                <span>SQLite Vault Records</span>
              </span>
              <span className="font-mono text-indigo-400 font-semibold">{notes.length} notes</span>
            </div>

            {/* Load Entire Notes from File (Import) */}
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
              <div className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Load / Replace Entire Notes from File</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-normal">
                Import and replace all notes in your vault using a SQLite database file or a JSON backup file.
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => sqliteInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Import and replace entire vault from a .db or .sqlite file"
                >
                  <DatabaseIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Import SQLite DB (.db, .sqlite)</span>
                </button>

                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title="Import and replace entire vault from a .json backup file"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Import JSON Backup (.json)</span>
                </button>

                <input
                  ref={sqliteInputRef}
                  type="file"
                  accept=".db,.sqlite"
                  onChange={handleSqliteFileChange}
                  className="hidden"
                />
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleJsonFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Export & Backup Vault Controls */}
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
              <div className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export & Backup Entire Vault</span>
              </div>
              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportSqlite}
                  className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700/80 shadow-sm"
                  title="Export raw SQLite database file (lattice_vault.db)"
                >
                  <DatabaseIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Export SQLite DB (lattice_vault.db)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700/80"
                  title="Export standard JSON backup"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Export JSON Backup (.json)</span>
                </button>
              </div>
            </div>

            {importStatus && (
              <div className="text-[11px] font-medium p-2.5 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 animate-in fade-in">
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
