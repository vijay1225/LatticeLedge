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
  Sparkles,
  Expand,
  FoldHorizontal,
  Maximize2,
  Save,
  Check,
  ChevronLeft,
  Trash2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight
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
  onNewPage?: () => void;
  onTagClick?: (tag: string) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  hasApiKey?: boolean;
  onOpenSettings?: () => void;
  summaryError?: string | null;
  onBackToPages?: () => void;
  onDeletePage?: (id: string) => void;
  isOnline?: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  allNotes,
  onUpdateNote,
  onRefreshSummary,
  isSummaryLoading,
  onNavigateToNote,
  onNewPage,
  onTagClick,
  isFocusMode,
  onToggleFocusMode,
  hasApiKey,
  onOpenSettings,
  summaryError,
  onBackToPages,
  onDeletePage,
  isOnline = true
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [justSaved, setJustSaved] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [localTitle, setLocalTitle] = useState(note.title);

  useEffect(() => {
    setLocalTitle(note.title);
  }, [note.id]);

  // Auto-Save Toggle (persisted in localStorage, defaults to true)
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('LATTICE_LEDGER_AUTO_SAVE');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const toggleAutoSave = () => {
    setIsAutoSaveEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('LATTICE_LEDGER_AUTO_SAVE', String(next));
      } catch {}
      return next;
    });
  };

  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = React.useRef<Partial<Note>>({});

  const flushPendingSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (Object.keys(pendingChangesRef.current).length > 0) {
      onUpdateNote(pendingChangesRef.current);
      pendingChangesRef.current = {};
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const triggerChange = (partial: Partial<Note>) => {
    pendingChangesRef.current = { ...pendingChangesRef.current, ...partial };

    if (isAutoSaveEnabled) {
      setSaveStatus('saving');
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        flushPendingSave();
      }, 600);
    } else {
      setSaveStatus('unsaved');
    }
  };

  // Immediate manual save (Ctrl+S or Save button)
  const handleManualSave = () => {
    if (!editor) return;
    setSaveStatus('saving');
    const markdown = (editor.storage as any).markdown?.getMarkdown() || editor.getText();
    pendingChangesRef.current.content = markdown;
    pendingChangesRef.current.title = localTitle;
    flushPendingSave();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  // Safe flush on unmount, note change, or beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushPendingSave();
    };
  }, [note.id]);

  // Full-width vs standard reading width toggle (defaults to true for maximum writing space)
  const [isFullWidth, setIsFullWidth] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('LATTICE_LEDGER_FULL_WIDTH');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const toggleFullWidth = () => {
    setIsFullWidth(prev => {
      const next = !prev;
      try {
        localStorage.setItem('LATTICE_LEDGER_FULL_WIDTH', String(next));
      } catch {}
      return next;
    });
  };

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
      // Extract clean Markdown directly from the formatted editor and trigger debounced auto-save
      const markdown = (editor.storage as any).markdown?.getMarkdown() || editor.getText();
      triggerChange({ content: markdown });
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  // Sync editor content when switching between notes
  useEffect(() => {
    if (editor && note) {
      const currentMarkdown = (editor.storage as any).markdown?.getMarkdown() || '';
      if (currentMarkdown.trim() !== note.content.trim()) {
        editor.commands.setContent(note.content);
      }
    }
  }, [note.id, editor]);

  // Handle clicking [[Wiki Links]] directly inside the formatted editor ONLY when clicking inside the brackets
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Direct link click if inside an anchor or explicit link badge
    const wikiAttr = target.getAttribute('data-wiki-link') || target.closest('[data-wiki-link]')?.getAttribute('data-wiki-link');
    if (wikiAttr) {
      e.preventDefault();
      onNavigateToNote(wikiAttr.trim());
      return;
    }

    // Precise hit-testing by checking caret character position
    let textNode: Node | null = null;
    let offset = 0;

    if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        textNode = range.startContainer;
        offset = range.startOffset;
      }
    } else if ((document as any).caretPositionFromPoint) {
      const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) {
        textNode = pos.offsetNode;
        offset = pos.offset;
      }
    }

    if (textNode && textNode.nodeType === Node.TEXT_NODE && textNode.nodeValue) {
      const text = textNode.nodeValue;
      const regex = /\[\[(.*?)\]\]/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        const linkStart = m.index;
        const linkEnd = m.index + m[0].length;
        // Strictly only navigate if the click point falls directly inside [[...]]
        if (offset >= linkStart && offset <= linkEnd) {
          e.preventDefault();
          onNavigateToNote(m[1].trim());
          return;
        }
      }
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
    <div 
      className={`flex-1 h-full min-h-0 overflow-y-auto block select-text transition-all duration-150 pb-36 md:pb-16 ${
        isFullWidth || isFocusMode
          ? 'w-full max-w-none px-4 sm:px-8 lg:px-12 py-5' 
          : 'max-w-4xl mx-auto px-4 sm:px-6 py-5 w-full'
      }`}
    >
      {/* Back to Pages Breadcrumb */}
      {onBackToPages && (
        <div className="mb-2.5 flex items-center gap-1.5 text-xs text-zinc-500">
          <button
            onClick={onBackToPages}
            className="flex items-center gap-1 text-zinc-400 hover:text-indigo-300 font-medium transition-colors"
            title="Return to Pages list"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Pages</span>
          </button>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-400 truncate max-w-[260px]">{note.title || 'Untitled'}</span>
        </div>
      )}

      {/* Title Bar */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={localTitle}
            onChange={(e) => {
              setLocalTitle(e.target.value);
              triggerChange({ title: e.target.value });
            }}
            placeholder="Untitled Page..."
            className="w-full text-2xl lg:text-3xl font-bold bg-transparent text-zinc-100 placeholder-zinc-700 focus:outline-none tracking-tight border-none p-0"
          />

          <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-600" />
              <span>Updated {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>

            <span className="flex items-center gap-1 text-[11px]">
              {saveStatus === 'saving' ? (
                <span className="text-amber-400 font-medium animate-pulse">● Auto-saving...</span>
              ) : saveStatus === 'unsaved' ? (
                <span className="text-amber-400 font-medium">● Unsaved changes</span>
              ) : (
                <span className="text-emerald-400/90 font-medium">● Saved to SQLite {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
              )}
            </span>

            {isOnline === false && (
              <span
                className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/60 border border-amber-600/40 px-2 py-0.5 rounded-full font-medium shadow-sm animate-pulse"
                title="Internet is offline. Edits are saved to local SQLite, but not synced to Google Drive until connected."
              >
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>File not synced (Offline)</span>
              </span>
            )}

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

        {/* Header Controls: Auto-save, Save, New Page, Delete, Full Width & Focus Mode */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {/* Auto-Save Toggle */}
          <button
            type="button"
            onClick={toggleAutoSave}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              isAutoSaveEnabled
                ? 'bg-zinc-900 border-emerald-500/30 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title={isAutoSaveEnabled ? "Auto-Save is active (changes automatically save to SQLite)" : "Auto-Save is off (click to enable)"}
          >
            {isAutoSaveEnabled ? <ToggleRight className="w-3.5 h-3.5 text-emerald-400" /> : <ToggleLeft className="w-3.5 h-3.5 text-zinc-500" />}
            <span className="hidden sm:inline">Auto-save: {isAutoSaveEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Manual Save Button */}
          <button
            type="button"
            onClick={handleManualSave}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all shadow-sm ${
              justSaved
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-700/80 active:scale-95'
            }`}
            title="Save note to SQLite (Ctrl+S)"
          >
            {justSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save</span>
              </>
            )}
          </button>

          {/* Delete Page Button */}
          {onDeletePage && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 transition-colors shadow-sm"
              title="Delete this page"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          {onNewPage && (
            <button
              onClick={onNewPage}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 transition-colors shadow-sm"
              title="Create a new Wiki Page"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Page</span>
            </button>
          )}

          <button
            onClick={toggleFullWidth}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              isFullWidth
                ? 'bg-zinc-800 text-indigo-300 border-zinc-700 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title={isFullWidth ? "Switch to standard readable width" : "Expand to full-width wide canvas"}
          >
            {isFullWidth ? <FoldHorizontal className="w-3.5 h-3.5 text-indigo-400" /> : <Expand className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullWidth ? 'Full Width' : 'Standard Width'}</span>
          </button>

          {onToggleFocusMode && (
            <button
              onClick={onToggleFocusMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                isFocusMode
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-sm font-semibold'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Focus / Zen Mode (Hides all sidebars for distraction-free writing)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">{isFocusMode ? 'Exit Focus' : 'Focus Mode'}</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-900/40 px-2 py-1 rounded-md border border-zinc-800/80 shrink-0">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>WYSIWYG</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Delete Page</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete <strong>"{note.title}"</strong>? This will permanently remove this page from your SQLite vault.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeletePage?.(note.id);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors active:scale-95"
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALWAYS EXPANDED AI SUMMARY CARD (Strictly <= 4 lines) */}
      <AISummaryCard
        summary={note.summary}
        onRefresh={onRefreshSummary}
        isLoading={isSummaryLoading}
        onTagClick={onTagClick}
        hasApiKey={hasApiKey}
        onOpenSettings={onOpenSettings}
        errorMessage={summaryError}
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
        className="w-full rounded-lg bg-zinc-900/20 border border-zinc-800/70 hover:border-zinc-700/80 transition-colors cursor-text min-h-[280px] h-auto block shadow-sm mb-12 clear-both"
      >
        <EditorContent editor={editor} className="w-full h-auto block" />
      </div>

      {/* BI-DIRECTIONAL BACKLINKS HUB: Shows parent and referring notes */}
      <div className="w-full mt-10 pt-6 border-t-2 border-zinc-800/90 space-y-4 block clear-both">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bi-directional Backlinks ({backlinks.length})</span>
            </div>
            <span className="text-[11px] text-zinc-500">Notes that reference this page</span>
          </div>

          {backlinks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {backlinks.map((bNote) => (
                <button
                  key={bNote.id}
                  type="button"
                  onClick={() => onNavigateToNote(bNote.id)}
                  className="text-left p-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/40 transition-all group"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-200 group-hover:text-emerald-300 font-medium mb-1">
                    <span className="truncate">{bNote.title}</span>
                    <ArrowUpRight className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                    {bNote.content.replace(/[#*`]/g, '').slice(0, 100)}
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
    </div>
  );
};
