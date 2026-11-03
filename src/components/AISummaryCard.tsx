import React, { useState } from 'react';
import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!summary) return;
    const text = `AI Summary: ${summary.tldr.slice(0, 3).join(' ')} ${summary.tags.join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Strictly cap takeaways to 2-3 points so total card is never more than 4 lines
  const takeaways = (summary?.tldr || []).slice(0, 3);

  return (
    <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 text-xs shadow-sm">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium text-[11px] border border-indigo-500/20">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>AI Summary</span>
          </div>
          <span className="text-[10px] text-zinc-500">
            {summary?.model || 'Gemini 2.5 Flash'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
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
            title="Refresh summary"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isLoading ? 'Synthesizing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Always Expanded Content - Maximum 3-4 lines */}
      {isLoading ? (
        <div className="py-2 text-zinc-500 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          <span>Generating concise summary with Gemini...</span>
        </div>
      ) : summary && takeaways.length > 0 ? (
        <div className="space-y-1.5">
          <ul className="space-y-1 text-zinc-300 leading-snug">
            {takeaways.map((point, idx) => (
              <li key={idx} className="flex items-start gap-1.5 line-clamp-1">
                <span className="text-indigo-400 shrink-0">•</span>
                <span className="truncate">{point}</span>
              </li>
            ))}
          </ul>

          {/* Compact Inline Tags */}
          <div className="flex items-center gap-1.5 pt-1 text-[11px] overflow-hidden">
            <span className="text-zinc-600 font-mono text-[10px]">TAGS:</span>
            {summary.tags.slice(0, 4).map((tag, idx) => (
              <button
                key={idx}
                onClick={() => onTagClick?.(tag)}
                className="px-1.5 py-0.2 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] transition-colors truncate"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-1 text-zinc-500 text-xs flex items-center justify-between">
          <span>No AI summary yet.</span>
          <button
            onClick={onRefresh}
            className="text-indigo-400 hover:text-indigo-300 font-medium underline"
          >
            Generate Summary
          </button>
        </div>
      )}
    </div>
  );
};
