import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  ArrowRight, 
  FileText, 
  Zap, 
  Link2, 
  Bot,
  Send,
  Loader2,
  Key,
  Copy,
  Check,
  X,
  ChevronLeft
} from 'lucide-react';
import { Note, SearchTab, AIProviderConfig } from '../types';
import { queryKnowledgeBase, isGeminiKeyConfigured } from '../services/aiService';
import { MarkdownViewer } from './MarkdownViewer';

interface SearchViewProps {
  notes: Note[];
  onSelectNote: (noteIdOrTitle: string) => void;
  aiConfig?: AIProviderConfig;
  onOpenSettings?: () => void;
  onBackToPages?: () => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  notes,
  onSelectNote,
  aiConfig,
  onOpenSettings,
  onBackToPages
}) => {
  const [activeTab, setActiveTab] = useState<SearchTab>('instant');
  const [query, setQuery] = useState('');
  
  // Ask AI state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [relevantNoteIds, setRelevantNoteIds] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDeepLoading, setIsDeepLoading] = useState(false);
  const [isDeepCompleted, setIsDeepCompleted] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAnswer = () => {
    if (!aiAnswer) return;
    navigator.clipboard.writeText(aiAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById('search-view-input')?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const filteredNotes = notes.filter(n => {
    if (!query.trim()) return true;
    const qLower = query.toLowerCase().trim();

    if (qLower.startsWith('#')) {
      const tagQuery = qLower.replace(/^#/, '');
      return n.tags.some(t => t.toLowerCase().includes(tagQuery));
    }

    if (qLower.startsWith('[[')) {
      const wikiQuery = qLower.replace(/[\[\]]/g, '');
      return n.type === 'wiki' && n.title.toLowerCase().includes(wikiQuery);
    }

    return (
      n.title.toLowerCase().includes(qLower) ||
      n.content.toLowerCase().includes(qLower) ||
      n.tags.some(t => t.toLowerCase().includes(qLower))
    );
  });

  const hasKey = isGeminiKeyConfigured(aiConfig);

  const handleAskAiSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiQuestion.trim() || isAiLoading) return;

    if (!hasKey) {
      setAiAnswer('Gemini API Key Required: Please configure your Gemini API key in Settings to connect directly to Google Gemini.');
      setCitations([]);
      setRelevantNoteIds([]);
      return;
    }

    setIsAiLoading(true);
    setAiAnswer(null);
    setIsDeepCompleted(false);
    try {
      const result = await queryKnowledgeBase(aiQuestion, notes, aiConfig, false);
      setAiAnswer(result.answer);
      setCitations(result.citations);
      setRelevantNoteIds(result.relevantNoteIds);
    } catch (err: any) {
      setAiAnswer(err?.message || 'Failed to query knowledge base with Gemini API. Please check your API key.');
      setCitations([]);
      setRelevantNoteIds([]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDeepInvestigate = async () => {
    if (isDeepLoading || relevantNoteIds.length === 0) return;
    setIsDeepLoading(true);
    try {
      const result = await queryKnowledgeBase(aiQuestion, notes, aiConfig, true, relevantNoteIds);
      setAiAnswer(result.answer);
      setCitations(result.citations);
      setIsDeepCompleted(true);
    } catch (err: any) {
      setAiAnswer(err?.message || 'Failed deep investigation of notes with Gemini API.');
    } finally {
      setIsDeepLoading(false);
    }
  };

  const handleSampleQuestion = (q: string) => {
    setAiQuestion(q);
    if (!hasKey) {
      setAiAnswer('Gemini API Key Required: Please configure your Gemini API key in Settings to connect directly to Google Gemini.');
      setCitations([]);
      setRelevantNoteIds([]);
      return;
    }
    setIsAiLoading(true);
    setAiAnswer(null);
    setIsDeepCompleted(false);
    queryKnowledgeBase(q, notes, aiConfig, false)
      .then(res => {
        setAiAnswer(res.answer);
        setCitations(res.citations);
        setRelevantNoteIds(res.relevantNoteIds);
      })
      .catch(err => {
        setAiAnswer(err?.message || 'Failed to query knowledge base with Gemini API.');
        setCitations([]);
        setRelevantNoteIds([]);
      })
      .finally(() => {
        setIsAiLoading(false);
      });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 sm:px-8 lg:px-12 py-6 max-w-4xl mx-auto w-full text-xs select-text pb-28 md:pb-16">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
              <Search className="w-5 h-5 text-indigo-400" />
              <span>Search & Ask AI</span>
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Search full-text, filter tags, or synthesize multi-note answers with Gemini.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onBackToPages && (
            <button
              onClick={onBackToPages}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Back to Pages"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Pages</span>
            </button>
          )}

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <button
              onClick={() => setActiveTab('instant')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'instant'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Instant Search</span>
            </button>
            <button
              onClick={() => setActiveTab('ask-ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'ask-ai'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ask AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: INSTANT SEARCH */}
      {activeTab === 'instant' && (
        <div className="space-y-4">
          {/* Search Input Bar */}
          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-2.5 shadow-sm focus-within:border-indigo-500/50 transition-colors">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              id="search-view-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across notes, #tags, or [[pages..."
              className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-zinc-500 hover:text-zinc-300 p-1"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
            <span>{filteredNotes.length} matching notes</span>
            <span className="font-mono text-zinc-600">Prefixes: #tag, [[page</span>
          </div>

          {/* Results List */}
          <div className="space-y-2">
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className="w-full text-left p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex items-start justify-between gap-3 group shadow-sm cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {note.type === 'wiki' ? (
                      <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="font-semibold text-sm text-zinc-200 group-hover:text-indigo-300 transition-colors truncate">
                      {note.title}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-500 border border-zinc-800">
                      {note.type}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {note.content.replace(/[#*`]/g, '')}
                  </p>

                  {note.tags && note.tags.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {note.tags.map((t, i) => (
                        <span key={i} className="text-[10px] text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-850">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 text-zinc-600 group-hover:text-zinc-300 shrink-0 pt-1">
                  <span className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}

            {filteredNotes.length === 0 && (
              <div className="py-16 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-zinc-500 text-xs">
                No notes found matching your search. Try searching for other terms or tags.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ASK AI */}
      {activeTab === 'ask-ai' && (
        <div className="space-y-4">
          {!hasKey && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Gemini API Key required. LatticeLedger connects directly to Google Gemini (no simulated AI).</span>
              </div>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium text-[11px] whitespace-nowrap transition-colors"
                >
                  Configure Key
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleAskAiSubmit} className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm flex items-center gap-2.5 focus-within:border-indigo-500/50 transition-colors">
            <Bot className="w-4 h-4 text-indigo-400 shrink-0" />
            <input
              id="search-view-input"
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Ask anything about your notes... (e.g. What are the Horcruxes?)"
              className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!aiQuestion.trim() || isAiLoading}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-medium text-xs disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Ask</span>
            </button>
          </form>

          {/* Quick Sample Questions */}
          <div className="flex items-center gap-2 overflow-x-auto text-[11px] text-zinc-500 pb-1">
            <span className="shrink-0 text-zinc-600">Sample:</span>
            <button
              onClick={() => handleSampleQuestion("What are the known Horcruxes?")}
              className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 whitespace-nowrap transition-colors"
            >
              What are the Horcruxes?
            </button>
            <button
              onClick={() => handleSampleQuestion("Who are the members of the Golden Trio?")}
              className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 whitespace-nowrap transition-colors"
            >
              The Golden Trio?
            </button>
          </div>

          {/* Synthesis Answer Container */}
          <div className="space-y-4 pt-1">
            {isAiLoading && (
              <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-zinc-400 text-xs rounded-xl bg-zinc-900/50 border border-zinc-800">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-spin" />
                <span className="font-medium text-zinc-300">Synthesizing knowledge with Gemini AI...</span>
                <span className="text-[11px] text-zinc-500">Combing through note summaries and tags</span>
              </div>
            )}

            {!isAiLoading && aiAnswer && (
              <div className="space-y-3">
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 text-[11px] text-zinc-500">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>AI Knowledge Synthesis ({isDeepCompleted ? 'Deep Dive' : 'Fast Summary Mode'})</span>
                    </div>
                    <button
                      onClick={handleCopyAnswer}
                      className="px-2.5 py-1 rounded-md bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 flex items-center gap-1.5 text-[11px] transition-colors"
                      title="Copy Answer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <MarkdownViewer
                    content={aiAnswer}
                    onLinkClick={(noteTitle) => {
                      onSelectNote(noteTitle);
                    }}
                  />

                  {/* Stage 2 Option: Drill down into actual full notes */}
                  {!isDeepCompleted && relevantNoteIds.length > 0 && (
                    <div className="mt-4 p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-zinc-200 text-xs">Investigate Actual Notes?</div>
                          <div className="text-[11px] text-zinc-400">
                            Drill into the full uncompressed text of {citations.slice(0, 3).join(', ')}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDeepInvestigate}
                        disabled={isDeepLoading}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
                      >
                        {isDeepLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Investigating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Deep Dive</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {citations.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
                    <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Referenced Notes & Citations:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {citations.map((cite, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSelectNote(cite)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] transition-colors"
                        >
                          <Link2 className="w-3 h-3 text-indigo-400" />
                          <span>{cite}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isAiLoading && !aiAnswer && (
              <div className="py-16 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-zinc-600 text-xs">
                Ask a question to synthesize answers directly across your note summaries.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
