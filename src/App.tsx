import { useState, useEffect } from 'react';
import { 
  Note, 
  ViewMode, 
  AIProviderConfig 
} from './types';
import { HARRY_POTTER_SEED_NOTES } from './services/harryPotterSeed';
import { buildKnowledgeGraph } from './utils/graphBuilder';
import { generateNoteSummary } from './services/aiService';
import { extractWikiLinks } from './utils/wikiLinks';

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
  PanelLeftOpen
} from 'lucide-react';

const STORAGE_KEY = 'LATTICE_LEDGER_NOTES_V1';
const AI_CONFIG_KEY = 'LATTICE_LEDGER_AI_CONFIG';

export function App() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }
    return HARRY_POTTER_SEED_NOTES;
  });

  const [aiConfig, setAiConfig] = useState<AIProviderConfig>(() => {
    try {
      const saved = localStorage.getItem(AI_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      provider: 'gemini',
      apiKey: '',
      modelName: 'gemini-2.5-flash'
    };
  });

  const [currentMode, setCurrentMode] = useState<ViewMode>('notes');
  const [activeNoteId, setActiveNoteId] = useState<string>('wiki-harry-potter');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [mobileQuickText, setMobileQuickText] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [showPagesList, setShowPagesList] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Note History Navigation (< and > like Obsidian / Logseq)
  const [history, setHistory] = useState<string[]>(['wiki-harry-potter']);
  const [historyIndex, setHistoryIndex] = useState(0);

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
      return updated;
    }));
  };

  const handleCreateNewWikiPage = () => {
    const newPage: Note = {
      id: `wiki-${Date.now()}`,
      type: 'wiki',
      title: 'Untitled Page',
      content: '# Untitled Page\n\nStart writing your thoughts here...',
      tags: ['#Draft'],
      links: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setNotes(prev => [newPage, ...prev]);
    setActiveNoteId(newPage.id);
    setCurrentMode('notes');

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
  };

  const handleRefreshAISummary = async (id: string) => {
    const target = notes.find(n => n.id === id);
    if (!target) return;

    setIsSummaryLoading(true);
    try {
      const summary = await generateNoteSummary(target, aiConfig);
      handleUpdateNote(id, { summary });
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleResetSeedData = () => {
    setNotes(HARRY_POTTER_SEED_NOTES);
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
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleGoForward}
              disabled={historyIndex >= history.length - 1}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="font-semibold text-xs text-zinc-200 ml-1">LatticeLedger</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Cloud Synced" />
            <button
              onClick={() => setCurrentMode('settings')}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content by Current View Mode */}
        <div className="flex-1 flex overflow-hidden">
          {currentMode === 'notes' && (
            <div className="flex-1 flex overflow-hidden">
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
                          onClick={handleCreateNewWikiPage}
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
                  note={activeNote}
                  allNotes={notes}
                  onUpdateNote={(partial) => handleUpdateNote(activeNote.id, partial)}
                  onRefreshSummary={() => handleRefreshAISummary(activeNote.id)}
                  isSummaryLoading={isSummaryLoading}
                  onNavigateToNote={navigateToNote}
                  onTagClick={() => {
                    setIsSearchOpen(true);
                  }}
                  isFocusMode={isFocusMode}
                  onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
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
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
      />

      {/* Mobile Quick Capture Bottom Sheet */}
      {isQuickCaptureOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-xl bg-zinc-900 border-t border-zinc-800 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Instant Quick Capture</span>
              </span>
              <button
                onClick={() => setIsQuickCaptureOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={mobileQuickText}
              onChange={(e) => setMobileQuickText(e.target.value)}
              placeholder="Capture fleeting thought on the go..."
              className="w-full h-24 p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs placeholder-zinc-600 focus:outline-none mb-3 resize-none"
            />
            <button
              onClick={() => {
                if (mobileQuickText.trim()) {
                  handleAddQuickNote(mobileQuickText);
                  setMobileQuickText('');
                  setIsQuickCaptureOpen(false);
                }
              }}
              className="w-full py-2 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-white"
            >
              <span>Save Note</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Global Search Modal (Dual-Tab: Instant Search vs. Ask AI) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        notes={notes}
        onSelectNote={navigateToNote}
      />
    </div>
  );
}
export default App;
