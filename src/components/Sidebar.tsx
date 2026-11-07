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
  PanelLeftClose,
  Folder,
  HardDrive,
  Moon,
  Sun,
  BookOpen,
  Compass
} from 'lucide-react';
import { ViewMode, AppTheme } from '../types';

interface SidebarProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  notesCount: number;
  quickNotesCount: number;
  onToggleCollapse?: () => void;
  syncConfigured?: boolean;
  theme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMode,
  onSelectMode,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  notesCount,
  quickNotesCount,
  onToggleCollapse,
  syncConfigured = false,
  theme = 'dark',
  onThemeChange
}) => {
  return (
    <aside className="w-56 border-r border-zinc-800/80 bg-zinc-950 flex flex-col h-full shrink-0 select-none text-xs">
      {/* Top Header & History Navigation */}
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
          {/* Note History Navigation (< and >) */}
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

      {/* Main Navigation Menu (Four fixed Workspace options + Search) */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        <div className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
          Workspace
        </div>

        {/* 1. Pages */}
        <button
          onClick={() => onSelectMode('pages')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition-colors ${
            currentMode === 'pages' || currentMode === 'notes'
              ? 'bg-zinc-850 text-zinc-100 font-semibold border border-zinc-700/60 shadow-sm'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
          }`}
          title="Wiki Pages"
        >
          <div className="flex items-center gap-2">
            <FileText className={`w-4 h-4 ${
              currentMode === 'pages' || currentMode === 'notes' ? 'text-indigo-400' : 'text-zinc-500'
            }`} />
            <span>Pages</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono border border-zinc-800">
            {notesCount}
          </span>
        </button>

        {/* 2. Quick Notes */}
        <button
          onClick={() => onSelectMode('quick')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition-colors ${
            currentMode === 'quick'
              ? 'bg-zinc-850 text-zinc-100 font-semibold border border-zinc-700/60 shadow-sm'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
          }`}
          title="Quick Notes Feed"
        >
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${
              currentMode === 'quick' ? 'text-amber-400' : 'text-zinc-500'
            }`} />
            <span>Quick Notes</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono border border-zinc-800">
            {quickNotesCount}
          </span>
        </button>

        {/* 3. Search */}
        <button
          onClick={() => onSelectMode('search')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition-colors ${
            currentMode === 'search'
              ? 'bg-zinc-850 text-zinc-100 font-semibold border border-zinc-700/60 shadow-sm'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
          }`}
          title="Search & Ask AI (Ctrl+K)"
        >
          <div className="flex items-center gap-2">
            <Search className={`w-4 h-4 ${
              currentMode === 'search' ? 'text-indigo-400' : 'text-zinc-500'
            }`} />
            <span>Search</span>
          </div>
          <kbd className="text-[9px] px-1 py-0.5 rounded bg-zinc-900 text-zinc-500 font-mono border border-zinc-800">
            Ctrl+K
          </kbd>
        </button>

        {/* 4. Graph */}
        <button
          onClick={() => onSelectMode('graph')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition-colors ${
            currentMode === 'graph'
              ? 'bg-zinc-850 text-zinc-100 font-semibold border border-zinc-700/60 shadow-sm'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
          }`}
          title="Knowledge Graph"
        >
          <div className="flex items-center gap-2">
            <Network className={`w-4 h-4 ${
              currentMode === 'graph' ? 'text-emerald-400' : 'text-zinc-500'
            }`} />
            <span>Graph</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">2D</span>
        </button>
      </nav>

      {/* Vault Location & Settings Footer */}
      <div className="p-2 border-t border-zinc-800/80 space-y-1.5">
        <button
          type="button"
          onClick={() => onSelectMode('settings')}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          title={syncConfigured ? "Vault Folder Active (Click to manage in Settings)" : "Local Storage (Click to select folder in Settings)"}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {syncConfigured ? (
              <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            )}
            <span className="text-[10px] text-zinc-300 truncate">
              {syncConfigured ? 'Vault Folder Active' : 'Local Storage'}
            </span>
          </div>
          <span className="text-[9px] text-indigo-400/80 hover:text-indigo-300 font-medium">Manage</span>
        </button>

        {/* Color Theme Quick Switcher (4 Themes) */}
        <div className="grid grid-cols-4 gap-0.5 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800/80 mb-2">
          <button
            type="button"
            onClick={() => onThemeChange?.('dark')}
            className={`py-1 rounded flex items-center justify-center gap-1 text-[9px] font-medium transition-all ${
              theme === 'dark'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Obsidian Dark Theme (Midnight Black)"
          >
            <Moon className="w-2.5 h-2.5 text-amber-400" />
            <span className="hidden sm:inline">Dark</span>
          </button>
          <button
            type="button"
            onClick={() => onThemeChange?.('slate')}
            className={`py-1 rounded flex items-center justify-center gap-1 text-[9px] font-medium transition-all ${
              theme === 'slate'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Midnight Slate Theme (Cool Dark Reading Mode)"
          >
            <Compass className="w-2.5 h-2.5 text-cyan-400" />
            <span className="hidden sm:inline">Slate</span>
          </button>
          <button
            type="button"
            onClick={() => onThemeChange?.('sepia')}
            className={`py-1 rounded flex items-center justify-center gap-1 text-[9px] font-medium transition-all ${
              theme === 'sepia'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Warm Paper (Moleskine Book Mode)"
          >
            <BookOpen className="w-2.5 h-2.5 text-amber-600" />
            <span className="hidden sm:inline">Warm</span>
          </button>
          <button
            type="button"
            onClick={() => onThemeChange?.('light')}
            className={`py-1 rounded flex items-center justify-center gap-1 text-[9px] font-medium transition-all ${
              theme === 'light'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Modern Light Theme (Daytime Mode)"
          >
            <Sun className="w-2.5 h-2.5 text-amber-500" />
            <span className="hidden sm:inline">Light</span>
          </button>
        </div>

        {/* Settings */}
        <button
          onClick={() => onSelectMode('settings')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
            currentMode === 'settings'
              ? 'bg-zinc-800 text-zinc-100 font-medium'
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
