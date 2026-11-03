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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 border-t border-stone-800 backdrop-blur-lg px-2 py-1 flex items-center justify-around">
      <button
        onClick={() => onSelectMode('notes')}
        className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors ${
          currentMode === 'notes' ? 'text-amber-400' : 'text-stone-400 hover:text-stone-200'
        }`}
      >
        <FileText className="w-5 h-5 mb-0.5" />
        <span>Notes</span>
      </button>

      <button
        onClick={() => onSelectMode('quick')}
        className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors ${
          currentMode === 'quick' ? 'text-amber-400' : 'text-stone-400 hover:text-stone-200'
        }`}
      >
        <Zap className="w-5 h-5 mb-0.5" />
        <span>Quick</span>
      </button>

      {/* Floating Action Button (FAB) for Instant Quick Note */}
      <div className="-mt-5">
        <button
          onClick={onOpenQuickCapture}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-stone-950 flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
          title="Instant Quick Capture"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      <button
        onClick={onOpenSearch}
        className="flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium text-stone-400 hover:text-stone-200 transition-colors"
      >
        <Search className="w-5 h-5 mb-0.5" />
        <span>Search</span>
      </button>

      <button
        onClick={() => onSelectMode('graph')}
        className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors ${
          currentMode === 'graph' ? 'text-amber-400' : 'text-stone-400 hover:text-stone-200'
        }`}
      >
        <Network className="w-5 h-5 mb-0.5" />
        <span>Graph</span>
      </button>
    </div>
  );
};
