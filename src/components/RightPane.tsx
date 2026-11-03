import React from 'react';

export const RightPane: React.FC = () => {
  return (
    <aside className="w-80 border-l border-stone-800/80 bg-stone-950/40 hidden xl:flex flex-col h-full shrink-0 select-none">
      <div className="p-3.5 border-b border-stone-800/60 text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center justify-between">
        <span>Reserved Pane</span>
        <span className="w-2 h-2 rounded-full bg-stone-700" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-stone-600 space-y-2">
        <div className="w-8 h-8 rounded-full border border-dashed border-stone-800 flex items-center justify-center text-stone-600 font-mono">
          +
        </div>
        <p className="font-medium text-stone-500">Reserved for Future Feature</p>
        <p className="text-[11px] text-stone-600 max-w-[200px]">
          Left empty per design specification. Ready for custom tool or inspector integration.
        </p>
      </div>
    </aside>
  );
};
