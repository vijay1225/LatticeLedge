import React, { useRef } from 'react';
import { Note } from '../../types';
import { FileText, Plus, Link2, X, Sparkles, Hash } from 'lucide-react';

interface WikiLinkSuggestionPopupProps {
  isOpen: boolean;
  query: string;
  coords: { left: number; top: number; bottom: number } | null;
  allNotes: Note[];
  currentNoteId: string;
  selectedIndex: number;
  onSelect: (pageTitle: string) => void;
  onClose: () => void;
}

export const WikiLinkSuggestionPopup: React.FC<WikiLinkSuggestionPopupProps> = ({
  isOpen,
  query,
  coords,
  allNotes,
  currentNoteId,
  selectedIndex,
  onSelect,
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  try {
    const cleanQuery = (query || '').trim().toLowerCase();
    const safeNotes = Array.isArray(allNotes) ? allNotes : [];

    // Filter available wiki pages (excluding the active note)
    const wikiPages = safeNotes.filter(n => n && n.type === 'wiki' && n.id !== currentNoteId && n.title);

    // Exact match check
    const hasExactMatch = wikiPages.some(n => (n.title || '').toLowerCase() === cleanQuery);

    // Filtered matching pages
    const matchingPages = cleanQuery
      ? wikiPages.filter(n => (n.title || '').toLowerCase().includes(cleanQuery))
      : wikiPages;

    // Items list: matching pages + optional "Create new page" item
    const shouldShowCreateNew = cleanQuery.length > 0 && !hasExactMatch && cleanQuery !== 'pagename' && cleanQuery !== 'page name';

    // Calculate safe viewport positioning with fallbacks
    const popupWidth = 320;
    const popupEstimatedHeight = 260;
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
    const winHeight = typeof window !== 'undefined' ? window.innerHeight : 600;

    let left = coords && typeof coords.left === 'number' && !isNaN(coords.left) ? coords.left : 20;
    if (left + popupWidth > winWidth - 16) {
      left = Math.max(16, winWidth - popupWidth - 16);
    }
    if (left < 16) left = 16;

    // Vertical placement: place below caret by default, or above if near bottom of screen
    const bottomCoord = coords && typeof coords.bottom === 'number' && !isNaN(coords.bottom) ? coords.bottom : 120;
    const topCoord = coords && typeof coords.top === 'number' && !isNaN(coords.top) ? coords.top : 100;
    const spaceBelow = winHeight - bottomCoord;
    let top = bottomCoord + 6;
    if (spaceBelow < popupEstimatedHeight && topCoord > popupEstimatedHeight) {
      top = Math.max(10, topCoord - popupEstimatedHeight - 6);
    }

    return (
      <div
        ref={containerRef}
        style={{ top: `${top}px`, left: `${left}px` }}
        className="fixed z-50 w-72 sm:w-80 max-h-72 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col text-xs duration-100"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/80 border-b border-zinc-800 text-[11px] text-zinc-400 select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">
              Link to page: <code className="text-indigo-300 font-mono font-semibold">[[{query || '...' }]]</code>
            </span>
          </div>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
            }}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Suggestion Items List */}
        <div className="overflow-y-auto max-h-56 p-1 space-y-0.5 divide-y divide-zinc-800/40">
          {matchingPages.map((page, index) => {
            const isSelected = index === selectedIndex;
            const firstTag = Array.isArray(page.tags) && typeof page.tags[0] === 'string' ? page.tags[0] : null;

            return (
              <div
                key={page.id || `wiki-opt-${index}`}
                data-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent editor blur
                  onSelect(page.title || '');
                }}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-left ${
                  isSelected
                    ? 'bg-indigo-600/30 text-white border-l-2 border-indigo-500 font-medium'
                    : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-300' : 'text-zinc-500'}`} />
                  <span className="truncate">{page.title || 'Untitled'}</span>
                </div>

                {firstTag && (
                  <span className="text-[10px] text-zinc-500 shrink-0 flex items-center gap-0.5 ml-2">
                    <Hash className="w-2.5 h-2.5 text-zinc-600" />
                    <span>{firstTag.replace(/^#/, '')}</span>
                  </span>
                )}
              </div>
            );
          })}

          {/* "+ Create New Page" Item */}
          {shouldShowCreateNew && (
            <div
              data-selected={selectedIndex === matchingPages.length}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect((query || '').trim());
              }}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-left mt-1 ${
                selectedIndex === matchingPages.length
                  ? 'bg-emerald-600/25 text-emerald-200 border-l-2 border-emerald-400 font-medium'
                  : 'text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300'
              }`}
            >
              <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 shrink-0">
                <Plus className="w-3 h-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium flex items-center gap-1">
                  <span>Create new page:</span>
                  <span className="text-zinc-100 font-mono">"{(query || '').trim()}"</span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Press Enter or tap to create & link
                </p>
              </div>
            </div>
          )}

          {/* Empty state when no matches and query is empty */}
          {matchingPages.length === 0 && !shouldShowCreateNew && (
            <div className="p-4 text-center text-zinc-500 space-y-1">
              <Sparkles className="w-4 h-4 mx-auto text-zinc-600" />
              <p className="text-[11px]">Type page name to search or create...</p>
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-3 py-1.5 bg-zinc-950/90 border-t border-zinc-800 text-[10px] text-zinc-500 flex items-center justify-between select-none">
          <span className="hidden sm:inline">↑↓ navigate • ↵ select • Esc close</span>
          <span className="sm:hidden">Tap page to link</span>
          <span className="font-mono text-zinc-600">[[wiki-links]]</span>
        </div>
      </div>
    );
  } catch (err) {
    console.error('[WikiLinkSuggestionPopup error]:', err);
    return null;
  }
};
