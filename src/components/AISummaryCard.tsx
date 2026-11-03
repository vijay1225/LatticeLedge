import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronRight, CheckSquare, Tag, Copy, Check, RefreshCw, Cpu } from 'lucide-react';
import { AISummary } from '../types';

interface AISummaryCardProps {
  summary?: AISummary;
  onRefresh: () => void;
  isLoading: boolean;
  onTagClick?: (tag: string) => void;
}

export const AISummaryCard: React.FC<AISummaryCardProps> = ({
  summary,
  onRefresh,
  isLoading,
  onTagClick
}) => {
  // Collapsed by default so it never blocks or occupies precious writing space!
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!summary) return;
    const text = `AI Summary (${summary.model}):\n\nTakeaways:\n${summary.tldr.map(t => `• ${t}`).join('\n')}\n\nAction Items:\n${summary.actionItems.map(a => `[ ] ${a}`).join('\n')}\n\nTags: ${summary.tags.join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const previewText = summary?.tldr?.[0] || 'No summary generated yet. Click to analyze with AI.';

  return (
    <div className="mb-4 rounded-lg border border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700/80 transition-all text-xs">
      {/* Ultra-compact 1-line professional header bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800/90 text-zinc-300 font-medium text-[11px] shrink-0 border border-zinc-700/50">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>AI Summary</span>
          </div>

          {/* Quick 1-line preview */}
          <span className="text-zinc-400 font-normal truncate group-hover:text-zinc-200 transition-colors">
            {isLoading ? 'Analyzing note with Gemini...' : previewText}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          {summary && (
            <button
              onClick={handleCopy}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Copy summary"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 hover:text-zinc-100 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-40"
            title="Generate fresh AI summary"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isLoading ? 'Thinking...' : summary ? 'Refresh' : 'Summarize'}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {isExpanded && (
        <div className="px-3.5 pb-3 pt-2 border-t border-zinc-800/60 space-y-3 bg-zinc-950/30">
          {summary ? (
            <>
              {/* Takeaways */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Key Takeaways
                </div>
                <ul className="space-y-1 text-zinc-300 leading-relaxed text-xs">
                  {summary.tldr.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-1 text-[10px]">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action items */}
              {summary.actionItems && summary.actionItems.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-zinc-800/40">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    <CheckSquare className="w-3 h-3 text-emerald-400" />
                    <span>Action Items</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {summary.actionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800/80 text-[11px] text-zinc-300 truncate"
                      >
                        • {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags & Model Info */}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-800/40 text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3 h-3 text-zinc-500 shrink-0" />
                  {summary.tags.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={() => onTagClick?.(tag)}
                      className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-[10px] text-zinc-500 shrink-0">
                  <Cpu className="w-3 h-3" />
                  <span>{summary.model}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-2 text-center text-zinc-500 text-xs">
              No summary yet. Click &quot;Summarize&quot; to generate with Gemini.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
