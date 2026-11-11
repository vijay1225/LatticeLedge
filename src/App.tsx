import { useState, useEffect, useRef } from 'react';
import { 
  Note, 
  ViewMode, 
  AIProviderConfig,
  AppTheme 
} from './types';
import { HARRY_POTTER_SEED_NOTES } from './services/harryPotterSeed';
import { buildKnowledgeGraph } from './utils/graphBuilder';
import { generateNoteSummary, isGeminiKeyConfigured } from './services/aiService';
import { extractWikiLinks, extractTags } from './utils/wikiLinks';
import { 
  getAllNotesFromSql, 
  saveNoteToSql, 
  deleteNoteFromSql, 
  resetSqliteToSeed,
  loadDemoShowcaseNotes 
} from './services/sqliteService';
import { 
  initVaultSync, 
  subscribeVaultSyncState, 
  VaultSyncState,
  chooseVaultFolder,
  pullVaultDbFromFolder
} from './services/vaultSyncService';

import { Sidebar } from './components/Sidebar';
import { JournalsView } from './components/JournalsView';
import { PagesView } from './components/PagesView';
import { NoteEditor } from './components/NoteEditor';
import { QuickNotesFeed } from './components/QuickNotesFeed';
import { SearchView } from './components/SearchView';
import { KnowledgeGraphView } from './components/KnowledgeGraphView';
import { SettingsModal } from './components/SettingsModal';
import { RightPane } from './components/RightPane';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';

import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings as SettingsIcon,
  X,
  Send,
  Sparkles,
  PanelLeftOpen,
  Zap,
  Moon,
  Sun,
  BookOpen,
  Compass
} from 'lucide-react';

const STORAGE_KEY = 'LATTICE_LEDGER_NOTES_V1';
const AI_CONFIG_KEY = 'LATTICE_LEDGER_AI_CONFIG';
const THEME_STORAGE_KEY = 'LATTICE_LEDGER_THEME';

export function App() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'slate' || saved === 'sepia' || saved === 'light') {
          return saved;
        }
      }
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  const [aiConfig, setAiConfig] = useState<AIProviderConfig>(() => {
    try {
      const saved = localStorage.getItem(AI_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.modelName === 'gemini-2.5-flash') {
          parsed.modelName = 'gemini-3.8-flash';
        }
        if (!parsed.apiKey) {
          if (parsed.provider === 'openai') {
            parsed.apiKey = localStorage.getItem('LL_OPENAI_API_KEY') || '';
          } else {
            parsed.apiKey = localStorage.getItem('LL_GEMINI_API_KEY') || '';
          }
        }
        return parsed;
      }
    } catch {}
    return {
      provider: 'gemini',
      apiKey: (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') || '' : ''),
      modelName: 'gemini-3.8-flash'
    };
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const savedKey = typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : null;
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if cached notes are missing the new showcase demo notes, and merge them in
          const hasShowcase = parsed.some((n: Note) => n.id === 'wiki-code-showcase');
          let combined = parsed;
          if (!hasShowcase) {
            const demoNotes = HARRY_POTTER_SEED_NOTES.filter(n =>
              ['wiki-code-showcase', 'wiki-media-gallery', 'wiki-markdown-callouts'].includes(n.id)
            );
            combined = [...demoNotes, ...parsed];
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(combined)); } catch {}
          }
          return savedKey ? combined : combined.map((n: Note) => ({ ...n, summary: undefined }));
        }
      }
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }
    return HARRY_POTTER_SEED_NOTES;
  });

  // Default mode starts on 'journals' (Logseq-style daily stream with recent dates at the top)
  const [currentMode, setCurrentMode] = useState<ViewMode>('journals');
  const [previousMode, setPreviousMode] = useState<ViewMode>('journals');
  const [activeNoteId, setActiveNoteId] = useState<string>('wiki-code-showcase');

  // Maintain live references to prevent stale closure bugs in sync/file watcher callbacks
  const activeNoteIdRef = useRef(activeNoteId);
  activeNoteIdRef.current = activeNoteId;
  const currentModeRef = useRef(currentMode);
  currentModeRef.current = currentMode;
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const switchMode = (newMode: ViewMode) => {
    if (newMode !== currentMode) {
      setPreviousMode(currentMode);
      setCurrentMode(newMode);
    }
  };

  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [mobileQuickText, setMobileQuickText] = useState('');
  const [newNoteModalType, setNewNoteModalType] = useState<'wiki' | 'quick'>('wiki');
  const [newPageTitle, setNewPageTitle] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const hasGeminiKey = isGeminiKeyConfigured(aiConfig);

  // Note History Navigation (< and > like Obsidian / Logseq)
  const [history, setHistory] = useState<string[]>(['wiki-code-showcase']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const handleNotesUpdated = (updatedNotes: Note[], forceResetActive = false) => {
    const currentActiveId = activeNoteIdRef.current;
    const currentNotes = notesRef.current;

    // Check if the note being actively written/viewed exists in local state but not yet in incoming updatedNotes
    const activeLocalNote = currentNotes.find(n => n.id === currentActiveId);
    let finalNotes = updatedNotes;
    if (!forceResetActive && activeLocalNote && !updatedNotes.some(n => n.id === currentActiveId)) {
      // Keep active note so it is never dropped or lost
      finalNotes = [activeLocalNote, ...updatedNotes];
    }

    setNotes(finalNotes);

    if (finalNotes.length === 0) {
      setActiveNoteId('');
      setHistory([]);
      setHistoryIndex(0);
      setCurrentMode('pages');
    } else {
      // If currentActiveId exists and is in finalNotes, KEEP IT! NEVER JUMP!
      if (!forceResetActive && currentActiveId && finalNotes.some(n => n.id === currentActiveId)) {
        // User stays exactly where they are!
      } else {
        setActiveNoteId(finalNotes[0].id);
      }
    }
  };

  // Load notes directly from SQLite database on mount
  useEffect(() => {
    getAllNotesFromSql().then(sqlNotes => {
      if (sqlNotes && Array.isArray(sqlNotes)) {
        // Auto-merge demo showcase notes if they are missing
        const hasShowcase = sqlNotes.some(n => n.id === 'wiki-code-showcase');
        let finalNotes = sqlNotes;
        if (!hasShowcase && sqlNotes.length > 0) {
          const demoNotes = HARRY_POTTER_SEED_NOTES.filter(n =>
            ['wiki-code-showcase', 'wiki-media-gallery', 'wiki-markdown-callouts'].includes(n.id)
          );
          finalNotes = [...demoNotes, ...sqlNotes];
          loadDemoShowcaseNotes().catch(() => {});
        }
        const hasKey = isGeminiKeyConfigured(aiConfig);
        const sanitized = finalNotes.map(n => {
          const cleanContent = (n.content || '').replace(/\\+\[\\+\[/g, '[[').replace(/\\+\]\\+\]/g, ']]');
          const cleanLinks = extractWikiLinks(cleanContent);
          const rawTags = Array.isArray(n.tags) ? n.tags : [];
          const cleanTags = rawTags.filter(t => {
            const lower = (t || '').toLowerCase().trim();
            if (lower === '#draft' || lower === '#new' || lower === 'draft' || lower === 'new') {
              const text = `${n.title || ''} ${cleanContent}`.toLowerCase();
              return text.includes('#draft') || text.includes('#new');
            }
            return true;
          });
          return {
            ...n,
            content: cleanContent,
            links: cleanLinks.length > 0 ? cleanLinks : (n.links || []),
            tags: cleanTags,
            summary: hasKey ? n.summary : undefined
          };
        });

        // Persist sanitization back to SQLite if legacy #Draft or #New tags were stripped
        sanitized.forEach((n, idx) => {
          const orig = finalNotes[idx];
          if (orig && JSON.stringify(orig.tags || []) !== JSON.stringify(n.tags || [])) {
            saveNoteToSql(n).catch(() => {});
          }
        });

        handleNotesUpdated(sanitized);
      }
    }).catch(err => {
      console.warn('[SQLite] Fallback to cache:', err);
    });
  }, []);

  const [vaultSyncState, setVaultSyncState] = useState<VaultSyncState | null>(null);

  // Initialize unified Vault Folder Sync & Storage
  useEffect(() => {
    initVaultSync((externalNotes) => {
      console.log('[App] Vault updated externally from folder, reloading notes...');
      // Preserve active note when reloading externally so typing is NEVER interrupted
      handleNotesUpdated(externalNotes, false);
    });
    return subscribeVaultSyncState(setVaultSyncState);
  }, []);

  const handleReloadVault = async () => {
    const res = await pullVaultDbFromFolder();
    if (res.success && res.notes) {
      handleNotesUpdated(res.notes, false);
    }
    return res;
  };

  const handleChangeVaultFolder = async () => {
    const res = await chooseVaultFolder();
    if (res.success) {
      if (res.isFresh) {
        handleNotesUpdated([], true);
      } else if (res.loadedNotes) {
        handleNotesUpdated(res.loadedNotes, true);
      }
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [notes]);

  useEffect(() => {
    try {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig));
      if (aiConfig.apiKey && aiConfig.apiKey.trim()) {
        localStorage.setItem('LL_GEMINI_API_KEY', aiConfig.apiKey.trim());
      } else {
        localStorage.removeItem('LL_GEMINI_API_KEY');
      }
    } catch {}
  }, [aiConfig]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCurrentMode(prev => prev === 'search' ? 'pages' : 'search');
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoForward();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      } else if (e.key === 'Escape') {
        if (isFocusMode) {
          setIsFocusMode(false);
        } else if (currentMode === 'search') {
          setCurrentMode('pages');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, isFocusMode, currentMode]);

  const handleEnsurePageExists = (title: string): Note | undefined => {
    const cleanTitle = (title || '').trim();
    if (!cleanTitle || cleanTitle.toLowerCase() === 'pagename' || cleanTitle.toLowerCase() === 'page name') {
      return undefined;
    }
    const existing = notes.find(n => (n.title || '').toLowerCase() === cleanTitle.toLowerCase());
    if (existing) return existing;

    const initialTags = extractTags(cleanTitle);

    const newPage: Note = {
      id: `wiki-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'wiki',
      title: cleanTitle,
      content: '',
      tags: initialTags,
      links: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setNotes(prev => [newPage, ...prev]);
    saveNoteToSql(newPage).catch(e => console.warn('[SQLite] save error:', e));
    return newPage;
  };

  const navigateToNote = (titleOrId: string) => {
    const clean = (titleOrId || '').trim();
    if (!clean || clean.toLowerCase() === 'pagename' || clean.toLowerCase() === 'page name') {
      return;
    }

    let target = notes.find(n => n.id === clean);
    if (!target) {
      target = notes.find(n => (n.title || '').toLowerCase() === clean.toLowerCase());
    }

    if (target) {
      setActiveNoteId(target.id);
      setCurrentMode(target.type === 'wiki' ? 'notes' : target.type === 'journal' ? 'journals' : 'quick');

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(target.id);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      const initialTags = extractTags(clean);
      const newNote: Note = {
        id: `wiki-${Date.now()}`,
        type: 'wiki',
        title: clean,
        content: '',
        tags: initialTags,
        links: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setNotes(prev => [newNote, ...prev]);
      saveNoteToSql(newNote).catch(e => console.warn('[SQLite] save error:', e));
      setActiveNoteId(newNote.id);
      setCurrentMode('notes');

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newNote.id);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const noteId = history[prevIndex];
      setActiveNoteId(noteId);
      const target = notes.find(n => n.id === noteId);
      if (target) setCurrentMode(target.type === 'wiki' ? 'notes' : target.type === 'journal' ? 'journals' : 'quick');
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const noteId = history[nextIndex];
      setActiveNoteId(noteId);
      const target = notes.find(n => n.id === noteId);
      if (target) setCurrentMode(target.type === 'wiki' ? 'notes' : target.type === 'journal' ? 'journals' : 'quick');
    }
  };

  const handleUpdateNote = (id: string, partial: Partial<Note>) => {
    setNotes(prev => prev.map(note => {
      if (note.id !== id) return note;

      const cleanContent = partial.content !== undefined
        ? partial.content.replace(/\\+\[\\+\[/g, '[[').replace(/\\+\]\\+\]/g, ']]')
        : note.content;
      const cleanTitle = partial.title !== undefined 
        ? (partial.title.trim() || 'Untitled Page') 
        : note.title;

      // Dynamically determine updated tags
      let updatedTags = note.tags || [];
      if (partial.tags !== undefined) {
        updatedTags = partial.tags;
      } else if (partial.content !== undefined || partial.title !== undefined) {
        // Re-extract tags dynamically from updated content and title
        const extracted = extractTags(cleanContent, cleanTitle);
        // Retain valid tags from existing note/summary, but purge phantom #Draft or #New
        const summaryTags = (note.summary?.tags || []).filter(t => {
          const lower = (t || '').toLowerCase().trim();
          return lower !== '#draft' && lower !== '#new';
        });
        const combined = Array.from(new Set([...extracted, ...summaryTags]));
        updatedTags = combined.filter(t => {
          const lower = (t || '').toLowerCase().trim();
          if (lower === '#draft' || lower === '#new' || lower === 'draft' || lower === 'new') {
            return extracted.some(et => et.toLowerCase() === lower);
          }
          return true;
        });
      }

      const updated = {
        ...note,
        ...partial,
        title: cleanTitle,
        content: cleanContent,
        tags: updatedTags,
        updatedAt: Date.now()
      };

      if (partial.content !== undefined || partial.title !== undefined) {
        updated.links = extractWikiLinks(cleanContent);
      }
      saveNoteToSql(updated).catch(e => console.warn('[SQLite] save error:', e));
      return updated;
    }));
  };

  const handleCreateNewWikiPage = (customTitle?: string, customContent?: string) => {
    const title = customTitle?.trim() || 'Untitled Page';
    const content = customContent !== undefined ? customContent : '';
    const initialTags = extractTags(content, title);
    const newPage: Note = {
      id: `wiki-${Date.now()}`,
      type: 'wiki',
      title,
      content,
      tags: initialTags,
      links: extractWikiLinks(content),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setNotes(prev => [newPage, ...prev]);
    saveNoteToSql(newPage).catch(e => console.warn('[SQLite] save error:', e));
    setActiveNoteId(newPage.id);
    setCurrentMode('notes');

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPage.id);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleAddQuickNote = (content: string) => {
    const tags = extractTags(content);
    const links = extractWikiLinks(content);
    const newQuickNote: Note = {
      id: `quick-${Date.now()}`,
      type: 'quick',
      title: `Quick note: ${content.slice(0, 32)}...`,
      content,
      tags,
      links,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setNotes(prev => [newQuickNote, ...prev]);
    saveNoteToSql(newQuickNote).catch(e => console.warn('[SQLite] save error:', e));
  };

  const handleUpdateQuickNote = (id: string, newContent: string) => {
    const cleanContent = newContent.trim();
    if (!cleanContent) return;
    const newTags = extractTags(cleanContent);
    const newLinks = extractWikiLinks(cleanContent);
    const firstLine = cleanContent.split('\n')[0].replace(/^[#\-*\s]+/, '').trim();
    const cleanTitle = `Quick note: ${firstLine ? firstLine.slice(0, 32) : cleanContent.slice(0, 32)}...`;

    handleUpdateNote(id, {
      content: cleanContent,
      title: cleanTitle,
      tags: newTags,
      links: newLinks
    });
  };

  const handlePromoteQuickNote = (qNote: Note) => {
    let cleanTitle = (qNote.title || '').replace(/^Quick note:\s*/i, '').replace(/\.\.\.$/, '').trim();
    if (!cleanTitle || cleanTitle.toLowerCase() === 'quick note') {
      const firstLine = (qNote.content || '').split('\n')[0].replace(/^[#\-*\s]+/, '').trim();
      cleanTitle = firstLine ? firstLine.slice(0, 50) : 'New Page';
    }
    handleUpdateNote(qNote.id, {
      type: 'wiki',
      title: cleanTitle
    });
    setActiveNoteId(qNote.id);
    setCurrentMode('notes');
  };

  const handleDeleteQuickNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    deleteNoteFromSql(id).catch(e => console.warn('[SQLite] delete error:', e));
  };

  const handleSaveJournal = (dateKey: string, content: string, title?: string) => {
    const cleanContent = content.trim();
    const extractedTags = extractTags(cleanContent);
    const extractedLinks = extractWikiLinks(cleanContent);
    const id = `journal-${dateKey}`;
    const noteTitle = title || dateKey;

    const existing = notes.find(n => n.id === id);
    if (existing) {
      handleUpdateNote(id, {
        content: cleanContent,
        tags: extractedTags,
        links: extractedLinks,
        title: noteTitle,
        updatedAt: Date.now()
      });
    } else {
      const newJournalNote: Note = {
        id,
        type: 'journal',
        title: noteTitle,
        content: cleanContent,
        tags: extractedTags,
        links: extractedLinks,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setNotes(prev => [newJournalNote, ...prev]);
      saveNoteToSql(newJournalNote).catch(e => console.warn('[SQLite] save journal error:', e));
    }
  };

  const handleDeleteJournal = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    deleteNoteFromSql(id).catch(e => console.warn('[SQLite] delete journal error:', e));
  };

  const handleDeleteWikiPage = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    deleteNoteFromSql(id).catch(e => console.warn('[SQLite] delete page error:', e));

    setHistory(prev => {
      const filtered = prev.filter(hId => hId !== id);
      return filtered;
    });
    setHistoryIndex(prev => Math.max(0, prev - 1));

    if (activeNoteId === id) {
      const remainingPages = notes.filter(n => n.type === 'wiki' && n.id !== id);
      if (remainingPages.length > 0) {
        setActiveNoteId(remainingPages[0].id);
      } else {
        setActiveNoteId('');
      }
      setCurrentMode('pages');
    }
  };

  const handleRefreshAISummary = async (id: string) => {
    const target = notes.find(n => n.id === id);
    if (!target) return;

    if (!hasGeminiKey) {
      setSummaryError(`${aiConfig.provider === 'openai' ? 'OpenAI' : 'Gemini'} API key is required. Please enter your API key in Settings.`);
      setCurrentMode('settings');
      return;
    }

    setIsSummaryLoading(true);
    setSummaryError(null);
    try {
      const summary = await generateNoteSummary(target, aiConfig);
      const cleanSummaryTags = (summary.tags || []).filter(t => {
        const lower = (t || '').toLowerCase().trim();
        return lower !== '#draft' && lower !== '#new';
      });
      const combinedTags = Array.from(new Set([...(target.tags || []), ...cleanSummaryTags])).filter(t => {
        const lower = (t || '').toLowerCase().trim();
        return lower !== '#draft' && lower !== '#new';
      });
      handleUpdateNote(id, { 
        summary: { ...summary, tags: cleanSummaryTags },
        tags: combinedTags
      });
    } catch (err: any) {
      setSummaryError(err?.message || 'Failed to generate summary with AI API.');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleResetSeedData = async () => {
    try {
      const freshNotes = await resetSqliteToSeed();
      setNotes(freshNotes);
    } catch {
      setNotes(HARRY_POTTER_SEED_NOTES);
    }
    setActiveNoteId('wiki-code-showcase');
    setHistory(['wiki-code-showcase']);
    setHistoryIndex(0);
    setCurrentMode('pages');
  };

  const handleLoadDemoNotes = async () => {
    try {
      const updatedNotes = await loadDemoShowcaseNotes();
      handleNotesUpdated(updatedNotes);
      setActiveNoteId('wiki-code-showcase');
      setHistory(prev => [...prev, 'wiki-code-showcase']);
      setHistoryIndex(prev => prev + 1);
      setCurrentMode('notes');
    } catch (err) {
      console.warn('[DemoNotes] Error loading demo showcase:', err);
    }
  };

  const wikiNotes = notes.filter(n => n.type === 'wiki');
  const quickNotes = notes.filter(n => n.type === 'quick');
  const journalNotes = notes.filter(n => n.type === 'journal');
  const activeNote = notes.find(n => n.id === activeNoteId) || (activeNoteId ? undefined : (wikiNotes[0] || notes[0]));
  const graphData = buildKnowledgeGraph(notes);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-zinc-50">
      {/* 1. LEFT PANE: Master Navigation & Mode Switcher (Fixed menu buttons, no nested expanding lists) */}
      {!isFocusMode && (
        <>
          {!isSidebarCollapsed ? (
            <div className="hidden md:flex h-full">
              <Sidebar
                currentMode={currentMode}
                onSelectMode={switchMode}
                canGoBack={historyIndex > 0}
                canGoForward={historyIndex < history.length - 1}
                onGoBack={handleGoBack}
                onGoForward={handleGoForward}
                notesCount={wikiNotes.length}
                quickNotesCount={quickNotes.length}
                journalsCount={journalNotes.length}
                onToggleCollapse={() => setIsSidebarCollapsed(true)}
                syncConfigured={vaultSyncState?.isConfigured}
                syncFolderName={vaultSyncState?.folderName}
                onChangeVaultFolder={handleChangeVaultFolder}
                theme={theme}
                onThemeChange={setTheme}
              />
            </div>
          ) : (
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="hidden md:flex items-center justify-center w-8 border-r border-zinc-800/80 bg-zinc-950 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
              title="Expand Sidebar (Ctrl+\)"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* 2. CENTER PANE: Active Workspace (Pages, Notes, Quick, Search, Graph, Settings) */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 relative">
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between px-3.5 h-12 border-b border-zinc-800 bg-zinc-950 shrink-0">
          {currentMode === 'notes' ? (
            /* Note Reading / Editing Mode Header */
            <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
              <button
                onClick={handleGoBack}
                disabled={historyIndex <= 0}
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 shrink-0"
                title="Previous Note"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleGoForward}
                disabled={historyIndex >= history.length - 1}
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 shrink-0"
                title="Next Note"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentMode('pages')}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 font-medium transition-colors shrink-0"
                title="Back to Pages List"
              >
                <FileText className="w-3 h-3 text-indigo-400" />
                <span>Pages</span>
              </button>
              {activeNote && (
                <span className="text-[11px] text-zinc-400 truncate flex-1 min-w-0 pl-1 font-medium">
                  {activeNote.title || 'Untitled'}
                </span>
              )}
            </div>
          ) : (
            /* Primary Workspace Modes (Pages, Quick, Search, Graph, Settings) */
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600/10 border border-indigo-500/30 text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs tracking-tight text-zinc-100">LatticeLedger</span>
                {currentMode !== 'pages' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 capitalize">
                    {currentMode === 'quick' ? 'Quick Notes' : currentMode === 'journals' ? 'Journals' : currentMode}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile 1-Tap Theme Switcher */}
            <button
              type="button"
              onClick={() => {
                const nextTheme: AppTheme = 
                  theme === 'dark' ? 'slate' : 
                  theme === 'slate' ? 'sepia' : 
                  theme === 'sepia' ? 'light' : 
                  'dark';
                setTheme(nextTheme);
              }}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
              title={`Active Theme: ${
                theme === 'dark' ? 'Obsidian Dark' : 
                theme === 'slate' ? 'Midnight Slate (Cool Dark)' : 
                theme === 'sepia' ? 'Warm Paper (Sepia)' : 
                'Modern Light'
              }. Tap to switch.`}
            >
              {theme === 'dark' && <Moon className="w-4 h-4 text-amber-400" />}
              {theme === 'slate' && <Compass className="w-4 h-4 text-cyan-400" />}
              {theme === 'sepia' && <BookOpen className="w-4 h-4 text-amber-600" />}
              {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
            </button>

            <button
              onClick={() => setCurrentMode(currentMode === 'settings' ? 'pages' : 'settings')}
              className={`p-1.5 rounded transition-colors ${
                currentMode === 'settings'
                  ? 'text-indigo-400 bg-zinc-900 border border-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content by Current View Mode */}
        <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
          {/* 0. JOURNALS VIEW: Logseq-style daily stream with recent dates at top */}
          {currentMode === 'journals' && (
            <JournalsView
              notes={notes}
              onSaveJournal={handleSaveJournal}
              onDeleteJournal={handleDeleteJournal}
              onNavigateToNote={navigateToNote}
              onTagClick={() => setCurrentMode('search')}
              allWikiPages={wikiNotes}
              allQuickNotes={quickNotes}
            />
          )}

          {/* 1. PAGES VIEW: Lists all wiki page names with AI summaries (or just names if no summary) */}
          {currentMode === 'pages' && (
            <PagesView
              pages={wikiNotes}
              onSelectPage={navigateToNote}
              onNewPage={() => handleCreateNewWikiPage()}
              onDeletePage={handleDeleteWikiPage}
              onLoadDemoPages={handleLoadDemoNotes}
              onRefreshVault={handleReloadVault}
              onTagClick={() => {
                setCurrentMode('search');
              }}
            />
          )}

          {/* 2. NOTES VIEW: In-Place Live WYSIWYG Editor for active note */}
          {currentMode === 'notes' && (
            <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden w-full h-full">
              {activeNote ? (
                <ErrorBoundary
                  fallbackTitle="Note Editor Recovered"
                  onReset={() => setCurrentMode('pages')}
                >
                  <NoteEditor
                    key={activeNote.id}
                    note={activeNote}
                    allNotes={notes}
                    onUpdateNote={(partial) => handleUpdateNote(activeNote.id, partial)}
                    onRefreshSummary={() => handleRefreshAISummary(activeNote.id)}
                    isSummaryLoading={isSummaryLoading}
                    onNavigateToNote={navigateToNote}
                    onEnsurePageExists={handleEnsurePageExists}
                    onNewPage={() => handleCreateNewWikiPage()}
                    onDeletePage={handleDeleteWikiPage}
                    onTagClick={() => setCurrentMode('search')}
                    isFocusMode={isFocusMode}
                    onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
                    hasApiKey={hasGeminiKey}
                    onOpenSettings={() => setCurrentMode('settings')}
                    summaryError={summaryError}
                    onBackToPages={() => setCurrentMode('pages')}
                  />
                </ErrorBoundary>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-xs gap-3">
                  <FileText className="w-8 h-8 text-zinc-700" />
                  <span>No note selected.</span>
                  <button
                    onClick={() => setCurrentMode('pages')}
                    className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
                  >
                    View All Pages
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. QUICK NOTES VIEW: Stream of fleeting scratchpad notes */}
          {currentMode === 'quick' && (
            <QuickNotesFeed
              quickNotes={quickNotes}
              onAddQuickNote={handleAddQuickNote}
              onUpdateQuickNote={handleUpdateQuickNote}
              onDeleteQuickNote={handleDeleteQuickNote}
              onPromoteToWiki={handlePromoteQuickNote}
              onTagClick={() => setCurrentMode('search')}
            />
          )}

          {/* 4. SEARCH VIEW: In-Place Middle Workspace Search & Ask AI (Not a popup modal!) */}
          {currentMode === 'search' && (
            <SearchView
              notes={notes}
              onSelectNote={navigateToNote}
              aiConfig={aiConfig}
              onOpenSettings={() => setCurrentMode('settings')}
              onBackToPages={() => setCurrentMode('pages')}
            />
          )}

          {/* 5. KNOWLEDGE GRAPH VIEW: 2D Interactive Force-Directed Graph */}
          {currentMode === 'graph' && (
            <KnowledgeGraphView
              graphData={graphData}
              onSelectNode={navigateToNote}
              theme={theme}
            />
          )}

          {/* 6. SETTINGS VIEW: Directly inside middle space */}
          {currentMode === 'settings' && (
            <SettingsModal
              config={aiConfig}
              onSaveConfig={setAiConfig}
              onResetSeedData={handleResetSeedData}
              notes={notes}
              onNotesUpdated={handleNotesUpdated}
              theme={theme}
              onThemeChange={setTheme}
              onClose={() => setCurrentMode(previousMode === 'settings' ? 'pages' : previousMode)}
              returnModeLabel={previousMode === 'notes' ? (activeNote?.title || 'Note') : previousMode === 'graph' ? 'Graph' : previousMode === 'quick' ? 'Quick Notes' : previousMode === 'journals' ? 'Journals' : 'Pages'}
            />
          )}
        </div>
      </main>

      {/* 3. RIGHT PANE: Kept empty / reserved per specification with collapse button */}
      {!isFocusMode && <RightPane />}

      {/* Floating Focus Mode Banner */}
      {isFocusMode && (
        <div className="fixed top-3 right-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/95 border border-indigo-500/40 text-xs text-zinc-200 backdrop-blur-md shadow-2xl animate-in fade-in duration-200">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-medium text-[11px]">Focus Mode Active</span>
          <button
            onClick={() => setIsFocusMode(false)}
            className="ml-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-colors"
            title="Exit Focus Mode (Esc)"
          >
            <span>Exit (Esc)</span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar & FAB */}
      <MobileBottomNav
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onOpenQuickCapture={() => {
          setNewNoteModalType(currentMode === 'quick' ? 'quick' : 'wiki');
          setIsQuickCaptureOpen(true);
        }}
      />

      {/* Mobile Create Bottom Sheet (Wiki Page vs Quick Scratchpad) */}
      {isQuickCaptureOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-xl bg-zinc-900 border-t border-zinc-800 p-4 shadow-2xl">
            {/* Header Tabs */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setNewNoteModalType('wiki')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    newNoteModalType === 'wiki'
                      ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+ New Page</span>
                </button>
                <button
                  onClick={() => setNewNoteModalType('quick')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    newNoteModalType === 'quick'
                      ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick Note</span>
                </button>
              </div>

              <button
                onClick={() => setIsQuickCaptureOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newNoteModalType === 'wiki' ? (
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  placeholder="Page Title (e.g. Artificial Intelligence, Hogwarts)..."
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                  autoFocus
                />
                <textarea
                  value={mobileQuickText}
                  onChange={(e) => setMobileQuickText(e.target.value)}
                  placeholder="Initial page content or thoughts... (supports [[links]])"
                  className="w-full h-24 p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs placeholder-zinc-600 focus:outline-none resize-none focus:border-indigo-500/50"
                />
                <button
                  onClick={() => {
                    handleCreateNewWikiPage(
                      newPageTitle.trim() || undefined,
                      mobileQuickText.trim() ? mobileQuickText.trim() : undefined
                    );
                    setNewPageTitle('');
                    setMobileQuickText('');
                    setIsQuickCaptureOpen(false);
                  }}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create & Open Wiki Page</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <textarea
                  value={mobileQuickText}
                  onChange={(e) => setMobileQuickText(e.target.value)}
                  placeholder="Capture fleeting thought on the go... (Auto-extracts #tags)"
                  className="w-full h-24 p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs placeholder-zinc-600 focus:outline-none resize-none focus:border-amber-500/50"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (mobileQuickText.trim()) {
                      handleAddQuickNote(mobileQuickText);
                      setMobileQuickText('');
                      setIsQuickCaptureOpen(false);
                    }
                  }}
                  className="w-full py-2.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-white transition-colors shadow-sm active:scale-95"
                >
                  <span>Save Quick Note</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
