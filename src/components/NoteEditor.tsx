import React, { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Code, 
  List, 
  Link2, 
  Eye, 
  Edit3, 
  Clock, 
  ArrowUpRight,
  Lightbulb,
  Plus
} from 'lucide-react';
import { Note } from '../types';
import { AISummaryCard } from './AISummaryCard';
import { findBacklinks, findRelatedQuickNotes } from '../utils/wikiLinks';

interface NoteEditorProps {
  note: Note;
  allNotes: Note[];
  onUpdateNote: (updated: Partial<Note>) => void;
  onRefreshSummary: () => void;
  isSummaryLoading: boolean;
  onNavigateToNote: (titleOrId: string) => void;
  onTagClick?: (tag: string) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  allNotes,
  onUpdateNote,
  onRefreshSummary,
  isSummaryLoading,
  onNavigateToNote,
  onTagClick
}) => {
  const [isPreview, setIsPreview] = useState(false);

  // Compute backlinks (notes that point to this note)
  const backlinks = findBacklinks(note.title, allNotes);

  // Compute contextual suggestions (quick notes related to this page)
  const relatedSuggestions = findRelatedQuickNotes(note, allNotes);

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('note-body-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = note.content.substring(start, end) || 'text';
    const replacement = `${before}${selected}${after}`;

    const newContent = 
      note.content.substring(0, start) + replacement + note.content.substring(end);

    onUpdateNote({ content: newContent });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 10);
  };

  const handleLinkQuickNote = (qNote: Note) => {
    // Append link or citation into the current note content
    const appendText = `\n\n> Reference from Quick Note: "${qNote.content.slice(0, 80)}..."`;
    onUpdateNote({ content: note.content + appendText });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full">
      {/* Title Bar */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <input
          type="text"
          value={note.title}
          onChange={(e) => onUpdateNote({ title: e.target.value })}
          placeholder="Untitled Page..."
          className="w-full text-2xl sm:text-3xl font-extrabold bg-transparent text-stone-100 placeholder-stone-600 focus:outline-none tracking-tight"
        />

        {/* View / Edit Mode Toggle */}
        <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-lg p-1 shrink-0">
          <button
            onClick={() => setIsPreview(false)}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
              !isPreview ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Edit mode"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={() => setIsPreview(true)}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
              isPreview ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Live formatted preview"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>

      {/* Meta tags & Timestamp */}
      <div className="flex items-center gap-3 text-xs text-stone-400 mb-5">
        <div className="flex items-center gap-1 text-stone-500">
          <Clock className="w-3 h-3" />
          <span>Updated {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {note.tags.map((t, idx) => (
            <span
              key={idx}
              onClick={() => onTagClick?.(t)}
              className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 hover:text-amber-300 cursor-pointer transition-colors"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* SIGNATURE FEATURE: Per-Note AI Summary Card Placed ABOVE Note Body */}
      <AISummaryCard
        summary={note.summary}
        onRefresh={onRefreshSummary}
        isLoading={isSummaryLoading}
        onTagClick={onTagClick}
      />

      {/* AI Contextual Reference Suggestions (Connecting Quick Notes to this Wiki Page) */}
      {relatedSuggestions.length > 0 && (
        <div className="mb-5 p-3 rounded-xl bg-gradient-to-r from-sky-950/40 to-stone-900/40 border border-sky-500/20 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-sky-300 mb-2">
            <Lightbulb className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>AI Suggested References from your Quick Notes:</span>
          </div>
          <div className="space-y-2">
            {relatedSuggestions.slice(0, 3).map((sug, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2 rounded-lg bg-stone-900/60 border border-stone-800/80 hover:border-sky-500/30 transition-all"
              >
                <div className="min-w-0">
                  <div className="text-stone-200 font-medium truncate">
                    {sug.quickNote.title || sug.quickNote.content.slice(0, 45)}
                  </div>
                  <div className="text-[11px] text-sky-400/80 truncate">
                    {sug.reason}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleLinkQuickNote(sug.quickNote)}
                    className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 text-[11px] font-medium flex items-center gap-1"
                    title="Insert as quote reference"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Insert</span>
                  </button>
                  <button
                    onClick={() => onNavigateToNote(sug.quickNote.id)}
                    className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300"
                    title="View quick note"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Format Toolbar (when in edit mode) */}
      {!isPreview && (
        <div className="mb-2 flex items-center gap-1 p-1 bg-stone-900/60 border border-stone-800 rounded-lg text-stone-400">
          <button
            onClick={() => insertText('**', '**')}
            className="p-1.5 rounded hover:bg-stone-800 hover:text-stone-200 transition-colors"
            title="Bold (**text**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertText('*', '*')}
            className="p-1.5 rounded hover:bg-stone-800 hover:text-stone-200 transition-colors"
            title="Italic (*text*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertText('`', '`')}
            className="p-1.5 rounded hover:bg-stone-800 hover:text-stone-200 transition-colors"
            title="Code (`code`)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertText('\n- ')}
            className="p-1.5 rounded hover:bg-stone-800 hover:text-stone-200 transition-colors"
            title="Bullet list (- )"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-stone-800 mx-1" />
          <button
            onClick={() => insertText('[[', ']]')}
            className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono flex items-center gap-1 transition-colors"
            title="Insert [[Wiki Link]]"
          >
            <Link2 className="w-3 h-3" />
            <span>[[link]]</span>
          </button>
        </div>
      )}

      {/* Editor Body / Preview */}
      {isPreview ? (
        <div className="p-4 rounded-xl bg-stone-900/40 border border-stone-800/80 prose prose-invert max-w-none text-stone-200 leading-relaxed text-sm min-h-[300px]">
          {note.content.split('\n\n').map((para, i) => {
            // Render [[wiki-links]] interactively
            const parts = para.split(/(\[\[.*?\]\])/g);
            return (
              <p key={i} className="mb-3">
                {parts.map((part, j) => {
                  if (part.startsWith('[[') && part.endsWith(']]')) {
                    const title = part.slice(2, -2).trim();
                    return (
                      <button
                        key={j}
                        onClick={() => onNavigateToNote(title)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium mx-0.5 transition-colors"
                      >
                        <Link2 className="w-2.5 h-2.5" />
                        <span>{title}</span>
                      </button>
                    );
                  }
                  return <span key={j}>{part}</span>;
                })}
              </p>
            );
          })}
        </div>
      ) : (
        <textarea
          id="note-body-textarea"
          value={note.content}
          onChange={(e) => onUpdateNote({ content: e.target.value })}
          placeholder="Start writing... Type [[ to link pages, or # to tag..."
          className="w-full min-h-[360px] p-4 rounded-xl bg-stone-900/30 border border-stone-800/80 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500/40 font-mono text-sm leading-relaxed resize-y transition-colors"
        />
      )}

      {/* Backlinks Section (Bi-directional linking) */}
      <div className="mt-10 pt-6 border-t border-stone-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
          <Link2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Bi-directional Backlinks ({backlinks.length})</span>
        </div>

        {backlinks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {backlinks.map((bNote) => (
              <button
                key={bNote.id}
                onClick={() => onNavigateToNote(bNote.id)}
                className="text-left p-3 rounded-xl bg-stone-900/60 hover:bg-stone-800/70 border border-stone-800 hover:border-amber-500/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-stone-200 group-hover:text-amber-300 transition-colors">
                    {bNote.title}
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-stone-500 group-hover:text-amber-400 transition-colors" />
                </div>
                <p className="text-[11px] text-stone-400 line-clamp-2">
                  {bNote.content.replace(/[#*`]/g, '').slice(0, 90)}...
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-stone-900/20 border border-stone-800/40 text-center text-xs text-stone-500">
            No other pages link to this note yet. Use <code className="text-amber-300 font-mono">[[{note.title}]]</code> in any other note to create a bi-directional link!
          </div>
        )}
      </div>
    </div>
  );
};
