import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Cpu, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Save, 
  ExternalLink, 
  Sparkles, 
  Zap,
  RefreshCw,
  Sliders,
  Eye, 
  EyeOff, 
  Clipboard, 
  Loader2, 
  Folder, 
  FolderOpen, 
  Palette, 
  Moon, 
  Sun, 
  BookOpen, 
  Compass,
  ChevronLeft 
} from 'lucide-react';
import { AIProviderConfig, Note, GeminiModelInfo, AppTheme } from '../types';
import { 
  sanitizeApiKey, 
  fetchAvailableGeminiModels, 
  fetchAvailableOpenAIModels,
  DEFAULT_GEMINI_MODELS,
  DEFAULT_OPENAI_MODELS 
} from '../services/aiService';
import {
  chooseVaultFolder,
  setMobileVaultFolder,
  subscribeVaultSyncState,
  VaultSyncState,
  getVaultSyncState
} from '../services/vaultSyncService';

interface SettingsModalProps {
  config: AIProviderConfig;
  onSaveConfig: (config: AIProviderConfig) => void;
  onResetSeedData: () => void;
  notes?: Note[];
  onNotesUpdated?: (notes: Note[]) => void;
  theme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
  onClose?: () => void;
  returnModeLabel?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  onSaveConfig,
  onResetSeedData,
  notes: _notes = [],
  onNotesUpdated,
  theme = 'dark',
  onThemeChange,
  onClose,
  returnModeLabel
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
    if (config.provider === 'openai') {
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('LL_AVAILABLE_MODELS_OPENAI');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        }
      } catch {}
      return DEFAULT_OPENAI_MODELS;
    }
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
  useEffect(() => {
    return subscribeVaultSyncState(setSyncState);
  }, []);

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

  const handleProviderChange = (newProvider: 'gemini' | 'openai' | 'claude' | 'ollama') => {
    setProvider(newProvider);
    setTestStatus('idle');
    setTestDetails(null);

    let providerKey = '';
    let defaultModel = '';
    let modelsList: GeminiModelInfo[] = [];

    if (newProvider === 'openai') {
      providerKey = (typeof window !== 'undefined' ? localStorage.getItem('LL_OPENAI_API_KEY') : '') || '';
      defaultModel = 'gpt-4o-mini';
      modelsList = DEFAULT_OPENAI_MODELS;
    } else if (newProvider === 'claude') {
      providerKey = (typeof window !== 'undefined' ? localStorage.getItem('LL_CLAUDE_API_KEY') : '') || '';
      defaultModel = 'claude-3-5-sonnet';
      modelsList = [
        { id: 'claude-3-5-sonnet', name: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet (Recommended)', isRecommended: true },
        { id: 'claude-3-haiku', name: 'claude-3-haiku', displayName: 'Claude 3 Haiku (Fast)', isRecommended: false }
      ];
    } else if (newProvider === 'ollama') {
      providerKey = (typeof window !== 'undefined' ? localStorage.getItem('LL_OLLAMA_BASE_URL') : '') || 'http://localhost:11434';
      defaultModel = 'llama3.2';
      modelsList = [
        { id: 'llama3.2', name: 'llama3.2', displayName: 'Llama 3.2 (Local)', isRecommended: true },
        { id: 'mistral', name: 'mistral', displayName: 'Mistral (Local)', isRecommended: false }
      ];
    } else {
      providerKey = (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : '') || '';
      defaultModel = 'gemini-3.8-flash';
      modelsList = DEFAULT_GEMINI_MODELS;
    }

    setApiKey(providerKey);
    setModelName(defaultModel);
    setAvailableModels(modelsList);

    const updatedConfig = {
      provider: newProvider,
      apiKey: providerKey,
      modelName: defaultModel
    };
    onSaveConfig(updatedConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('LL_AI_CONFIG', JSON.stringify(updatedConfig));
    }
  };

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    const cleanKey = sanitizeApiKey(val);
    const updatedConfig = {
      provider,
      apiKey: cleanKey,
      modelName
    };
    onSaveConfig(updatedConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('LL_AI_CONFIG', JSON.stringify(updatedConfig));
      if (provider === 'openai') {
        if (cleanKey) localStorage.setItem('LL_OPENAI_API_KEY', cleanKey);
        else localStorage.removeItem('LL_OPENAI_API_KEY');
      } else if (provider === 'claude') {
        if (cleanKey) localStorage.setItem('LL_CLAUDE_API_KEY', cleanKey);
        else localStorage.removeItem('LL_CLAUDE_API_KEY');
      } else if (provider === 'ollama') {
        if (cleanKey) localStorage.setItem('LL_OLLAMA_BASE_URL', cleanKey);
        else localStorage.removeItem('LL_OLLAMA_BASE_URL');
      } else {
        if (cleanKey) localStorage.setItem('LL_GEMINI_API_KEY', cleanKey);
        else localStorage.removeItem('LL_GEMINI_API_KEY');
      }
    }
  };

  const handleModelChange = (m: string) => {
    setModelName(m);
    const updatedConfig = {
      provider,
      apiKey: sanitizeApiKey(apiKey),
      modelName: m
    };
    onSaveConfig(updatedConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('LL_AI_CONFIG', JSON.stringify(updatedConfig));
    }
  };

  const handleManualSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = sanitizeApiKey(apiKey);
    const updatedConfig = {
      provider,
      apiKey: cleanKey,
      modelName
    };
    onSaveConfig(updatedConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('LL_AI_CONFIG', JSON.stringify(updatedConfig));
      if (provider === 'openai') {
        if (cleanKey) localStorage.setItem('LL_OPENAI_API_KEY', cleanKey);
        else localStorage.removeItem('LL_OPENAI_API_KEY');
      } else if (provider === 'claude') {
        if (cleanKey) localStorage.setItem('LL_CLAUDE_API_KEY', cleanKey);
        else localStorage.removeItem('LL_CLAUDE_API_KEY');
      } else if (provider === 'ollama') {
        if (cleanKey) localStorage.setItem('LL_OLLAMA_BASE_URL', cleanKey);
        else localStorage.removeItem('LL_OLLAMA_BASE_URL');
      } else {
        if (cleanKey) localStorage.setItem('LL_GEMINI_API_KEY', cleanKey);
        else localStorage.removeItem('LL_GEMINI_API_KEY');
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

  const handleFetchModels = async (keyOverride?: string) => {
    const keyToUse = sanitizeApiKey(keyOverride || apiKey);
    if (!keyToUse) {
      setTestStatus('error');
      setTestDetails(`Please paste or enter your ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key first to fetch models.`);
      return;
    }

    setIsFetchingModels(true);
    setTestDetails(`Fetching available models from ${provider === 'openai' ? 'OpenAI' : 'Google'}...`);

    try {
      let models: GeminiModelInfo[] = [];
      if (provider === 'openai') {
        models = await fetchAvailableOpenAIModels(keyToUse);
      } else {
        models = await fetchAvailableGeminiModels(keyToUse);
      }

      if (models && models.length > 0) {
        setAvailableModels(models);
        const currentInList = models.some(m => m.id === modelName || m.name === modelName);
        if (!currentInList) {
          const recommended = models.find(m => m.isRecommended) || models[0];
          setModelName(recommended.id);
          onSaveConfig({
            provider,
            apiKey: keyToUse,
            modelName: recommended.id
          });
        }
        setTestStatus('success');
        setTestDetails(`Successfully fetched ${models.length} active models from ${provider === 'openai' ? 'OpenAI' : 'Google'}!`);
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
      setTestDetails(`Please paste or type your ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key first.`);
      return;
    }

    setTestStatus('testing');
    setTestDetails(`Connecting directly to ${provider === 'openai' ? 'OpenAI' : 'Google Gemini'} servers...`);

    try {
      if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${cleanKey}`
          }
        });
        if (response.ok) {
          onSaveConfig({
            provider,
            apiKey: cleanKey,
            modelName
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('LL_OPENAI_API_KEY', cleanKey);
          }
          await handleFetchModels(cleanKey);
        } else {
          const errorJson = await response.json().catch(() => null);
          const serverMsg = errorJson?.error?.message || response.statusText || 'Verification failed';
          setTestStatus('error');
          setTestDetails(`OpenAI Error (HTTP ${response.status}): ${serverMsg}`);
        }
      } else {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`);
        if (response.ok) {
          onSaveConfig({
            provider,
            apiKey: cleanKey,
            modelName
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('LL_GEMINI_API_KEY', cleanKey);
          }
          await handleFetchModels(cleanKey);
        } else {
          const errorJson = await response.json().catch(() => null);
          const serverMsg = errorJson?.error?.message || response.statusText || 'Verification failed';
          setTestStatus('error');
          setTestDetails(`Google Error (HTTP ${response.status}): ${serverMsg}`);
        }
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestDetails(`Network Error: ${err?.message || 'Failed to reach servers. Check device internet connection.'}`);
    }
  };

  // Vault Folder Selection
  const handleSelectFolder = async () => {
    setIsBindingFolder(true);
    setImportStatus('Selecting vault folder...');

    try {
      if (syncState.platform === 'capacitor') {
        const current = syncState.folderPath || 'Documents/LatticeLedger';
        const entered = window.prompt('Enter vault folder path inside Documents (e.g. LatticeLedger or Notes):', current);
        if (!entered || !entered.trim() || entered.trim() === current) {
          setIsBindingFolder(false);
          setImportStatus(null);
          return;
        }

        const res = await setMobileVaultFolder(entered.trim());
        if (res.success) {
          if (res.isFresh && onNotesUpdated) {
            onNotesUpdated([]);
            setImportStatus(`Created fresh vault in "${res.folderPath}". Ready for new notes!`);
          } else if (res.loadedNotes && onNotesUpdated) {
            onNotesUpdated(res.loadedNotes);
            setImportStatus(`Switched vault to "${res.folderPath}" (${res.loadedNotes.length} notes loaded).`);
          } else {
            setImportStatus(`Connected to "${res.folderPath}".`);
          }
        } else if (res.error) {
          setImportStatus(`Folder error: ${res.error}`);
        }
      } else {
        // Desktop (Electron) and Browser
        const res = await chooseVaultFolder();
        if (res.success) {
          if (res.isFresh && onNotesUpdated) {
            onNotesUpdated([]);
            setImportStatus(`Created fresh vault in "${res.folderName || res.folderPath}". Ready for new notes!`);
          } else if (res.loadedNotes && onNotesUpdated) {
            onNotesUpdated(res.loadedNotes);
            setImportStatus(`Switched vault to "${res.folderName || res.folderPath}" (${res.loadedNotes.length} notes loaded).`);
          } else {
            setImportStatus(`Connected to "${res.folderName || res.folderPath}".`);
          }
        } else if (res.error && res.error !== 'Folder selection canceled') {
          setImportStatus(`Folder notice: ${res.error}`);
        }
      }
    } catch (err: any) {
      setImportStatus(`Failed to select folder: ${err.message}`);
    } finally {
      setIsBindingFolder(false);
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  const recommendedModels = availableModels.filter(m => m.isRecommended);
  const otherModels = availableModels.filter(m => !m.isRecommended);

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 sm:px-6 lg:px-12 py-8 max-w-2xl mx-auto w-full text-xs">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors text-xs font-medium mb-5"
          title="Return to your previous workspace"
        >
          <ChevronLeft className="w-4 h-4 text-indigo-400" />
          <span>Back to {returnModeLabel || 'Workspace'}</span>
        </button>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <span>Settings & Configuration</span>
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Manage your Gemini AI Key, fetch active models, and choose your vault storage folder.
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

        {/* 1. TOP SECTION: AI Model & Provider API Key (BYOK Direct Connection) */}
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-indigo-500/30 shadow-lg space-y-4">
          
          {/* Provider Selection Tabs at Top */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Service Provider</span>
              </label>
              <span className="text-[10px] text-zinc-500">Universal Model-Agnostic Engine</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'gemini', label: 'Google Gemini', tag: 'Direct Active', desc: 'Gemini 3.8 / 2.5 Flash' },
                { id: 'openai', label: 'OpenAI (GPT)', tag: 'Direct Active', desc: 'GPT-4o / GPT-4o Mini' },
                { id: 'claude', label: 'Claude', tag: 'Adapter', desc: 'Claude 3.5 Sonnet' },
                { id: 'ollama', label: 'Ollama (Local)', tag: 'Offline', desc: 'Local localhost:11434' }
              ].map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handleProviderChange(p.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    provider === p.id
                      ? 'bg-zinc-800 text-zinc-100 font-semibold border-indigo-500 ring-1 ring-indigo-500/30'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{p.label}</span>
                    {provider === p.id && <Check className="w-3 h-3 text-indigo-400" />}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Provider Header & Key Info */}
          <div className="pt-3 border-t border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-zinc-100 text-sm">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>
                  {provider === 'openai' 
                    ? 'OpenAI API Key (Direct Connection)' 
                    : provider === 'claude' 
                    ? 'Anthropic Claude API Key' 
                    : provider === 'ollama' 
                    ? 'Ollama Base URL' 
                    : 'Google Gemini API Key (Direct Connection)'}
                </span>
              </div>
              <a
                href={
                  provider === 'openai'
                    ? 'https://platform.openai.com/api-keys'
                    : provider === 'claude'
                    ? 'https://console.anthropic.com'
                    : provider === 'ollama'
                    ? 'https://ollama.com'
                    : 'https://aistudio.google.com/app/apikey'
                }
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline font-medium"
              >
                <span>{provider === 'openai' ? 'Get OpenAI Key' : provider === 'ollama' ? 'Ollama Guide' : 'Get Free Key'}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {provider === 'openai'
                ? 'LatticeLedger connects directly from your phone/desktop to OpenAI API servers (GPT-4o, GPT-4o-mini). Stored securely on your device.'
                : provider === 'claude'
                ? 'LatticeLedger connects directly to Anthropic Claude using your personal API key.'
                : provider === 'ollama'
                ? 'LatticeLedger connects to your local offline Ollama instance with zero internet access required.'
                : 'LatticeLedger connects directly from your phone/desktop to Google Gemini using your API key. No intermediate servers or subscriptions required.'}
            </p>

            {/* API Key Input Box with Eye Toggle, Paste, and Auto-save */}
            <div className="space-y-2">
              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={
                    provider === 'openai'
                      ? 'Paste sk-... or sk-proj-... key here'
                      : provider === 'claude'
                      ? 'Paste sk-ant-... key here'
                      : provider === 'ollama'
                      ? 'http://localhost:11434'
                      : 'Paste AIzaSy... or AQ... key here'
                  }
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
                  title={`Fetch all active models available for your ${provider === 'openai' ? 'OpenAI' : 'Google Gemini'} API key`}
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
                  <span>Selected {provider === 'openai' ? 'OpenAI' : 'Gemini'} Model ({availableModels.length} available)</span>
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
                    placeholder={provider === 'openai' ? 'e.g. gpt-4o-mini or fine-tuned' : 'e.g. gemini-3.8-flash'}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-zinc-500 block">
                    Enter any valid model name supported by your {provider === 'openai' ? 'OpenAI' : 'Gemini'} API key.
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
                Tap <strong>Fetch Available Models</strong> to query {provider === 'openai' ? 'OpenAI' : 'Google'} and populate all active models your key has permission to use.
              </p>
            </div>
          </div>
        </div>

        {/* 2. SECOND SECTION: Vault Storage Location */}
        {/* Vault Folder Section */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-zinc-200 text-xs">
              <Folder className="w-4 h-4 text-indigo-400" />
              <span>Vault Folder</span>
            </div>
            <span className="text-[11px] font-mono text-indigo-300 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800 truncate max-w-[240px]">
              {syncState.folderPath || 'Documents/LatticeLedger'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSelectFolder}
            disabled={isBindingFolder}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {isBindingFolder ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <FolderOpen className="w-4 h-4" />}
            <span>Select Vault Folder</span>
          </button>

          {importStatus && (
            <div className="text-[11px] font-medium p-2.5 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 animate-in fade-in">
              {importStatus}
            </div>
          )}
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
