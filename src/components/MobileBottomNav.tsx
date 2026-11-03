import React from 'react';
import { FileText, Zap, Search, Network, Plus } from 'lucide-react';
import { ViewMode } from '../types';

interface MobileBottomNavProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  onOpenSearch: () => void;
  onOpenQuickCapture: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentMode,
  onSelectMode,
  onOpenSearch,
  onOpenQuickCapture
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-lg px-3 py-1 flex items-center justify-around text-xs">
      <button
        onClick={() => onSelectMode('notes')}
        className={`flex flex-col items-center py-1 px-2 rounded text-[10px] transition-colors ${
          currentMode === 'notes' ? 'text-zinc-100 font-semibold' : 'text-zinc-500'
        }`}
      >
        <FileText className="w-4 h-4 mb-0.5" />
        <span>Pages</span>
      </button>

      <button
        onClick={() => onSelectMode('quick')}
        className={`flex flex-col items-center py-1 px-2 rounded text-[10px] transition-colors ${
          currentMode === 'quick' ? 'text-zinc-100 font-semibold' : 'text-zinc-500'
        }`}
      >
        <Zap className="w-4 h-4 mb-0.5" />
        <span>Quick</span>
      </button>

      {/* Floating Action Button (FAB) for instant capture */}
      <div className="-mt-4">
        <button
          onClick={onOpenQuickCapture}
          className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-950 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          title="Instant Capture"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      <button
        onClick={onOpenSearch}
        className="flex flex-col items-center py-1 px-2 rounded text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Search className="w-4 h-4 mb-0.5" />
        <span>Search</span>
      </button>

      <button
        onClick={() => onSelectMode('graph')}
        className={`flex flex-col items-center py-1 px-2 rounded text-[10px] transition-colors ${
          currentMode === 'graph' ? 'text-zinc-100 font-semibold' : 'text-zinc-500'
        }`}
      >
        <Network className="w-4 h-4 mb-0.5" />
        <span>Graph</span>
      </button>
    </div>
  );
};
