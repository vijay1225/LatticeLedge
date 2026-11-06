import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  X, 
  ArrowRight, 
  FileText, 
  Zap, 
  Link2, 
  Bot,
  Send,
  Loader2,
  Key,
  Copy,
  Check
} from 'lucide-react';
import { Note, SearchTab, AIProviderConfig } from '../types';
import { queryKnowledgeBase, isGeminiKeyConfigured } from '../services/aiService';
import { MarkdownViewer } from './MarkdownViewer';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteIdOrTitle: string) => void;
  aiConfig?: AIProviderConfig;
  onOpenSettings?: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  aiConfig,
  onOpenSettings
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
    if (isOpen) {
      setTimeout(() => {
        document.getElementById('search-modal-input')?.focus();
      }, 50);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
            <button
              onClick={() => setActiveTab('instant')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'instant'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Instant Search</span>
            </button>
            <button
              onClick={() => setActiveTab('ask-ai')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'ask-ai'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ask AI</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TAB 1: INSTANT SEARCH */}
        {activeTab === 'instant' && (
          <div className="flex flex-col flex-1 overflow-hidden text-xs">
            <div className="p-3 border-b border-zinc-800/80 flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                id="search-modal-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes, #tags, or [[pages..."
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note.id);
                    onClose();
                  }}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-zinc-800/80 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {note.type === 'wiki' ? (
                        <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <span className="font-medium text-zinc-200 group-hover:text-white transition-colors truncate">
                        {note.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-1">
                      {note.content.replace(/[#*`]/g, '')}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}

              {filteredNotes.length === 0 && (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No notes found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ASK AI */}
        {activeTab === 'ask-ai' && (
          <div className="flex flex-col flex-1 overflow-hidden text-xs">
            {!hasKey && (
              <div className="mx-3 mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Gemini API Key required. LatticeLedger connects directly to Google Gemini (no simulated AI).</span>
                </div>
                {onOpenSettings && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium text-[11px] whitespace-nowrap transition-colors"
                  >
                    Configure Key
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleAskAiSubmit} className="p-3 border-b border-zinc-800/80 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400 shrink-0" />
              <input
                id="search-modal-input"
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask anything about your notes... (e.g. What are the Horcruxes?)"
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!aiQuestion.trim() || isAiLoading}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1"
              >
                {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </button>
            </form>

            <div className="px-3 py-1.5 bg-zinc-950/40 border-b border-zinc-800/40 flex items-center gap-1.5 overflow-x-auto text-[11px] text-zinc-500">
              <span className="shrink-0 text-zinc-600">Sample:</span>
              <button
                onClick={() => handleSampleQuestion("What are the known Horcruxes?")}
                className="px-2 py-0.5 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-400 whitespace-nowrap"
              >
                What are the Horcruxes?
              </button>
              <button
                onClick={() => handleSampleQuestion("Who are the members of the Golden Trio?")}
                className="px-2 py-0.5 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-400 whitespace-nowrap"
              >
                The Golden Trio?
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isAiLoading && (
                <div className="py-8 flex items-center justify-center gap-2 text-zinc-400 text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>Synthesizing notes...</span>
                </div>
              )}

              {!isAiLoading && aiAnswer && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-zinc-950/90 border border-zinc-800/90 p-4 shadow-inner">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800/80 text-[11px] text-zinc-500">
                      <div className="flex items-center gap-1.5 text-indigo-400 font-medium">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Knowledge Synthesis ({isDeepCompleted ? 'Deep Dive' : 'Fast Summary Mode'})</span>
                      </div>
                      <button
                        onClick={handleCopyAnswer}
                        className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 flex items-center gap-1 text-[11px] transition-colors"
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
                        onClose();
                      }}
                    />

                    {/* Stage 2 Option: Drill down into actual full notes */}
                    {!isDeepCompleted && relevantNoteIds.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3 animate-in fade-in">
                        <div className="flex items-center gap-2">
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
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Citations:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {citations.map((cite, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              onSelectNote(cite);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors"
                          >
                            <Link2 className="w-2.5 h-2.5" />
                            <span>{cite}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isAiLoading && !aiAnswer && (
                <div className="py-8 text-center text-zinc-600 text-xs">
                  Ask a question to synthesize answers across your notes.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
