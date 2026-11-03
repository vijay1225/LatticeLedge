import React from 'react';
import { 
  FileText, 
  Zap, 
  Network, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search,
  Sparkles
} from 'lucide-react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onOpenSearch: () => void;
  onNewWikiPage: () => void;
  notesCount: number;
  quickNotesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMode,
  onSelectMode,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onOpenSearch,
  onNewWikiPage,
  notesCount,
  quickNotesCount
}) => {
  return (
    <aside className="w-64 border-r border-stone-800 bg-stone-950/90 flex flex-col h-full shrink-0 select-none">
      {/* Top Header & History Navigation */}
      <div className="p-3.5 border-b border-stone-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-stone-950 shadow-md shadow-amber-500/20 font-bold text-sm">
            ⚡
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-stone-100 flex items-center gap-1.5">
              LatticeLedger
            </div>
            <div className="text-[10px] text-amber-400/80 font-medium tracking-wider">
              AI KNOWLEDGE PKM
            </div>
          </div>
        </div>

        {/* History Navigation: < and > arrows (Logseq / Obsidian style) */}
        <div className="flex items-center bg-stone-900/90 rounded-lg border border-stone-800 p-0.5">
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous Note (Alt + Left)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-3 bg-stone-800 mx-0.5" />
          <button
            onClick={onGoForward}
            disabled={!canGoForward}
            className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next Note (Alt + Right)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Search Trigger */}
      <div className="p-3">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-800/80 border border-stone-800/80 text-stone-400 hover:text-stone-200 text-xs transition-all group shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 group-hover:text-amber-400 transition-colors" />
            <span>Search or Ask AI...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700/60 text-[10px] text-stone-400 font-mono">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Mode Switcher Menu */}
      <nav className="flex-1 px-3 space-y-1">
        <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
          Views & Modes
        </div>

        <button
          onClick={() => onSelectMode('notes')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            currentMode === 'notes'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
              : 'text-stone-300 hover:bg-stone-900/80 hover:text-stone-100 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileText className={`w-4 h-4 ${currentMode === 'notes' ? 'text-amber-400' : 'text-stone-400'}`} />
            <span>Wiki Pages</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-900 text-stone-400 border border-stone-800">
            {notesCount}
          </span>
        </button>

        <button
          onClick={() => onSelectMode('quick')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            currentMode === 'quick'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
              : 'text-stone-300 hover:bg-stone-900/80 hover:text-stone-100 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Zap className={`w-4 h-4 ${currentMode === 'quick' ? 'text-amber-400' : 'text-stone-400'}`} />
            <span>Quick Notes</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-900 text-stone-400 border border-stone-800">
            {quickNotesCount}
          </span>
        </button>

        <button
          onClick={() => onSelectMode('graph')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            currentMode === 'graph'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
              : 'text-stone-300 hover:bg-stone-900/80 hover:text-stone-100 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Network className={`w-4 h-4 ${currentMode === 'graph' ? 'text-amber-400' : 'text-stone-400'}`} />
            <span>Knowledge Graph</span>
          </div>
          <span className="text-[10px] text-amber-400/90 font-mono">2D</span>
        </button>

        <div className="pt-4 px-2 pb-1 text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
          Actions
        </div>

        <button
          onClick={onNewWikiPage}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Wiki Page</span>
        </button>
      </nav>

      {/* Cloud Sync Status & Settings Footer */}
      <div className="p-3 border-t border-stone-800/80 space-y-2 bg-stone-950/60">
        <div className="flex items-center justify-between px-2 text-[11px] text-stone-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-medium">Google Cloud</span>
          </div>
          <span className="text-[10px] text-stone-500">Synced</span>
        </div>

        <button
          onClick={() => onSelectMode('settings')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
            currentMode === 'settings'
              ? 'bg-stone-800 text-stone-100 border border-stone-700'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>Settings & Models</span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>
    </aside>
  );
};
