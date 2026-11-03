import React, { useState } from 'react';
import { Zap, Send, Tag, FileText, Trash2, Clock, Sparkles } from 'lucide-react';
import { Note } from '../types';

interface QuickNotesFeedProps {
  quickNotes: Note[];
  onAddQuickNote: (content: string) => void;
  onDeleteQuickNote: (id: string) => void;
  onPromoteToWiki: (note: Note) => void;
  onTagClick?: (tag: string) => void;
}

export const QuickNotesFeed: React.FC<QuickNotesFeedProps> = ({
  quickNotes,
  onAddQuickNote,
  onDeleteQuickNote,
  onPromoteToWiki,
  onTagClick
}) => {
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Collect all unique tags from quick notes
  const allTags = Array.from(
    new Set(quickNotes.flatMap(n => n.tags))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAddQuickNote(content);
    setContent('');
  };

  const filteredNotes = selectedTag
    ? quickNotes.filter(n => n.tags.includes(selectedTag))
    : quickNotes;

  return (
    <div className="flex-1 h-full overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <Zap className="w-5 h-5 fill-amber-400" />
          <h2 className="text-xl font-bold tracking-tight text-stone-100">
            Quick Notes Scratchpad
          </h2>
        </div>
        <p className="text-xs text-stone-400">
          Zero-friction capture. AI automatically extracts keywords, entities, and tags.
        </p>
      </div>

      {/* Instant Capture Input Box */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-stone-800 shadow-xl focus-within:border-amber-500/50 transition-all">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit(e);
              }
            }}
            placeholder="Capture fleeting thought, spell, meeting snippet... (Ctrl+Enter to save)"
            className="w-full bg-transparent text-sm text-stone-100 placeholder-stone-500 focus:outline-none resize-none min-h-[75px]"
          />
          <div className="flex items-center justify-between pt-2 border-t border-stone-800/60 mt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI auto-tags on save</span>
            </div>
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-40 transition-all shadow-md shadow-amber-500/10"
            >
              <span>Save Note</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </form>

      {/* Tag Filter Chips */}
      {allTags.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedTag === null
                ? 'bg-amber-500 text-stone-950 font-semibold'
                : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            All ({quickNotes.length})
          </button>
          {allTags.map((t, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTag(selectedTag === t ? null : t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedTag === t
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Feed List */}
      <div className="space-y-3">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="p-4 rounded-xl bg-stone-900/60 border border-stone-800/80 hover:border-stone-700 transition-all shadow-sm group"
          >
            <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(note.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onPromoteToWiki(note)}
                  className="px-2 py-0.5 rounded text-[11px] text-amber-300 hover:bg-amber-500/10 flex items-center gap-1 transition-colors"
                  title="Promote to full Wiki Page"
                >
                  <FileText className="w-3 h-3" />
                  <span>Convert to Wiki Page</span>
                </button>
                <button
                  onClick={() => onDeleteQuickNote(note.id)}
                  className="p-1 rounded text-stone-500 hover:text-rose-400 transition-colors"
                  title="Delete Quick Note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-sm text-stone-200 leading-relaxed whitespace-pre-wrap mb-3">
              {note.content}
            </p>

            {note.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-800/40">
                <Tag className="w-3 h-3 text-stone-500 shrink-0" />
                {note.tags.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedTag(tag);
                      onTagClick?.(tag);
                    }}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredNotes.length === 0 && (
          <div className="text-center py-12 text-stone-500 text-sm">
            No quick notes match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
