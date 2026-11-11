import React from 'react';
import { Calendar, FileText, Zap, Search, Network, Plus } from 'lucide-react';
import { ViewMode } from '../types';

interface MobileBottomNavProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  onOpenSearch?: () => void;
  onOpenQuickCapture: () => void;
  onPrefetchGraph?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentMode,
  onSelectMode,
  onOpenQuickCapture,
  onPrefetchGraph
}) => {
  return (
    <>
      {/* Floating Action Button (FAB) for instant capture */}
      <button
        onClick={onOpenQuickCapture}
        className="md:hidden fixed bottom-16 right-4 z-40 w-12 h-12 rounded-full bg-zinc-100 text-zinc-950 flex items-center justify-center shadow-2xl active:scale-95 transition-transform border border-zinc-200"
        title="Instant Capture (+)"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Mobile Bottom Navigation Bar (5 Primary Workspace Modes) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-lg px-2 py-1.5 flex items-center justify-around text-xs">
        {/* 1. Journals */}
        <button
          onClick={() => onSelectMode('journals')}
          className={`flex flex-col items-center py-1 px-2 rounded text-[10px] transition-colors ${
            currentMode === 'journals' ? 'text-emerald-400 font-semibold' : 'text-zinc-500'
          }`}
        >
          <Calendar className="w-4 h-4 mb-0.5" />
          <span>Journals</span>
        </button>

        {/* 2. Pages */}
        <button
          onClick={() => onSelectMode('pages')}
          className={`flex flex-col items-center py-1 px-2 rounded text-[10px] transition-colors ${
            currentMode === 'pages' || currentMode === 'notes' ? 'text-indigo-400 font-semibold' : 'text-zinc-500'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>Pages</span>
        </button>

        {/* 3. Quick Notes */}
        <button
          onClick={() => onSelectMode('quick')}
          className={`flex flex-col items-center py-1 px-2 rounded text-[10px] transition-colors ${
            currentMode === 'quick' ? 'text-amber-400 font-semibold' : 'text-zinc-500'
          }`}
        >
          <Zap className="w-4 h-4 mb-0.5" />
          <span>Quick</span>
        </button>

        {/* 4. Search & Ask AI */}
        <button
          onClick={() => onSelectMode('search')}
          className={`flex flex-col items-center py-1 px-2 rounded text-[10px] transition-colors ${
            currentMode === 'search' ? 'text-indigo-400 font-semibold' : 'text-zinc-500'
          }`}
        >
          <Search className="w-4 h-4 mb-0.5" />
          <span>Search</span>
        </button>

        {/* 5. Graph */}
        <button
          onClick={() => onSelectMode('graph')}
          onTouchStart={onPrefetchGraph}
          onMouseEnter={onPrefetchGraph}
          className={`flex flex-col items-center py-1 px-2 rounded text-[10px] transition-colors ${
            currentMode === 'graph' ? 'text-emerald-400 font-semibold' : 'text-zinc-500'
          }`}
        >
          <Network className="w-4 h-4 mb-0.5" />
          <span>Graph</span>
        </button>
      </div>
    </>
  );
};
