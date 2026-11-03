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
    <div className="flex-1 h-full overflow-y-auto px-6 lg:px-12 py-6 max-w-4xl mx-auto w-full text-xs">
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <span>Quick Notes</span>
          <Zap className="w-4 h-4 text-zinc-400" />
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Zero-friction capture. AI extracts keywords and tags automatically.
        </p>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 focus-within:border-zinc-700 transition-all">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit(e);
              }
            }}
            placeholder="Jot down a quick thought, observation, or snippet... (Ctrl+Enter to save)"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none min-h-[65px]"
          />
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 mt-1">
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>AI auto-tags on save</span>
            </span>
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-3 py-1 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-40 transition-colors"
            >
              <span>Save Note</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </form>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              selectedTag === null
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All ({quickNotes.length})
          </button>
          {allTags.map((t, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTag(selectedTag === t ? null : t)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                selectedTag === t
                  ? 'bg-zinc-800 text-zinc-100 font-medium border border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      <div className="space-y-2.5">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="p-3.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-all group"
          >
            <div className="flex items-center justify-between text-zinc-500 mb-1.5">
              <div className="flex items-center gap-1 text-[11px]">
                <Clock className="w-3 h-3" />
                <span>{new Date(note.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onPromoteToWiki(note)}
                  className="px-1.5 py-0.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center gap-1"
                  title="Promote to Wiki Page"
                >
                  <FileText className="w-3 h-3" />
                  <span>Convert to Page</span>
                </button>
                <button
                  onClick={() => onDeleteQuickNote(note.id)}
                  className="p-1 rounded text-zinc-600 hover:text-rose-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <p className="text-zinc-200 leading-relaxed text-xs whitespace-pre-wrap mb-2">
              {note.content}
            </p>

            {note.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-zinc-800/40">
                <Tag className="w-3 h-3 text-zinc-600 mr-0.5" />
                {note.tags.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedTag(tag);
                      onTagClick?.(tag);
                    }}
                    className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
