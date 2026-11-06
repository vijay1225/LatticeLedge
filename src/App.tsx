import { useState, useEffect } from 'react';
import { 
  Note, 
  ViewMode, 
  AIProviderConfig 
} from './types';
import { HARRY_POTTER_SEED_NOTES } from './services/harryPotterSeed';
import { buildKnowledgeGraph } from './utils/graphBuilder';
import { generateNoteSummary, isGeminiKeyConfigured } from './services/aiService';
import { extractWikiLinks } from './utils/wikiLinks';
import { 
  getAllNotesFromSql, 
  saveNoteToSql, 
  deleteNoteFromSql, 
  resetSqliteToSeed 
} from './services/sqliteService';
import { initVaultSync } from './services/vaultSyncService';

import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { QuickNotesFeed } from './components/QuickNotesFeed';
import { KnowledgeGraphView } from './components/KnowledgeGraphView';
import { SearchModal } from './components/SearchModal';
import { SettingsModal } from './components/SettingsModal';
import { RightPane } from './components/RightPane';
import { MobileBottomNav } from './components/MobileBottomNav';

import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings as SettingsIcon,
  X,
  Send,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Zap
} from 'lucide-react';

const STORAGE_KEY = 'LATTICE_LEDGER_NOTES_V1';
const AI_CONFIG_KEY = 'LATTICE_LEDGER_AI_CONFIG';

export function App() {
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>(() => {
    try {
      const saved = localStorage.getItem(AI_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Automatically upgrade deprecated models to modern standard
        if (parsed.modelName === 'gemini-2.5-flash') {
          parsed.modelName = 'gemini-3.8-flash';
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
          // If no key configured, ensure no old fake summaries remain
          return savedKey ? parsed : parsed.map((n: Note) => ({ ...n, summary: undefined }));
        }
      }
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }
    return HARRY_POTTER_SEED_NOTES;
  });

  const [currentMode, setCurrentMode] = useState<ViewMode>('notes');
  const [activeNoteId, setActiveNoteId] = useState<string>('wiki-harry-potter');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [mobileQuickText, setMobileQuickText] = useState('');
  const [isMobilePagesOpen, setIsMobilePagesOpen] = useState(false);
  const [newNoteModalType, setNewNoteModalType] = useState<'wiki' | 'quick'>('wiki');
  const [newPageTitle, setNewPageTitle] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showPagesList, setShowPagesList] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const hasGeminiKey = isGeminiKeyConfigured(aiConfig);

  // Note History Navigation (< and > like Obsidian / Logseq)
  const [history, setHistory] = useState<string[]>(['wiki-harry-potter']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Load notes directly from SQLite database on mount
  useEffect(() => {
    getAllNotesFromSql().then(sqlNotes => {
      if (sqlNotes && sqlNotes.length > 0) {
        const hasKey = isGeminiKeyConfigured(aiConfig);
        const sanitized = hasKey ? sqlNotes : sqlNotes.map(n => ({ ...n, summary: undefined }));
        setNotes(sanitized);
      }
    }).catch(err => {
      console.warn('[SQLite] Fallback to cache:', err);
    });
  }, [hasGeminiKey]);

  // Initialize unified Vault Folder Sync (Google Drive / local directory)
  useEffect(() => {
    initVaultSync((externalNotes) => {
      console.log('[App] Vault updated externally from folder/Drive, reloading notes...');
      setNotes(externalNotes);
    });
  }, []);

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
        setIsSearchOpen(prev => !prev);
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoForward();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      } else if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, isFocusMode]);

  const navigateToNote = (titleOrId: string) => {
    let target = notes.find(n => n.id === titleOrId);
    if (!target) {
      target = notes.find(n => n.title.toLowerCase() === titleOrId.toLowerCase());
    }

    if (target) {
      setActiveNoteId(target.id);
      setCurrentMode(target.type === 'wiki' ? 'notes' : 'quick');

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(target.id);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      const newNote: Note = {
        id: `wiki-${Date.now()}`,
        type: 'wiki',
        title: titleOrId,
        content: `# ${titleOrId}\n\nStart writing notes about ${titleOrId}...`,
        tags: ['#New'],
        links: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setNotes(prev => [newNote, ...prev]);
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
      if (target) setCurrentMode(target.type === 'wiki' ? 'notes' : 'quick');
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const noteId = history[nextIndex];
      setActiveNoteId(noteId);
      const target = notes.find(n => n.id === noteId);
      if (target) setCurrentMode(target.type === 'wiki' ? 'notes' : 'quick');
    }
  };

  const handleUpdateNote = (id: string, partial: Partial<Note>) => {
    setNotes(prev => prev.map(note => {
      if (note.id !== id) return note;

      const updated = { ...note, ...partial, updatedAt: Date.now() };
      if (partial.content !== undefined) {
        updated.links = extractWikiLinks(partial.content);
      }
      saveNoteToSql(updated).catch(e => console.warn('[SQLite] save error:', e));
      return updated;
    }));
  };

  const handleCreateNewWikiPage = (customTitle?: string, customContent?: string) => {
    const title = customTitle?.trim() || 'Untitled Page';
    const content = customContent || `# ${title}\n\nStart writing your thoughts here...`;
    const newPage: Note = {
      id: `wiki-${Date.now()}`,
      type: 'wiki',
      title,
      content,
      tags: ['#Draft'],
      links: extractWikiLinks(content),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setNotes(prev => [newPage, ...prev]);
    saveNoteToSql(newPage).catch(e => console.warn('[SQLite] save error:', e));
    setActiveNoteId(newPage.id);
    setCurrentMode('notes');
    setIsMobilePagesOpen(false);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPage.id);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleAddQuickNote = (content: string) => {
    const tags = Array.from(new Set(content.match(/#\w+/g) || ['#Quick']));
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

  const handlePromoteQuickNote = (qNote: Note) => {
    handleUpdateNote(qNote.id, {
      type: 'wiki',
      title: qNote.title.replace(/^Quick note:\s*/, '')
    });
    setActiveNoteId(qNote.id);
    setCurrentMode('notes');
  };

  const handleDeleteQuickNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    deleteNoteFromSql(id).catch(e => console.warn('[SQLite] delete error:', e));
  };

  const handleRefreshAISummary = async (id: string) => {
    const target = notes.find(n => n.id === id);
    if (!target) return;

    if (!hasGeminiKey) {
      setSummaryError('Gemini API key is required. Please enter your API key in Settings.');
      setCurrentMode('settings');
      return;
    }

    setIsSummaryLoading(true);
    setSummaryError(null);
    try {
      const summary = await generateNoteSummary(target, aiConfig);
      handleUpdateNote(id, { summary });
    } catch (err: any) {
      setSummaryError(err?.message || 'Failed to generate summary with Gemini API.');
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
    setActiveNoteId('wiki-harry-potter');
    setHistory(['wiki-harry-potter']);
    setHistoryIndex(0);
    setCurrentMode('notes');
  };

  const wikiNotes = notes.filter(n => n.type === 'wiki');
  const quickNotes = notes.filter(n => n.type === 'quick');
  const activeNote = notes.find(n => n.id === activeNoteId) || wikiNotes[0] || notes[0];
  const graphData = buildKnowledgeGraph(notes);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
      {/* 1. LEFT PANE: Master Navigation & Mode Switcher */}
      {!isFocusMode && (
        <>
          {!isSidebarCollapsed ? (
            <div className="hidden md:flex h-full">
              <Sidebar
                currentMode={currentMode}
                onSelectMode={setCurrentMode}
                canGoBack={historyIndex > 0}
                canGoForward={historyIndex < history.length - 1}
                onGoBack={handleGoBack}
                onGoForward={handleGoForward}
                onOpenSearch={() => setIsSearchOpen(true)}
                onNewWikiPage={handleCreateNewWikiPage}
                notesCount={wikiNotes.length}
                quickNotesCount={quickNotes.length}
                onToggleCollapse={() => setIsSidebarCollapsed(true)}
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

      {/* 2. CENTER PANE: Active Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 relative">
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between px-3 h-12 border-b border-zinc-800 bg-zinc-950 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleGoBack}
              disabled={historyIndex <= 0}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
              title="Previous Note"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleGoForward}
              disabled={historyIndex >= history.length - 1}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
              title="Next Note"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsMobilePagesOpen(prev => !prev)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-300 hover:text-white"
              title="View all Pages"
            >
              <FileText className="w-3 h-3 text-indigo-400" />
              <span>Pages ({wikiNotes.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCreateNewWikiPage()}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-medium text-[11px] active:scale-95 transition-all shadow-sm"
              title="Create New Page"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Page</span>
            </button>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Cloud Synced" />
            <button
              onClick={() => setCurrentMode('settings')}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content by Current View Mode */}
        <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
          {currentMode === 'notes' && (
            <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
              {/* Collapsible Secondary Pages List */}
              {!isFocusMode && (
                showPagesList ? (
                  <div className="w-56 border-r border-zinc-800/80 bg-zinc-950/60 hidden lg:flex flex-col h-full shrink-0 text-xs">
                    <div className="h-12 px-3 border-b border-zinc-800/60 flex items-center justify-between text-zinc-500">
                      <span className="font-medium text-[11px] uppercase tracking-wider">
                        Pages ({wikiNotes.length})
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCreateNewWikiPage()}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200"
                          title="New Page"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setShowPagesList(false)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200"
                          title="Collapse Pages List"
                        >
                          <PanelLeftClose className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                      {wikiNotes.map(n => (
                        <button
                          key={n.id}
                          onClick={() => navigateToNote(n.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                            activeNote?.id === n.id
                              ? 'bg-zinc-800 text-zinc-100 font-medium'
                              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span className="truncate">{n.title}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPagesList(true)}
                    className="hidden lg:flex items-center justify-center w-8 border-r border-zinc-800/80 bg-zinc-950 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
                    title="Show Pages List"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                )
              )}

              {/* Expansive Active Note Editor */}
              {activeNote ? (
                <NoteEditor
                  key={activeNote.id}
                  note={activeNote}
                  allNotes={notes}
                  onUpdateNote={(partial) => handleUpdateNote(activeNote.id, partial)}
                  onRefreshSummary={() => handleRefreshAISummary(activeNote.id)}
                  isSummaryLoading={isSummaryLoading}
                  onNavigateToNote={navigateToNote}
                  onNewPage={() => handleCreateNewWikiPage()}
                  onTagClick={() => {
                    setIsSearchOpen(true);
                  }}
                  isFocusMode={isFocusMode}
                  onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
                  hasApiKey={hasGeminiKey}
                  onOpenSettings={() => setCurrentMode('settings')}
                  summaryError={summaryError}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs">
                  Select or create a page to begin.
                </div>
              )}
            </div>
          )}

          {currentMode === 'quick' && (
            <QuickNotesFeed
              quickNotes={quickNotes}
              onAddQuickNote={handleAddQuickNote}
              onDeleteQuickNote={handleDeleteQuickNote}
              onPromoteToWiki={handlePromoteQuickNote}
              onTagClick={() => setIsSearchOpen(true)}
            />
          )}

          {currentMode === 'graph' && (
            <KnowledgeGraphView
              graphData={graphData}
              onSelectNode={navigateToNote}
            />
          )}

          {currentMode === 'settings' && (
            <SettingsModal
              config={aiConfig}
              onSaveConfig={setAiConfig}
              onResetSeedData={handleResetSeedData}
              notes={notes}
              onNotesUpdated={setNotes}
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
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenQuickCapture={() => {
          setNewNoteModalType(currentMode === 'quick' ? 'quick' : 'wiki');
          setIsQuickCaptureOpen(true);
        }}
      />

      {/* Mobile Pages Drawer Modal */}
      {isMobilePagesOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm pt-14 px-3 pb-20 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[75vh] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-950/80">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Wiki Pages ({wikiNotes.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    handleCreateNewWikiPage();
                    setIsMobilePagesOpen(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/40 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Page</span>
                </button>
                <button
                  onClick={() => setIsMobilePagesOpen(false)}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {wikiNotes.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    navigateToNote(n.id);
                    setIsMobilePagesOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    activeNote?.id === n.id
                      ? 'bg-zinc-800 text-indigo-300 font-medium border border-indigo-500/20'
                      : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{n.title}</span>
                  </div>
                  {n.links?.length > 0 && (
                    <span className="text-[10px] text-zinc-600 shrink-0 font-mono">
                      {n.links.length} 🔗
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
                      mobileQuickText.trim() ? `# ${newPageTitle.trim() || 'Untitled Page'}\n\n${mobileQuickText.trim()}` : undefined
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

      {/* Global Search Modal (Dual-Tab: Instant Search vs. Ask AI) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        notes={notes}
        onSelectNote={navigateToNote}
        aiConfig={aiConfig}
        onOpenSettings={() => setCurrentMode('settings')}
      />
    </div>
  );
}
export default App;
