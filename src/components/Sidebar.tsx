import React from 'react';
import { 
  FileText, 
  Zap, 
  Network, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Sparkles,
  Layers,
  PanelLeftClose
} from 'lucide-react';
import { ViewMode, Note } from '../types';

interface SidebarProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onOpenSearch: () => void;
  notesCount: number;
  quickNotesCount: number;
  onToggleCollapse?: () => void;
  pages?: Note[];
  quickNotes?: Note[];
  activeNoteId?: string;
  onSelectNote?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMode,
  onSelectMode,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onOpenSearch,
  notesCount,
  quickNotesCount,
  onToggleCollapse,
  pages = [],
  quickNotes = [],
  activeNoteId,
  onSelectNote
}) => {
  return (
    <aside className="w-64 border-r border-zinc-800/80 bg-zinc-950 flex flex-col h-full shrink-0 select-none text-xs">
      {/* Top App Header & History Navigation */}
      <div className="h-12 px-3 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-200">
            <Layers className="w-3 h-3 text-zinc-300" />
          </div>
          <span className="font-semibold text-zinc-200 tracking-tight text-xs">
            LatticeLedger
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* History Navigation: < and > arrows (Obsidian / Logseq style) */}
          <div className="flex items-center bg-zinc-900 rounded border border-zinc-800 p-0.5">
            <button
              onClick={onGoBack}
              disabled={!canGoBack}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-25 transition-colors"
              title="Back (Alt+Left)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-2.5 bg-zinc-800 mx-0.5" />
            <button
              onClick={onGoForward}
              disabled={!canGoForward}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-25 transition-colors"
              title="Forward (Alt+Right)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Collapse Sidebar (Ctrl+\)"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {/* 1. Search Option (Kept cleanly inside menu options) */}
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/90 border border-zinc-800/80 transition-all group"
          title="Search or Ask AI (Ctrl+K)"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
            <span className="font-medium text-xs">Search / Ask AI</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 text-[10px] text-zinc-500 font-mono border border-zinc-800">
            Ctrl+K
          </kbd>
        </button>

        <div className="pt-2 px-2 pb-1 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
          Workspace
        </div>

        {/* 2. Pages Option & Nested Pages List */}
        <div>
          <button
            onClick={() => onSelectMode('notes')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              currentMode === 'notes'
                ? 'bg-zinc-800/90 text-zinc-100 font-semibold border border-zinc-700/60'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Pages</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 font-mono">
              {notesCount}
            </span>
          </button>

          {/* Under Pages: Show pages list directly inside the menu pane! */}
          {currentMode === 'notes' && pages && pages.length > 0 && (
            <div className="mt-1 pl-2 pr-1 py-1 space-y-0.5 max-h-[45vh] overflow-y-auto border-l-2 border-zinc-800 ml-3">
              {pages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectNote?.(p.id);
                    onSelectMode('notes');
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2 ${
                    activeNoteId === p.id
                      ? 'bg-zinc-800/90 text-indigo-300 font-semibold border border-indigo-500/30'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                  title={p.title}
                >
                  <FileText className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="truncate">{p.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Quick Notes Option & Nested Quick Notes List */}
        <div>
          <button
            onClick={() => onSelectMode('quick')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              currentMode === 'quick'
                ? 'bg-zinc-800/90 text-zinc-100 font-semibold border border-zinc-700/60'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Notes</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 font-mono">
              {quickNotesCount}
            </span>
          </button>

          {/* Under Quick Notes: Show quick notes list directly inside the menu pane! */}
          {currentMode === 'quick' && quickNotes && quickNotes.length > 0 && (
            <div className="mt-1 pl-2 pr-1 py-1 space-y-0.5 max-h-[45vh] overflow-y-auto border-l-2 border-zinc-800 ml-3">
              {quickNotes.map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    onSelectNote?.(q.id);
                    onSelectMode('quick');
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2 ${
                    activeNoteId === q.id
                      ? 'bg-zinc-800/90 text-amber-300 font-semibold border border-amber-500/30'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                  title={q.title}
                >
                  <Zap className="w-3 h-3 text-amber-500/70 shrink-0" />
                  <span className="truncate">{q.title.replace(/^Quick note:\s*/, '')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Knowledge Graph */}
        <button
          onClick={() => onSelectMode('graph')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium transition-colors ${
            currentMode === 'graph'
              ? 'bg-zinc-800/90 text-zinc-100 font-semibold border border-zinc-700/60'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2">
            <Network className="w-3.5 h-3.5 text-zinc-400" />
            <span>Knowledge Graph</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">2D</span>
        </button>
      </nav>

      {/* Cloud Sync Status & Settings Footer */}
      <div className="p-2 border-t border-zinc-800/80 space-y-1">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-400">Vault SQLite</span>
          </div>
          <span className="text-[10px] text-zinc-500">Auto-Sync</span>
        </div>

        <button
          onClick={() => onSelectMode('settings')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
            currentMode === 'settings'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </div>
          <Sparkles className="w-3 h-3 text-zinc-500" />
        </button>
      </div>
    </aside>
  );
};
