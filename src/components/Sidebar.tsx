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
  Sparkles,
  Layers,
  PanelLeftClose
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
  onToggleCollapse?: () => void;
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
  quickNotesCount,
  onToggleCollapse
}) => {
  return (
    <aside className="w-60 border-r border-zinc-800/80 bg-zinc-950 flex flex-col h-full shrink-0 select-none text-xs">
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

      {/* Global Quick Search Omnibar Trigger */}
      <div className="p-2.5">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-zinc-900/90 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-all"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <span>Search or Ask AI...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono border border-zinc-700/50">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Section Menu */}
      <nav className="flex-1 px-2 space-y-0.5">
        <div className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
          Workspace
        </div>

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
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500">
            {notesCount}
          </span>
        </button>

        <button
          onClick={() => onSelectMode('quick')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium transition-colors ${
            currentMode === 'quick'
              ? 'bg-zinc-800/90 text-zinc-100 font-semibold border border-zinc-700/60'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            <span>Quick Notes</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500">
            {quickNotesCount}
          </span>
        </button>

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

        <div className="pt-3 px-2 pb-1 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
          Actions
        </div>

        <button
          onClick={onNewWikiPage}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800/60 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-zinc-400" />
          <span>New Page</span>
        </button>
      </nav>

      {/* Cloud Sync Status & Settings Footer */}
      <div className="p-2 border-t border-zinc-800/80 space-y-1">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-400">Google Cloud</span>
          </div>
          <span className="text-[10px] text-zinc-600">Synced</span>
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
