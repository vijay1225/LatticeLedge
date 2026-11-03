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
  Sparkles
} from 'lucide-react';

const STORAGE_KEY = 'LATTICE_LEDGER_NOTES_V1';
const AI_CONFIG_KEY = 'LATTICE_LEDGER_AI_CONFIG';

export function App() {
  // Load notes from localStorage or seed
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }
    return HARRY_POTTER_SEED_NOTES;
  });

  // AI Provider configuration
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

  // Active state
  const [currentMode, setCurrentMode] = useState<ViewMode>('notes');
  const [activeNoteId, setActiveNoteId] = useState<string>('wiki-harry-potter');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [mobileQuickText, setMobileQuickText] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // Note History Navigation (< and > like Obsidian / Logseq)
  const [history, setHistory] = useState<string[]>(['wiki-harry-potter']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sync to localStorage
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

  // Global Keyboard Shortcuts (Ctrl+K for Search, Alt+Left/Right for History)
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Navigate to Note with History Stack
  const navigateToNote = (titleOrId: string) => {
    let target = notes.find(n => n.id === titleOrId);
    if (!target) {
      target = notes.find(n => n.title.toLowerCase() === titleOrId.toLowerCase());
    }

    if (target) {
      setActiveNoteId(target.id);
      setCurrentMode(target.type === 'wiki' ? 'notes' : 'quick');

      // Update history stack (truncate forward history if navigating to new note)
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(target.id);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      // If note doesn't exist, create a new Wiki Page with this title (wiki-link creation pattern!)
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

  // Note updates
  const handleUpdateNote = (id: string, partial: Partial<Note>) => {
    setNotes(prev => prev.map(note => {
      if (note.id !== id) return note;

      const updated = { ...note, ...partial, updatedAt: Date.now() };
      // Auto-extract links if content changed
      if (partial.content !== undefined) {
        updated.links = extractWikiLinks(partial.content);
      }
      return updated;
    }));
  };

  // Create new Wiki Page
  const handleCreateNewWikiPage = () => {
    const newPage: Note = {
      id: `wiki-${Date.now()}`,
      type: 'wiki',
      title: 'New Page',
      content: '# New Page\n\nStart writing your thoughts here...',
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

  // Add Quick Note
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

  // Promote Quick Note to full Wiki Page
  const handlePromoteQuickNote = (qNote: Note) => {
    handleUpdateNote(qNote.id, {
      type: 'wiki',
      title: qNote.title.replace(/^Quick note:\s*/, '')
    });
    setActiveNoteId(qNote.id);
    setCurrentMode('notes');
  };

  // Delete Quick Note
  const handleDeleteQuickNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  // Refresh AI Summary
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

  // Reset to Harry Potter seed data
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
    <div className="flex h-screen w-screen overflow-hidden bg-stone-950 text-stone-100 font-sans">
      {/* 1. LEFT PANE: Master Navigation & Mode Switcher */}
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
        />
      </div>

      {/* 2. CENTER PANE: Active Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-stone-950/70">
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-stone-950/90 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleGoBack}
              disabled={historyIndex <= 0}
              className="p-1 rounded text-stone-400 hover:text-stone-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleGoForward}
              disabled={historyIndex >= history.length - 1}
              className="p-1 rounded text-stone-400 hover:text-stone-100 disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm text-stone-100 ml-1">LatticeLedger</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Cloud Synced" />
            <button
              onClick={() => setCurrentMode('settings')}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content by Current View Mode */}
        <div className="flex-1 flex overflow-hidden">
          {currentMode === 'notes' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Secondary Notes List column for fast selection */}
              <div className="w-64 border-r border-stone-800/80 bg-stone-950/50 hidden lg:flex flex-col h-full shrink-0">
                <div className="p-3 border-b border-stone-800/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Pages ({wikiNotes.length})
                  </span>
                  <button
                    onClick={handleCreateNewWikiPage}
                    className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-300"
                    title="Add Page"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {wikiNotes.map(n => (
                    <button
                      key={n.id}
                      onClick={() => navigateToNote(n.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${
                        activeNote?.id === n.id
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                          : 'text-stone-400 hover:bg-stone-900/80 hover:text-stone-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{n.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Note Editor with Per-Note AI Summary Card above */}
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
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-stone-500 text-sm">
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

      {/* 3. RIGHT PANE: Kept empty / reserved per user instruction */}
      <RightPane />

      {/* Mobile Bottom Navigation Bar & FAB */}
      <MobileBottomNav
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
      />

      {/* Mobile Quick Capture Bottom Sheet */}
      {isQuickCaptureOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-2xl bg-stone-900 border-t border-stone-800 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Quick Capture</span>
              </span>
              <button
                onClick={() => setIsQuickCaptureOpen(false)}
                className="p-1 rounded text-stone-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={mobileQuickText}
              onChange={(e) => setMobileQuickText(e.target.value)}
              placeholder="Capture thought on the go..."
              className="w-full h-24 p-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm placeholder-stone-500 focus:outline-none mb-3"
            />
            <button
              onClick={() => {
                if (mobileQuickText.trim()) {
                  handleAddQuickNote(mobileQuickText);
                  setMobileQuickText('');
                  setIsQuickCaptureOpen(false);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2"
            >
              <span>Save Quick Note</span>
              <Send className="w-3.5 h-3.5" />
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
