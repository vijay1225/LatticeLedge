import React, { useState } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

export const RightPane: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="hidden xl:flex items-center justify-center w-8 border-l border-zinc-800/80 bg-zinc-950 text-zinc-600 hover:text-zinc-300 transition-colors"
        title="Open Reserved Pane"
      >
        <PanelRightOpen className="w-4 h-4" />
      </button>
    );
  }

  return (
    <aside className="w-72 border-l border-zinc-800/80 bg-zinc-950/80 hidden xl:flex flex-col h-full shrink-0 select-none text-xs">
      <div className="h-12 px-3.5 border-b border-zinc-800/60 flex items-center justify-between text-zinc-500">
        <span className="font-medium text-[11px] uppercase tracking-wider">Reserved Pane</span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Collapse Pane"
        >
          <PanelRightClose className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-600 space-y-2">
        <div className="w-6 h-6 rounded border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-xs font-mono">
          +
        </div>
        <p className="font-medium text-zinc-400">Reserved Workspace</p>
        <p className="text-[11px] text-zinc-600 max-w-[180px] leading-relaxed">
          Kept empty per specification. Collapse anytime for full-bleed writing.
        </p>
      </div>
    </aside>
  );
};
