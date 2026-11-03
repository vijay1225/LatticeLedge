import React, { useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Code, 
  List, 
  CheckSquare, 
  Quote, 
  Link2, 
  Heading1, 
  Heading2, 
  Heading3, 
  Clock, 
  ArrowUpRight, 
  Lightbulb, 
  Plus,
  Sparkles
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

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
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Compute backlinks (notes that point to this note)
  const backlinks = findBacklinks(note.title, allNotes);

  // Compute contextual suggestions (quick notes related to this page)
  const relatedSuggestions = findRelatedQuickNotes(note, allNotes);

  // Initialize TipTap Live In-Place WYSIWYG Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Placeholder.configure({
        placeholder: 'Write directly on this page... Type # for headings, - [ ] for checklists, > for quotes, or [[ to link...'
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: '-'
      })
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class: 'tiptap ProseMirror px-5 py-4 focus:outline-none'
      }
    },
    onUpdate: ({ editor }) => {
      // Extract clean Markdown directly from the formatted editor
      const markdown = (editor.storage as any).markdown?.getMarkdown() || editor.getText();
      onUpdateNote({ content: markdown });
    }
  });

  // Sync editor content when switching between notes
  useEffect(() => {
    if (editor && note) {
      const currentMarkdown = (editor.storage as any).markdown?.getMarkdown() || '';
      if (currentMarkdown.trim() !== note.content.trim()) {
        editor.commands.setContent(note.content);
      }
    }
  }, [note.id, editor]);

  // Handle clicking [[Wiki Links]] directly inside the formatted editor
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const text = target.innerText || target.textContent || '';
    
    // Check if clicked text matches [[Wiki Link]] pattern
    const match = text.match(/\[\[(.*?)\]\]/);
    if (match) {
      e.preventDefault();
      onNavigateToNote(match[1].trim());
    }
  };

  const insertWikiLink = () => {
    if (!editor) return;
    editor.chain().focus().insertContent('[[Page Name]]').run();
  };

  const handleLinkQuickNote = (qNote: Note) => {
    if (!editor) return;
    const quote = `\n> Reference: "${qNote.content.slice(0, 80)}..."\n`;
    editor.chain().focus().insertContent(quote).run();
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-6 lg:px-12 py-6 max-w-5xl mx-auto w-full flex flex-col select-text">
      {/* Title Bar */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={note.title}
            onChange={(e) => onUpdateNote({ title: e.target.value })}
            placeholder="Untitled Page..."
            className="w-full text-2xl lg:text-3xl font-bold bg-transparent text-zinc-100 placeholder-zinc-700 focus:outline-none tracking-tight border-none p-0"
          />

          <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-600" />
              <span>Updated {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

            {relatedSuggestions.length > 0 && (
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium transition-colors"
              >
                <Lightbulb className="w-3 h-3" />
                <span>{relatedSuggestions.length} related quick notes</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-900/60 px-2 py-1 rounded-md border border-zinc-800 shrink-0">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Live Formatted Canvas</span>
        </div>
      </div>

      {/* ALWAYS EXPANDED AI SUMMARY CARD (Strictly <= 4 lines) */}
      <AISummaryCard
        summary={note.summary}
        onRefresh={onRefreshSummary}
        isLoading={isSummaryLoading}
        onTagClick={onTagClick}
      />

      {/* AI Contextual Suggestions Tray */}
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
                className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800 flex items-start justify-between gap-2"
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

      {/* 1-Click Formatting Ribbon (No need to memorize markdown symbols!) */}
      {editor && (
        <div className="sticky top-0 z-20 mb-2 flex items-center gap-0.5 p-1 bg-zinc-900/90 border border-zinc-800 rounded-lg text-zinc-400 backdrop-blur-md text-xs shadow-sm flex-wrap">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-zinc-800 text-indigo-400 font-bold' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            title="Heading 1 (#)"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-zinc-800 text-indigo-400 font-bold' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            title="Heading 2 (##)"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-zinc-800 text-indigo-400 font-bold' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            title="Heading 3 (###)"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-zinc-800 mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-zinc-800 text-indigo-400 font-bold' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            title="Bold (**text**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-zinc-800 text-indigo-400 font-bold' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            title="Italic (*text*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('code') ? 'bg-zinc-800 text-indigo-400 font-bold' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            title="Code (`code`)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-zinc-800 mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-zinc-800 text-indigo-400 font-bold' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            title="Bullet List (-)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('taskList') ? 'bg-zinc-800 text-indigo-400 font-bold' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            title="Checklist / Tasks"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('blockquote') ? 'bg-zinc-800 text-indigo-400 font-bold' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            title="Quote (>)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-zinc-800 mx-1" />

          <button
            onClick={insertWikiLink}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-indigo-300 text-[11px] font-mono flex items-center gap-1 transition-colors"
            title="Insert [[Wiki Link]]"
          >
            <Link2 className="w-3 h-3 text-indigo-400" />
            <span>[[link]]</span>
          </button>
        </div>
      )}

      {/* TRUE IN-PLACE WYSIWYG CANVAS: Write directly in formatted text */}
      <div 
        onClick={handleEditorClick}
        className="flex-1 rounded-lg bg-zinc-900/30 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors cursor-text"
      >
        <EditorContent editor={editor} />
      </div>

      {/* BI-DIRECTIONAL BACKLINKS - ALWAYS VISIBLE / UNCOLLAPSED */}
      <div className="mt-8 pt-4 border-t border-zinc-800/80">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          <Link2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Bi-directional Backlinks ({backlinks.length})</span>
        </div>

        {backlinks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {backlinks.map((bNote) => (
              <button
                key={bNote.id}
                onClick={() => onNavigateToNote(bNote.id)}
                className="text-left p-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-indigo-500/30 transition-all group"
              >
                <div className="flex items-center justify-between text-xs text-zinc-200 group-hover:text-indigo-300 font-medium mb-1">
                  <span className="truncate">{bNote.title}</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-500 group-hover:text-indigo-400 shrink-0" />
                </div>
                <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                  {bNote.content.replace(/[#*`]/g, '')}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/40 text-xs text-zinc-500">
            No other notes link to this page yet. Type <code className="text-zinc-300 font-mono">[[{note.title}]]</code> in any note to link.
          </div>
        )}
      </div>
    </div>
  );
};
