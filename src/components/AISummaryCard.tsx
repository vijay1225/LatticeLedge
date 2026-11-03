import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, CheckSquare, Tag, Copy, Check, RefreshCw, Cpu } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!summary) return;
    const text = `AI Summary (${summary.model}):\n\nTakeaways:\n${summary.tldr.map(t => `• ${t}`).join('\n')}\n\nAction Items:\n${summary.actionItems.map(a => `[ ] ${a}`).join('\n')}\n\nTags: ${summary.tags.join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-6 rounded-xl border border-amber-500/20 bg-gradient-to-br from-stone-900/90 via-stone-900/60 to-amber-950/20 backdrop-blur-md shadow-lg shadow-black/20 overflow-hidden transition-all duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/10 bg-stone-900/40">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">
            AI Summary Card
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Cpu className="w-2.5 h-2.5" />
            {summary?.model || 'Gemini 2.5 Flash'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {summary && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 transition-colors text-xs flex items-center gap-1"
              title="Copy Summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Generate or Refresh AI Summary"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            {isLoading ? 'Synthesizing...' : summary ? 'Refresh' : 'Summarize'}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 transition-colors"
            title={isCollapsed ? 'Expand Summary' : 'Collapse Summary'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-3.5">
          {isLoading && !summary ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-stone-400 text-sm">
              <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
              <span>Analyzing note content with Gemini...</span>
            </div>
          ) : summary ? (
            <>
              {/* TL;DR Bullet Points */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold tracking-wider uppercase text-stone-400">
                  Key Takeaways
                </div>
                <ul className="space-y-1 text-sm text-stone-200/90 leading-relaxed">
                  {summary.tldr.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1 text-xs">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Items */}
              {summary.actionItems && summary.actionItems.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-stone-800/60">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-stone-400">
                    <CheckSquare className="w-3 h-3 text-emerald-400" />
                    Action Items / Quests
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {summary.actionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-stone-800/50 border border-stone-700/40 text-xs text-stone-300"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags & Key Entities */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-800/60">
                <Tag className="w-3 h-3 text-stone-400 shrink-0 mr-1" />
                {summary.tags.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => onTagClick?.(tag)}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors"
                  >
                    {tag}
                  </button>
                ))}

                {summary.keyEntities && summary.keyEntities.length > 0 && (
                  <div className="flex items-center gap-1 ml-auto text-[11px] text-stone-400">
                    <span className="text-stone-500">Entities:</span>
                    {summary.keyEntities.map((ent, idx) => (
                      <span key={idx} className="text-stone-300 font-medium">
                        {ent}{idx < summary.keyEntities.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-3 text-center text-sm text-stone-400 flex items-center justify-center gap-2">
              <span>No summary generated yet. Click</span>
              <button
                onClick={onRefresh}
                className="text-amber-300 underline underline-offset-2 hover:text-amber-200 font-medium"
              >
                Summarize
              </button>
              <span>to analyze this note with AI.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
