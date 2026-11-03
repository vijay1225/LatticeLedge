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
  Plus,
  ChevronDown,
  ChevronRight
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
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
    const appendText = `\n\n> Reference: "${qNote.content.slice(0, 80)}..."`;
    onUpdateNote({ content: note.content + appendText });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-6 lg:px-12 py-6 max-w-5xl mx-auto w-full flex flex-col">
      {/* Top Meta Bar: Minimalist title & controls */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={note.title}
            onChange={(e) => onUpdateNote({ title: e.target.value })}
            placeholder="Untitled Note..."
            className="w-full text-2xl lg:text-3xl font-bold bg-transparent text-zinc-100 placeholder-zinc-700 focus:outline-none tracking-tight border-none p-0"
          />

          <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-600" />
              <span>{new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>

            {note.tags.map((t, idx) => (
              <span
                key={idx}
                onClick={() => onTagClick?.(t)}
                className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
              >
                {t}
              </span>
            ))}

            {/* Subtle Pill for AI Suggestions if available */}
            {relatedSuggestions.length > 0 && (
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium transition-colors"
              >
                <Lightbulb className="w-3 h-3" />
                <span>{relatedSuggestions.length} AI quick notes available</span>
                {showSuggestions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* View / Edit Mode & Format Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setIsPreview(false)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                !isPreview ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Edit mode"
            >
              <Edit3 className="w-3 h-3" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() => setIsPreview(true)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                isPreview ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Preview mode"
            >
              <Eye className="w-3 h-3" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* ULTRA-COMPACT AI SUMMARY STRIP (Takes ~32px, expands on demand) */}
      <AISummaryCard
        summary={note.summary}
        onRefresh={onRefreshSummary}
        isLoading={isSummaryLoading}
        onTagClick={onTagClick}
      />

      {/* Conditionally rendered AI Contextual Suggestions Tray */}
      {showSuggestions && relatedSuggestions.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-zinc-900/80 border border-indigo-500/20 text-xs space-y-2">
          <div className="flex items-center justify-between text-indigo-300 font-medium">
            <span className="flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
              <span>Related Quick Notes from your Scratchpad:</span>
            </span>
            <button 
              onClick={() => setShowSuggestions(false)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {relatedSuggestions.slice(0, 4).map((sug, idx) => (
              <div
                key={idx}
                className="p-2 rounded bg-zinc-950/80 border border-zinc-800 flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-zinc-300 line-clamp-2 leading-relaxed text-[11px]">
                    {sug.quickNote.content}
                  </p>
                  <span className="text-[10px] text-indigo-400/80 block mt-1">
                    {sug.reason}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleLinkQuickNote(sug.quickNote)}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                    title="Insert reference into note"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onNavigateToNote(sug.quickNote.id)}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                    title="Open quick note"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discreet Formatting Bar (Only in Edit mode) */}
      {!isPreview && (
        <div className="mb-2 flex items-center gap-1 text-zinc-500 text-xs">
          <button
            onClick={() => insertText('**', '**')}
            className="p-1 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertText('*', '*')}
            className="p-1 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertText('`', '`')}
            className="p-1 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            title="Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertText('\n- ')}
            className="p-1 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3 bg-zinc-800 mx-1" />
          <button
            onClick={() => insertText('[[', ']]')}
            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-[11px] font-mono flex items-center gap-1 transition-colors"
            title="Insert [[Wiki Link]]"
          >
            <Link2 className="w-3 h-3 text-indigo-400" />
            <span>[[link]]</span>
          </button>
        </div>
      )}

      {/* Expansive Writing Area: Hero of the page */}
      <div className="flex-1 flex flex-col min-h-[450px]">
        {isPreview ? (
          <div className="flex-1 p-6 rounded-lg bg-zinc-950/40 border border-zinc-800/60 text-zinc-200 leading-relaxed text-sm">
            {note.content.split('\n\n').map((para, i) => {
              const parts = para.split(/(\[\[.*?\]\])/g);
              return (
                <p key={i} className="mb-4">
                  {parts.map((part, j) => {
                    if (part.startsWith('[[') && part.endsWith(']]')) {
                      const title = part.slice(2, -2).trim();
                      return (
                        <button
                          key={j}
                          onClick={() => onNavigateToNote(title)}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-medium mx-0.5 transition-colors"
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
            placeholder="Type your thoughts, [[ to link pages, or # to tag..."
            className="flex-1 w-full p-5 rounded-lg bg-zinc-950/40 border border-zinc-800/60 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 font-sans text-sm leading-relaxed resize-none transition-colors"
          />
        )}
      </div>

      {/* COMPACT COLLAPSIBLE BACKLINKS (Only 1 line when collapsed!) */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80">
        <button
          onClick={() => setShowBacklinks(!showBacklinks)}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {showBacklinks ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <Link2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Bi-directional Backlinks ({backlinks.length})</span>
        </button>

        {showBacklinks && (
          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {backlinks.length > 0 ? (
              backlinks.map((bNote) => (
                <button
                  key={bNote.id}
                  onClick={() => onNavigateToNote(bNote.id)}
                  className="text-left p-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/70 border border-zinc-800 transition-all group"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-300 group-hover:text-indigo-300 font-medium">
                    <span className="truncate">{bNote.title}</span>
                    <ArrowUpRight className="w-3 h-3 text-zinc-500 group-hover:text-indigo-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                    {bNote.content.replace(/[#*`]/g, '')}
                  </p>
                </button>
              ))
            ) : (
              <div className="col-span-full py-2 text-xs text-zinc-600">
                No other notes link to this page yet. Type <code className="text-zinc-400">[[{note.title}]]</code> in any note to link.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
