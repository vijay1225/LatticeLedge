import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  CheckSquare, 
  Plus, 
  Search, 
  Trash2, 
  ArrowUpCircle, 
  Link2,
  Check
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

import { Note } from '../types';
import { CustomCodeBlockNode, CustomImageNode, CustomVideoNode } from './editor/editorExtensions';
import { WikiLinkSuggestionPopup } from './editor/WikiLinkSuggestionPopup';
import { saveAsset, getYoutubeEmbedUrl, isVideoEmbedUrl, isYoutubeShort } from '../services/assetService';

interface JournalsViewProps {
  notes: Note[];
  onSaveJournal: (dateKey: string, content: string, title?: string) => void;
  onDeleteJournal: (id: string) => void;
  onNavigateToNote: (titleOrId: string) => void;
  onTagClick?: (tag: string) => void;
  allWikiPages?: Note[];
  allQuickNotes?: Note[];
  onEnsurePageExists?: (title: string) => Note | undefined;
}

/**
 * Format Date to standard YYYY-MM-DD ISO key
 */
const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format Date to readable Logseq header e.g. "Tuesday, November 10, 2026"
 */
const formatDisplayDate = (d: Date): string => {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Strips backslashes added by tiptap-markdown serializer to preserve clean [[Wiki Links]].
 */
const getCleanMarkdown = (raw: string): string => {
  if (!raw) return '';
  return raw
    .replace(/\\+\[\\+\[/g, '[[')
    .replace(/\\+\]\\+\]/g, ']]');
};

/**
 * Single Day Realtime TipTap Markdown Canvas
 */
interface JournalDayCanvasProps {
  dateKey: string;
  displayTitle: string;
  initialContent: string;
  isToday: boolean;
  isYesterday: boolean;
  hasExistingNote: boolean;
  onSave: (dateKey: string, content: string, title?: string) => void;
  onDelete?: () => void;
  onNavigateToNote: (titleOrId: string) => void;
  onEnsurePageExists?: (title: string) => Note | undefined;
  allNotes: Note[];
}

const JournalDayCanvas: React.FC<JournalDayCanvasProps> = ({
  dateKey,
  displayTitle,
  initialContent,
  isToday,
  isYesterday,
  hasExistingNote,
  onSave,
  onDelete,
  onNavigateToNote,
  onEnsurePageExists,
  allNotes
}) => {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [justSaved, setJustSaved] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);

  // WikiLink suggestion state
  const [wikiSuggestion, setWikiSuggestion] = useState<{
    isOpen: boolean;
    query: string;
    startPos: number;
    endPos: number;
    coords: { left: number; top: number; bottom: number } | null;
    selectedIndex: number;
  }>({
    isOpen: false,
    query: '',
    startPos: 0,
    endPos: 0,
    coords: null,
    selectedIndex: 0
  });

  const wikiSuggestionRef = useRef(wikiSuggestion);
  wikiSuggestionRef.current = wikiSuggestion;

  const currentJournalId = `journal-${dateKey}`;
  const safeNotes = Array.isArray(allNotes) ? allNotes : [];
  const wikiPages = safeNotes.filter(n => n && n.type === 'wiki' && n.title);
  const cleanQuery = (wikiSuggestion.query || '').trim().toLowerCase();
  const hasExactMatch = wikiPages.some(n => (n.title || '').toLowerCase() === cleanQuery);
  const matchingPages = cleanQuery
    ? wikiPages.filter(n => (n.title || '').toLowerCase().includes(cleanQuery))
    : wikiPages;
  const shouldShowCreateNew = cleanQuery.length > 0 && !hasExactMatch && cleanQuery !== 'pagename' && cleanQuery !== 'page name';
  const totalItemsCount = matchingPages.length + (shouldShowCreateNew ? 1 : 0);

  const totalItemsCountRef = useRef(totalItemsCount);
  totalItemsCountRef.current = totalItemsCount;
  const matchingPagesRef = useRef(matchingPages);
  matchingPagesRef.current = matchingPages;
  const shouldShowCreateNewRef = useRef(shouldShowCreateNew);
  shouldShowCreateNewRef.current = shouldShowCreateNew;

  // Apply selected wiki suggestion
  const applyWikiSuggestion = (pageTitle: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    const cleanTitle = (pageTitle || '').trim();
    if (!cleanTitle) return;

    const { startPos, endPos } = wikiSuggestionRef.current;

    const exists = safeNotes.some(n => (n.title || '').toLowerCase() === cleanTitle.toLowerCase());
    if (!exists && cleanTitle.toLowerCase() !== 'pagename' && cleanTitle.toLowerCase() !== 'page name') {
      onEnsurePageExists?.(cleanTitle);
    }

    ed.chain()
      .focus()
      .deleteRange({ from: startPos, to: endPos })
      .insertContent(`[[${cleanTitle}]] `)
      .run();

    setWikiSuggestion(prev => ({ ...prev, isOpen: false }));
  };

  // Inspect editor text to check if [[ is being typed
  const checkWikiSuggestion = (editorInstance: any) => {
    if (!editorInstance) return;
    const { state } = editorInstance;
    if (!state || !state.selection || !state.doc) return;
    const { from, to } = state.selection;

    if (from !== to) {
      if (wikiSuggestionRef.current.isOpen) {
        setWikiSuggestion(prev => ({ ...prev, isOpen: false }));
      }
      return;
    }

    const lookback = Math.max(0, from - 80);
    const textBefore = state.doc.textBetween(lookback, from, '\n', '\0');

    const match = textBefore.match(/\[\[([^\]\n]*)$/);
    if (match) {
      const query = match[1] || '';
      const startPos = Math.max(0, from - match[0].length);
      const endPos = from;

      try {
        let coords: { left: number; top: number; bottom: number } | null = null;
        if (editorInstance.view?.coordsAtPos) {
          const rawCoords = editorInstance.view.coordsAtPos(from);
          if (rawCoords && typeof rawCoords.left === 'number' && typeof rawCoords.bottom === 'number') {
            coords = {
              left: rawCoords.left,
              top: rawCoords.top,
              bottom: rawCoords.bottom
            };
          }
        }
        if (!coords) {
          coords = { left: 40, top: 120, bottom: 140 };
        }
        setWikiSuggestion({
          isOpen: true,
          query,
          startPos,
          endPos,
          coords,
          selectedIndex: 0
        });
      } catch {
        setWikiSuggestion({
          isOpen: true,
          query,
          startPos,
          endPos,
          coords: { left: 40, top: 120, bottom: 140 },
          selectedIndex: 0
        });
      }
    } else {
      if (wikiSuggestionRef.current.isOpen) {
        setWikiSuggestion(prev => ({ ...prev, isOpen: false }));
      }
    }
  };

  const flushSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const ed = editorRef.current;
    if (!ed) return;
    const raw = (ed.storage as any).markdown?.getMarkdown() || ed.getText();
    const clean = getCleanMarkdown(raw);
    onSave(dateKey, clean, displayTitle);
    setSaveStatus('saved');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const scheduleSave = () => {
    setSaveStatus('saving');
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      flushSave();
    }, 600);
  };

  // TipTap Live In-Place Realtime Markdown Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3]
        }
      }),
      CustomCodeBlockNode,
      CustomImageNode,
      CustomVideoNode,
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Placeholder.configure({
        placeholder: isToday
          ? "Write today's journal... Type # for headings, - [ ] for TODOs, [[ to link pages..."
          : `Log journal for ${displayTitle}...`
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        transformPastedText: true,
        transformCopiedText: true
      })
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'tiptap ProseMirror focus:outline-none'
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
              const file = items[i].getAsFile();
              if (file) {
                event.preventDefault();
                saveAsset(file).then(({ assetPath }) => {
                  if (view.state.schema.nodes.image) {
                    const tr = view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({
                        src: assetPath,
                        alt: file.name,
                        title: file.name
                      })
                    );
                    view.dispatch(tr);
                  }
                });
                return true;
              }
            }
            if (items[i].type.startsWith('video/')) {
              const file = items[i].getAsFile();
              if (file) {
                event.preventDefault();
                saveAsset(file).then(({ assetPath }) => {
                  if (view.state.schema.nodes.video) {
                    const tr = view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.video.create({
                        src: assetPath,
                        controls: true,
                        isYoutube: false
                      })
                    );
                    view.dispatch(tr);
                  }
                });
                return true;
              }
            }
          }
        }

        const text = event.clipboardData?.getData('text/plain')?.trim();
        if (text && isVideoEmbedUrl(text)) {
          event.preventDefault();
          const embedUrl = getYoutubeEmbedUrl(text);
          const isShort = isYoutubeShort(text);
          if (view.state.schema.nodes.video) {
            const tr = view.state.tr.replaceSelectionWith(
              view.state.schema.nodes.video.create({
                src: embedUrl,
                isYoutube: true,
                isShort
              })
            );
            view.dispatch(tr);
            return true;
          }
        }
        return false;
      },
      handleKeyDown: (_view, event) => {
        if (wikiSuggestionRef.current.isOpen) {
          const total = totalItemsCountRef.current;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (total > 0) {
              setWikiSuggestion(prev => ({
                ...prev,
                selectedIndex: (prev.selectedIndex + 1) % total
              }));
            }
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (total > 0) {
              setWikiSuggestion(prev => ({
                ...prev,
                selectedIndex: (prev.selectedIndex - 1 + total) % total
              }));
            }
            return true;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            const currIdx = wikiSuggestionRef.current.selectedIndex;
            const matches = matchingPagesRef.current;
            if (currIdx < matches.length) {
              applyWikiSuggestion(matches[currIdx].title);
            } else if (shouldShowCreateNewRef.current) {
              applyWikiSuggestion(wikiSuggestionRef.current.query.trim());
            }
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setWikiSuggestion(prev => ({ ...prev, isOpen: false }));
            return true;
          }
        }
        return false;
      },
      handleDOMEvents: {
        blur: () => {
          flushSave();
          return false;
        }
      }
    },
    onUpdate: ({ editor }) => {
      const { state } = editor;
      const { from } = state.selection;
      const lookback = Math.max(0, from - 120);
      const textBefore = state.doc.textBetween(lookback, from, '\n', '\0');

      // Check if user just typed closing ]]
      const closedMatch = textBefore.match(/\[\[([^\]\n]+)\]\]$/);
      if (closedMatch) {
        const rawTitle = closedMatch[1].trim();
        if (
          rawTitle &&
          rawTitle.toLowerCase() !== 'pagename' &&
          rawTitle.toLowerCase() !== 'page name'
        ) {
          const exists = safeNotes.some(n => (n.title || '').toLowerCase() === rawTitle.toLowerCase());
          if (!exists) {
            onEnsurePageExists?.(rawTitle);
          }
        }
        setWikiSuggestion(prev => ({ ...prev, isOpen: false }));
      } else {
        checkWikiSuggestion(editor);
      }

      scheduleSave();
    },
    onSelectionUpdate: ({ editor }) => {
      checkWikiSuggestion(editor);
    }
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync external changes if not actively focused
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const current = getCleanMarkdown((editor.storage as any).markdown?.getMarkdown() || '');
      if (current.trim() !== initialContent.trim() && !editor.isFocused) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [initialContent, editor]);

  // Flush on unmount and before window unload
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (editorRef.current) {
        const raw = (editorRef.current.storage as any)?.markdown?.getMarkdown() || editorRef.current.getText() || '';
        const clean = getCleanMarkdown(raw);
        onSave(dateKey, clean, displayTitle);
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (editorRef.current) {
        const raw = (editorRef.current.storage as any)?.markdown?.getMarkdown() || editorRef.current.getText() || '';
        const clean = getCleanMarkdown(raw);
        onSave(dateKey, clean, displayTitle);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dateKey]);

  // Handle clicking [[Wiki Links]] directly inside the editor
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const wikiAttr = target.getAttribute('data-wiki-link') || target.closest('[data-wiki-link]')?.getAttribute('data-wiki-link');
    if (wikiAttr) {
      e.preventDefault();
      onNavigateToNote(wikiAttr.trim());
      return;
    }

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
        if (offset >= linkStart && offset <= linkEnd) {
          e.preventDefault();
          onNavigateToNote(m[1].trim());
          return;
        }
      }
    }
  };

  const handleInsertTodo = () => {
    if (!editor) return;
    const isDocEmpty = editor.isEmpty;
    if (isDocEmpty) {
      editor.chain().focus().insertContent('- [ ] ').run();
    } else {
      editor.chain().focus().insertContent('\n- [ ] ').run();
    }
  };

  const handleInsertBullet = () => {
    if (!editor) return;
    const isDocEmpty = editor.isEmpty;
    if (isDocEmpty) {
      editor.chain().focus().insertContent('- ').run();
    } else {
      editor.chain().focus().insertContent('\n- ').run();
    }
  };

  const handleInsertWikiLink = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      const selected = editor.state.doc.textBetween(from, to);
      editor.chain().focus().insertContent(`[[${selected}]]`).run();
    } else {
      editor.chain().focus().insertContent('[[').run();
    }
  };

  return (
    <div className="w-full relative group/day">
      {/* Day Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>{displayTitle}</span>
          </h2>

          {isToday && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-[11px] border border-emerald-500/30">
              Today
            </span>
          )}
          {isYesterday && (
            <span className="px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 font-medium text-[11px]">
              Yesterday
            </span>
          )}
          {!isToday && !isYesterday && (
            <span className="text-[11px] font-mono text-zinc-500">
              {dateKey}
            </span>
          )}
        </div>

        {/* Subtle Day Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {saveStatus === 'saving' && (
            <span className="text-[11px] text-zinc-500 mr-1 animate-pulse">
              Saving...
            </span>
          )}
          {justSaved && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mr-1">
              <Check className="w-3 h-3" />
              <span>Saved</span>
            </span>
          )}

          {/* + TODO */}
          <button
            type="button"
            onClick={handleInsertTodo}
            className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-300 hover:text-amber-200 text-xs font-medium flex items-center gap-1 transition-colors shadow-sm"
            title="Insert checklist TODO"
          >
            <CheckSquare className="w-3 h-3 text-amber-400" />
            <span>+ TODO</span>
          </button>

          {/* • Bullet */}
          <button
            type="button"
            onClick={handleInsertBullet}
            className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors shadow-sm"
            title="Insert bullet point"
          >
            <span>• Bullet</span>
          </button>

          {/* [[ ]] */}
          <button
            type="button"
            onClick={handleInsertWikiLink}
            className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-indigo-300 hover:text-indigo-200 text-xs font-medium flex items-center gap-1 transition-colors shadow-sm"
            title="Insert Wiki Link reference"
          >
            <Link2 className="w-3 h-3 text-indigo-400" />
            <span>[[ ]]</span>
          </button>

          {/* Delete Day Note if exists in database */}
          {hasExistingNote && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded text-zinc-600 hover:text-rose-400 transition-colors ml-1"
              title="Delete this day's entry"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Realtime Markdown Canvas: Click anywhere to edit directly */}
      <div 
        className="tiptap-journal-canvas text-sm relative"
        onClick={handleEditorClick}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Floating WikiLink Suggestion Popup */}
      <WikiLinkSuggestionPopup
        isOpen={wikiSuggestion.isOpen}
        query={wikiSuggestion.query}
        coords={wikiSuggestion.coords}
        allNotes={safeNotes}
        currentNoteId={currentJournalId}
        selectedIndex={wikiSuggestion.selectedIndex}
        onSelect={applyWikiSuggestion}
        onClose={() => setWikiSuggestion(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export const JournalsView: React.FC<JournalsViewProps> = ({
  notes,
  onSaveJournal,
  onDeleteJournal,
  onNavigateToNote,
  onEnsurePageExists
}) => {
  const today = new Date();
  const todayKey = formatDateKey(today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomDate, setSelectedCustomDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const todaySectionRef = useRef<HTMLDivElement | null>(null);

  // Filter notes that are journals
  const journalNotes = notes.filter(n => n.type === 'journal');

  // Map of dateKey -> Note
  const journalMap = new Map<string, Note>();
  journalNotes.forEach(n => {
    const match = n.id.match(/\d{4}-\d{2}-\d{2}/) || (n.title || '').match(/\d{4}-\d{2}-\d{2}/);
    const key = match ? match[0] : formatDateKey(new Date(n.createdAt));
    journalMap.set(key, n);
  });

  // Collect all unique date keys to display in reverse chronological order
  const allDateKeysSet = new Set<string>();
  allDateKeysSet.add(todayKey); // Always include Today at the top
  journalMap.forEach((_, key) => allDateKeysSet.add(key));

  if (selectedCustomDate) {
    allDateKeysSet.add(selectedCustomDate);
  }

  const sortedDateKeys = Array.from(allDateKeysSet).sort((a, b) => b.localeCompare(a));

  const handleJumpToToday = () => {
    if (todaySectionRef.current) {
      todaySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const filteredDateKeys = sortedDateKeys.filter(key => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const note = journalMap.get(key);
    const text = (note?.content || '').toLowerCase();
    const dateObj = new Date(key + 'T00:00:00');
    const dateDisplay = formatDisplayDate(dateObj).toLowerCase();
    return key.includes(query) || dateDisplay.includes(query) || text.includes(query);
  });

  return (
    <div 
      ref={containerRef}
      className="flex-1 h-full overflow-y-auto block select-text px-4 sm:px-8 lg:px-14 py-8 pb-36 md:pb-24 max-w-4xl mx-auto w-full text-xs"
    >
      {/* Top Header & Navigation Bar */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span>Journals & Daily Stream</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Logseq-style continuous canvas with real-time markdown.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Jump to Today */}
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            title="Jump to Today's Journal"
          >
            <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Today</span>
          </button>

          {/* Add Specific Past/Future Date */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              title="Add or Jump to Specific Date"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Select Date</span>
            </button>

            {showDatePicker && (
              <div className="absolute right-0 mt-2 z-30 p-3 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-2 w-56 animate-in fade-in">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Choose Date:
                </label>
                <input
                  type="date"
                  value={selectedCustomDate}
                  onChange={(e) => {
                    setSelectedCustomDate(e.target.value);
                    setShowDatePicker(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Search in Journals */}
      <div className="mb-8">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search daily entries, tasks, #tags, or [[pages]]..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-200 placeholder-zinc-500 text-xs focus:outline-none focus:border-emerald-500/60"
          />
        </div>
      </div>

      {/* Continuous Journal Stream: Dates separated strictly with lines */}
      <div className="space-y-0">
        {filteredDateKeys.map((dateKey, index) => {
          const isToday = dateKey === todayKey;
          const isYesterday = dateKey === yesterdayKey;
          const dateObj = new Date(dateKey + 'T00:00:00');
          const displayHeader = isNaN(dateObj.getTime()) ? dateKey : formatDisplayDate(dateObj);
          const existingNote = journalMap.get(dateKey);

          return (
            <React.Fragment key={dateKey}>
              {index > 0 && (
                <hr className="border-t border-zinc-800/80 my-8 sm:my-12" />
              )}
              <div ref={isToday ? todaySectionRef : undefined}>
                <JournalDayCanvas
                  dateKey={dateKey}
                  displayTitle={displayHeader}
                  initialContent={existingNote ? existingNote.content : ''}
                  isToday={isToday}
                  isYesterday={isYesterday}
                  hasExistingNote={Boolean(existingNote)}
                  onSave={onSaveJournal}
                  onDelete={() => {
                    if (existingNote && window.confirm(`Delete journal entry for ${displayHeader}?`)) {
                      onDeleteJournal(existingNote.id);
                    }
                  }}
                  onNavigateToNote={onNavigateToNote}
                  onEnsurePageExists={onEnsurePageExists}
                  allNotes={notes}
                />
              </div>
            </React.Fragment>
          );
        })}

        {filteredDateKeys.length === 0 && (
          <div className="py-16 text-center text-zinc-500 text-xs">
            No journal entries match &quot;{searchQuery}&quot;.
          </div>
        )}
      </div>
    </div>
  );
};
