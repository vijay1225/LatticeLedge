import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Sparkles, 
  Clock, 
  Link2, 
  ArrowRight,
  X,
  Tag,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Check
} from 'lucide-react';
import { Note } from '../types';

interface PagesViewProps {
  pages: Note[];
  onSelectPage: (pageId: string) => void;
  onNewPage: () => void;
  onDeletePage?: (pageId: string) => void;
  onTagClick?: (tag: string) => void;
  onLoadDemoPages?: () => void;
  onRefreshVault?: () => Promise<{ success: boolean; message: string; count?: number } | void>;
}

export const PagesView: React.FC<PagesViewProps> = ({
  pages,
  onSelectPage,
  onNewPage,
  onDeletePage,
  onTagClick,
  onLoadDemoPages,
  onRefreshVault
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshBanner, setRefreshBanner] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      setTouchStartY(e.touches[0].clientY);
    } else {
      setTouchStartY(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null || isRefreshing) return;
    if (containerRef.current && containerRef.current.scrollTop > 0) {
      setPullDistance(0);
      return;
    }
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    if (diff > 0) {
      // Smooth rubber-band resistance
      const dist = Math.min(diff * 0.4, 75);
      setPullDistance(dist);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= 50 && onRefreshVault && !isRefreshing) {
      await triggerRefresh();
    }
    setPullDistance(0);
    setTouchStartY(null);
  };

  const triggerRefresh = async () => {
    if (isRefreshing || !onRefreshVault) return;
    setIsRefreshing(true);
    try {
      const res = await onRefreshVault();
      if (res && res.message) {
        setRefreshBanner(res.message);
      } else {
        setRefreshBanner('Vault notes reloaded from database!');
      }
      setTimeout(() => setRefreshBanner(null), 3000);
    } catch (e: any) {
      setRefreshBanner(`Reload notice: ${e.message}`);
      setTimeout(() => setRefreshBanner(null), 3000);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };


  const filteredPages = pages.filter(p => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase().trim();
    if (q.startsWith('#')) {
      const tag = q.replace(/^#/, '');
      return p.tags.some(t => t.toLowerCase().includes(tag));
    }
    return (
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex-1 h-full overflow-y-auto px-4 sm:px-8 lg:px-12 py-6 max-w-5xl mx-auto w-full text-xs select-text pb-28 md:pb-16 overscroll-contain relative"
    >
            {/* Pull-To-Refresh Indicator (Mobile Touch & Slide Down) */}
      <div 
        className="overflow-hidden transition-all duration-200 ease-out flex items-center justify-center text-xs font-medium text-zinc-300"
        style={{
          height: isRefreshing ? 44 : pullDistance > 0 ? pullDistance : 0,
          opacity: isRefreshing || pullDistance > 10 ? 1 : 0
        }}
      >
        <div className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-zinc-900 border border-indigo-500/40 text-indigo-300 shadow-md">
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : pullDistance >= 50 ? 'rotate-180 text-emerald-400' : 'text-zinc-400'} transition-transform`} />
          <span>
            {isRefreshing 
              ? 'Reloading notes from database...' 
              : pullDistance >= 50 
              ? 'Release to reload vault' 
              : 'Pull down to reload vault'}
          </span>
        </div>
      </div>

      {refreshBanner && (
        <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{refreshBanner}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Pages</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
              {pages.length}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Browse evergreen wiki pages, linked notes, and AI-synthesized summaries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Filter */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter pages or #tags..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

                    {/* 1-Click Reload Vault button */}
          {onRefreshVault && (
            <button
              type="button"
              onClick={triggerRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-all active:scale-95 shrink-0"
              title="Reload latest notes from lattice_vault.db"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Reloading...' : 'Reload Vault'}</span>
            </button>
          )}

          {/* Demo Pages Quick Action */}
          {onLoadDemoPages && (
            <button
              onClick={onLoadDemoPages}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-all active:scale-95 shrink-0"
              title="Load interactive demo pages with code blocks, images, and video embeds"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Demo Pages</span>
            </button>
          )}

          {/* New Page Action */}
          <button
            onClick={onNewPage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-all active:scale-95 shrink-0"
            title="Create New Page"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Page</span>
          </button>
        </div>
      </div>

      {/* Pages Grid / List */}
      <div className="space-y-3">
        {filteredPages.map((page) => {
          const hasSummary = Boolean(
            page.summary && 
            Array.isArray(page.summary.tldr) && 
            page.summary.tldr.length > 0
          );

          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              className="group p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-150 cursor-pointer shadow-sm relative overflow-hidden"
            >
              {/* Card Header: Title & Meta */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors shrink-0" />
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors truncate">
                    {page.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-zinc-500 shrink-0">
                  {page.links && page.links.length > 0 && (
                    <span className="flex items-center gap-1 font-mono text-[10px] bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/80 text-zinc-400">
                      <Link2 className="w-2.5 h-2.5" />
                      <span>{page.links.length}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-600" />
                    <span>{new Date(page.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </span>

                  {onDeletePage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(confirmDeleteId === page.id ? null : page.id);
                      }}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Inline Delete Confirmation to prevent accidental loss */}
              {confirmDeleteId === page.id && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="my-2.5 p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in"
                >
                  <div className="flex items-center gap-2 text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Delete <strong>"{page.title}"</strong>? This will remove the page and its links.</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeletePage?.(page.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-[11px] shadow-sm active:scale-95 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* AI Summary Section: Only rendered if AI summary exists! */}
              {hasSummary && page.summary && (
                <div className="mt-2.5 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/90 text-xs text-zinc-300 space-y-1.5 group-hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-400 tracking-wider uppercase">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>AI Summary</span>
                    </div>
                    {page.summary.model && (
                      <span className="text-[9px] font-mono text-zinc-600">
                        {page.summary.model}
                      </span>
                    )}
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-zinc-300 text-[11px] leading-relaxed">
                    {page.summary.tldr.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="line-clamp-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tags & Snippet Footer */}
              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {page.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTagClick?.(tag);
                      }}
                      className="px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5 text-zinc-600" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>

                <span className="text-[11px] text-zinc-500 group-hover:text-indigo-400/80 font-medium transition-colors">
                  Open page →
                </span>
              </div>
            </div>
          );
        })}

        {filteredPages.length === 0 && (
          <div className="py-16 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 p-6 space-y-3">
            <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="text-zinc-400 text-sm font-medium">
              {filterQuery ? `No pages matching "${filterQuery}"` : 'No wiki pages in vault yet.'}
            </div>
            <p className="text-xs text-zinc-600 max-w-sm mx-auto">
              Create your first evergreen wiki page or load the interactive code & media demo pages.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              <button
                onClick={onNewPage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Page</span>
              </button>
              {onLoadDemoPages && (
                <button
                  onClick={onLoadDemoPages}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-medium text-xs shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Load Demo Pages</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
