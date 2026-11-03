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
  Loader2
} from 'lucide-react';
import { Note, SearchTab } from '../types';
import { queryKnowledgeBase } from '../services/aiService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteIdOrTitle: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote
}) => {
  const [activeTab, setActiveTab] = useState<SearchTab>('instant');
  const [query, setQuery] = useState('');
  
  // Ask AI state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        document.getElementById('search-modal-input')?.focus();
      }, 50);
    }
  }, [isOpen, activeTab]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  // Filter notes for Instant Search
  const filteredNotes = notes.filter(n => {
    if (!query.trim()) return true;
    const qLower = query.toLowerCase().trim();

    // Check tag prefix #
    if (qLower.startsWith('#')) {
      const tagQuery = qLower.replace(/^#/, '');
      return n.tags.some(t => t.toLowerCase().includes(tagQuery));
    }

    // Check wiki link prefix [[
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

  const handleAskAiSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiQuestion.trim() || isAiLoading) return;

    setIsAiLoading(true);
    setAiAnswer(null);
    try {
      const result = await queryKnowledgeBase(aiQuestion, notes);
      setAiAnswer(result.answer);
      setCitations(result.citations);
    } catch {
      setAiAnswer('Unable to synthesize notes. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSampleQuestion = (q: string) => {
    setAiQuestion(q);
    setIsAiLoading(true);
    queryKnowledgeBase(q, notes).then(res => {
      setAiAnswer(res.answer);
      setCitations(res.citations);
      setIsAiLoading(false);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dual Tab Switcher Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-900 border border-stone-800">
            <button
              onClick={() => setActiveTab('instant')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'instant'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Instant Search</span>
            </button>
            <button
              onClick={() => setActiveTab('ask-ai')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ask-ai'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI (Synthesis)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TAB 1: INSTANT SEARCH */}
        {activeTab === 'instant' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-3.5 border-b border-stone-800/80 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                id="search-modal-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search... Use #tag for tags or [[ for pages..."
                className="w-full bg-transparent text-sm text-stone-100 placeholder-stone-500 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-stone-500 hover:text-stone-300 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Syntax Tips */}
            <div className="px-4 py-1.5 bg-stone-950/40 border-b border-stone-800/40 flex items-center gap-3 text-[11px] text-stone-500 overflow-x-auto">
              <span>Quick Syntax:</span>
              <button onClick={() => setQuery('#Horcrux')} className="hover:text-amber-300 font-mono">#Horcrux</button>
              <button onClick={() => setQuery('#Spells')} className="hover:text-amber-300 font-mono">#Spells</button>
              <button onClick={() => setQuery('[[')} className="hover:text-amber-300 font-mono">[[Wiki</button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-stone-800/40">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-stone-800/70 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {note.type === 'wiki' ? (
                        <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <span className="font-semibold text-xs text-stone-100 group-hover:text-amber-300 transition-colors truncate">
                        {note.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 line-clamp-1">
                      {note.content.replace(/[#*`]/g, '')}
                    </p>
                    {note.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {note.tags.slice(0, 3).map((t, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-600 group-hover:text-amber-400 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}

              {filteredNotes.length === 0 && (
                <div className="py-12 text-center text-stone-500 text-xs">
                  No notes match your search.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ASK AI (KNOWLEDGE SYNTHESIS) */}
        {activeTab === 'ask-ai' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Question Input */}
            <form onSubmit={handleAskAiSubmit} className="p-3.5 border-b border-stone-800/80 flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                id="search-modal-input"
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask anything about your notes... (e.g. What are the 7 Horcruxes?)"
                className="w-full bg-transparent text-sm text-stone-100 placeholder-stone-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!aiQuestion.trim() || isAiLoading}
                className="p-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold disabled:opacity-40 hover:bg-amber-400 transition-colors shrink-0"
              >
                {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>

            {/* Preset Suggested Questions */}
            <div className="px-4 py-2 bg-stone-950/40 border-b border-stone-800/40 flex items-center gap-2 overflow-x-auto text-[11px] text-stone-400">
              <span className="shrink-0 text-stone-500">Try:</span>
              <button
                onClick={() => handleSampleQuestion("What are the known Horcruxes and where were they found?")}
                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 whitespace-nowrap"
              >
                What are the Horcruxes?
              </button>
              <button
                onClick={() => handleSampleQuestion("Who are the members of the Golden Trio and what did they accomplish?")}
                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 whitespace-nowrap"
              >
                The Golden Trio?
              </button>
              <button
                onClick={() => handleSampleQuestion("What tips or spells are in the quick notes?")}
                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 whitespace-nowrap"
              >
                Spells & Tips?
              </button>
            </div>

            {/* Answer Display */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isAiLoading && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-stone-400 text-sm">
                  <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
                  <span>Synthesizing answer across your knowledge base...</span>
                </div>
              )}

              {!isAiLoading && aiAnswer && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-stone-950/60 border border-amber-500/20 text-stone-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {aiAnswer}
                  </div>

                  {/* Clickable Citations */}
                  {citations.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                        Referenced Notes:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {citations.map((cite, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              onSelectNote(cite);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>{cite}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isAiLoading && !aiAnswer && (
                <div className="py-10 text-center text-stone-500 text-xs flex flex-col items-center justify-center gap-2">
                  <Bot className="w-8 h-8 text-stone-600" />
                  <span>Ask any question to synthesize information across your entire vault.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
