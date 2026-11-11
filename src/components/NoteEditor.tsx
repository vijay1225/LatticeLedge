import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  Expand,
  FoldHorizontal,
  Maximize2,
  Save,
  Check,
  ChevronLeft,
  Trash2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  Film,
  Terminal,
  Minus,
  Info
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

import { Note } from '../types';
import { AISummaryCard } from './AISummaryCard';
import { findBacklinks, findRelatedQuickNotes, extractWikiLinks, stripDuplicateTitleHeading, isMarkdownText } from '../utils/wikiLinks';
import { CustomCodeBlockNode, CustomImageNode, CustomVideoNode } from './editor/editorExtensions';
import { InsertMediaModal } from './editor/InsertMediaModal';
import { WikiLinkSuggestionPopup } from './editor/WikiLinkSuggestionPopup';
import { saveAsset, getYoutubeEmbedUrl, isVideoEmbedUrl, isYoutubeShort } from '../services/assetService';

interface NoteEditorProps {
  note: Note;
  allNotes: Note[];
  onUpdateNote: (updated: Partial<Note>) => void;
  onRefreshSummary: () => void;
  isSummaryLoading: boolean;
  onNavigateToNote: (titleOrId: string) => void;
  onEnsurePageExists?: (title: string) => Note | undefined;
  onNewPage?: () => void;
  onTagClick?: (tag: string) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  hasApiKey?: boolean;
  onOpenSettings?: () => void;
  summaryError?: string | null;
  onBackToPages?: () => void;
  onDeletePage?: (id: string) => void;
}

/**
 * Strips backslashes added by tiptap-markdown serializer to preserve clean [[Wiki Links]].
 */
const getCleanMarkdown = (raw: string): string => {
  if (!raw) return '';
  return raw
    .replace(/\\+\[\\+\[/g, '[[')
    .replace(/\\+\]\\+\]/g, ']]');
};

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  allNotes,
  onUpdateNote,
  onRefreshSummary,
  isSummaryLoading,
  onNavigateToNote,
  onEnsurePageExists,
  onNewPage,
  onTagClick,
  isFocusMode,
  onToggleFocusMode,
  hasApiKey,
  onOpenSettings,
  summaryError,
  onBackToPages,
  onDeletePage
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mediaModal, setMediaModal] = useState<{ isOpen: boolean; type: 'image' | 'video' }>({
    isOpen: false,
    type: 'image'
  });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [justSaved, setJustSaved] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [localTitle, setLocalTitle] = useState(note.title);
  const localTitleRef = React.useRef(note.title);

  useEffect(() => {
    setLocalTitle(note.title);
    localTitleRef.current = note.title;
  }, [note.id, note.title]);

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
    const currentTitle = (localTitleRef.current !== undefined ? localTitleRef.current : localTitle).trim();
    if (currentTitle && currentTitle !== note.title) {
      pendingChangesRef.current.title = currentTitle;
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
    const rawMarkdown = (editor.storage as any).markdown?.getMarkdown() || editor.getText();
    const markdown = getCleanMarkdown(rawMarkdown);
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

  // Outgoing referenced pages (pages linked from this note)
  const outgoingLinks = useMemo(() => {
    const rawLinks = (note.links && note.links.length > 0)
      ? note.links
      : extractWikiLinks(note.content || '');
    return Array.from(new Set(rawLinks));
  }, [note.links, note.content]);

  // Compute contextual suggestions (quick notes related to this page)
  const relatedSuggestions = findRelatedQuickNotes(note, allNotes);

  // Autocomplete state for [[Wiki Links]]
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

  // Filter available wiki pages for suggestion dropdown
  const wikiPages = (allNotes || []).filter(n => n && n.type === 'wiki' && n.id !== note.id && n.title);
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

  // Apply selected wiki page or create new
  const applyWikiSuggestion = (pageTitle: string) => {
    if (!editor) return;
    const cleanTitle = (pageTitle || '').trim();
    if (!cleanTitle) return;

    const { startPos, endPos } = wikiSuggestionRef.current;

    // If new page, ensure it is created in SQLite and vault
    const exists = (allNotes || []).some(n => (n.title || '').toLowerCase() === cleanTitle.toLowerCase());
    if (!exists && cleanTitle.toLowerCase() !== 'pagename' && cleanTitle.toLowerCase() !== 'page name') {
      onEnsurePageExists?.(cleanTitle);
    }

    editor
      .chain()
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

    // Match [[query at the end of textBefore
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

        // Fallback default coordinates if coordsAtPos is unavailable or 0
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
      } catch (err) {
        console.warn('[WikiLink] coordsAtPos safe catch:', err);
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

  // Clean initial content removing duplicate # Heading if it matches the page title
  const cleanInitialContent = React.useMemo(() => {
    return stripDuplicateTitleHeading(note.content, note.title);
  }, [note.id]);

  const editorRef = React.useRef<any>(null);

  // Initialize TipTap Live In-Place WYSIWYG Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Replaced by CustomCodeBlockNode
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
        placeholder: 'Write directly on this page... Type # for headings, - [ ] for checklists, > for quotes, or [[ to link...'
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        transformPastedText: true,
        transformCopiedText: true
      })
    ],
    content: cleanInitialContent,
    editorProps: {
      attributes: {
        class: 'tiptap ProseMirror px-5 py-4 focus:outline-none'
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            // 1. Paste Image File
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

            // 2. Paste Video File (MP4, WebM, etc.)
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

        // 3. Paste Standalone YouTube, Shorts, or Video Link
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

        // 4. Paste Markdown formatted text (e.g. from .md files, notes, or code blocks)
        const rawText = event.clipboardData?.getData('text/plain');
        if (rawText && isMarkdownText(rawText)) {
          event.preventDefault();

          let textToParse = rawText;
          // Check if pasting into an Untitled page and first line is # Page Title
          const firstHeadingMatch = textToParse.match(/^#\s+([^\n]+)(\n+|$)/);
          if (firstHeadingMatch && (localTitle === 'Untitled Page' || !localTitle.trim())) {
            const extractedTitle = firstHeadingMatch[1].trim();
            if (extractedTitle) {
              setLocalTitle(extractedTitle);
              triggerChange({ title: extractedTitle });
              textToParse = textToParse.replace(/^#\s+[^\n]+(\n+|$)/, '');
            }
          }

          const parser = editorRef.current?.storage?.markdown?.parser;
          if (parser) {
            const parsedHtml = parser.parse(textToParse);
            if (parsedHtml) {
              editorRef.current?.commands.insertContent(parsedHtml);
              return true;
            }
          }
        }

        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          // Drop image
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            saveAsset(file).then(({ assetPath }) => {
              if (view.state.schema.nodes.image) {
                const pos = coordinates ? coordinates.pos : view.state.selection.from;
                const tr = view.state.tr.insert(
                  pos,
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

          // Drop video
          if (file.type.startsWith('video/')) {
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            saveAsset(file).then(({ assetPath }) => {
              if (view.state.schema.nodes.video) {
                const pos = coordinates ? coordinates.pos : view.state.selection.from;
                const tr = view.state.tr.insert(
                  pos,
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
          const exists = (allNotes || []).some(n => (n.title || '').toLowerCase() === rawTitle.toLowerCase());
          if (!exists) {
            onEnsurePageExists?.(rawTitle);
          }
        }
        setWikiSuggestion(prev => ({ ...prev, isOpen: false }));
      } else {
        checkWikiSuggestion(editor);
      }

      // Extract clean Markdown directly from the formatted editor and trigger debounced auto-save
      const rawMarkdown = (editor.storage as any).markdown?.getMarkdown() || editor.getText();
      const markdown = getCleanMarkdown(rawMarkdown);

      // Auto-extract title if currently untitled and first line is a top-level heading (# Heading)
      if (localTitleRef.current === 'Untitled Page' || localTitleRef.current === 'Untitled' || !localTitleRef.current.trim()) {
        const headingMatch = rawMarkdown.match(/^#\s+([^\n]+)/);
        if (headingMatch && headingMatch[1].trim()) {
          const autoTitle = headingMatch[1].trim();
          setLocalTitle(autoTitle);
          localTitleRef.current = autoTitle;
          triggerChange({ title: autoTitle, content: markdown });
          return;
        }
      }

      triggerChange({ content: markdown });
    },
    onSelectionUpdate: ({ editor }) => {
      checkWikiSuggestion(editor);
    }
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

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

  // Sync editor content when switching between notes (with duplicate top heading stripped)
  useEffect(() => {
    if (editor && note) {
      const cleanTarget = stripDuplicateTitleHeading(note.content, note.title);
      const currentMarkdown = getCleanMarkdown((editor.storage as any).markdown?.getMarkdown() || '');
      if (currentMarkdown.trim() !== cleanTarget.trim()) {
        editor.commands.setContent(cleanTarget);
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

    const { state } = editor;
    const { from, to } = state.selection;

    // Case 1: If user highlighted text, wrap with [[ ... ]]
    if (from !== to) {
      const selectedText = state.doc.textBetween(from, to, ' ').trim();
      if (selectedText) {
        editor.chain().focus().insertContent(`[[${selectedText}]] `).run();
        const exists = (allNotes || []).some(n => (n.title || '').toLowerCase() === selectedText.toLowerCase());
        if (!exists && selectedText.toLowerCase() !== 'pagename' && selectedText.toLowerCase() !== 'page name') {
          onEnsurePageExists?.(selectedText);
        }
        return;
      }
    }

    // Case 2: Insert [[ and trigger autocomplete popup immediately
    editor.chain().focus().insertContent('[[').run();
    setTimeout(() => {
      if (editor) {
        checkWikiSuggestion(editor);
      }
    }, 10);
  };

  const handleLinkQuickNote = (qNote: Note) => {
    if (!editor) return;
    const quote = `\n> Reference: "${qNote.content.slice(0, 80)}..."\n`;
    editor.chain().focus().insertContent(quote).run();
  };

  const handleInsertImage = (src: string, alt?: string, title?: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`\n![${alt || 'Image'}](${src}${title ? ` "${title}"` : ''})\n`).run();
  };

  const handleInsertVideo = (src: string, isEmbed?: boolean) => {
    if (!editor) return;
    if (isEmbed) {
      const embedUrl = getYoutubeEmbedUrl(src);
      const isShort = isYoutubeShort(src);
      editor.chain().focus().insertContent(`\n<iframe src="${embedUrl}" ${isShort ? 'data-is-short="true"' : ''} allowfullscreen></iframe>\n`).run();
    } else {
      editor.chain().focus().insertContent(`\n<video src="${src}" controls></video>\n`).run();
    }
  };

  const handleInsertCallout = (type: 'note' | 'tip' | 'warning') => {
    if (!editor) return;
    let snippet = '\n> [!NOTE]\n> Key takeaway or important context...\n';
    if (type === 'tip') {
      snippet = '\n> [!TIP]\n> Pro-tip: helpful recommendation or trick...\n';
    } else if (type === 'warning') {
      snippet = '\n> [!WARNING]\n> Critical note or warning to remember...\n';
    }
    editor.chain().focus().insertContent(snippet).run();
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
            type="button"
            onClick={() => {
              flushPendingSave();
              onBackToPages();
            }}
            className="flex items-center gap-1 text-zinc-400 hover:text-indigo-300 font-medium transition-colors"
            title="Return to Pages list"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Pages</span>
          </button>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-400 truncate max-w-[260px]">{localTitle || note.title || 'Untitled'}</span>
        </div>
      )}

      {/* Title & Action Bar */}
      <div className="mb-3 flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
        <div className="flex-1 w-full min-w-0">
          <input
            type="text"
            value={localTitle}
            onChange={(e) => {
              const val = e.target.value;
              setLocalTitle(val);
              localTitleRef.current = val;
              triggerChange({ title: val });
            }}
            onBlur={() => {
              const trimmed = (localTitleRef.current || '').trim() || 'Untitled Page';
              setLocalTitle(trimmed);
              localTitleRef.current = trimmed;
              triggerChange({ title: trimmed });
              flushPendingSave();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const trimmed = (localTitleRef.current || '').trim() || 'Untitled Page';
                setLocalTitle(trimmed);
                localTitleRef.current = trimmed;
                triggerChange({ title: trimmed });
                flushPendingSave();
                editor?.commands.focus('start');
              }
            }}
            placeholder="Untitled Page..."
            className="w-full text-2xl lg:text-3xl font-bold bg-transparent text-zinc-100 placeholder-zinc-700 focus:outline-none tracking-tight border-none p-0"
          />

          <div className="min-h-[22px] flex items-center gap-3 text-[11px] text-zinc-500 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3 text-zinc-600" />
              <span>Updated {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>

            {note.tags && note.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {note.tags.map((t, idx) => (
                  <span
                    key={idx}
                    onClick={() => onTagClick?.(t)}
                    className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

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

        {/* Header Controls: Live Save Status, Auto-save Toggle, Save Button, Delete, Full Width & Focus Mode */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-start md:justify-end">
          {/* Stationary Save Status Indicator: Fixed in toolbar, eliminates note bouncing */}
          <div className="flex items-center px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-medium shrink-0 h-[26px]">
            {saveStatus === 'saving' ? (
              <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Auto-saving...</span>
              </span>
            ) : saveStatus === 'unsaved' ? (
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Unsaved</span>
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Saved {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
              </span>
            )}
          </div>

          {/* Auto-Save Toggle */}
          <button
            type="button"
            onClick={toggleAutoSave}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors h-[26px] ${
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all shadow-sm h-[26px] ${
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
            title="Inline Code (`code`)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('codeBlock') ? 'bg-zinc-800 text-indigo-400 font-bold' : 'hover:bg-zinc-800 hover:text-zinc-200'}`}
            title="Code Block (```)"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
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

          {/* Insert Media Actions */}
          <button
            type="button"
            onClick={() => setMediaModal({ isOpen: true, type: 'image' })}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-zinc-400 transition-colors flex items-center gap-1"
            title="Insert Image (Upload to assets/ or URL)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline text-[11px]">Image</span>
          </button>

          <button
            type="button"
            onClick={() => setMediaModal({ isOpen: true, type: 'video' })}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-zinc-400 transition-colors flex items-center gap-1"
            title="Embed Video (assets/ or YouTube)"
          >
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[11px]">Video</span>
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-zinc-400 transition-colors"
            title="Horizontal Divider (---)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Callout Box Template Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-zinc-400 transition-colors flex items-center gap-1"
              title="Insert Authentic Callout Box"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline text-[11px]">Callout</span>
            </button>
            <div className="absolute left-0 top-full mt-1 hidden group-hover:flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg p-1 shadow-2xl z-30 min-w-[130px]">
              <button
                type="button"
                onClick={() => handleInsertCallout('note')}
                className="px-2.5 py-1 text-left rounded hover:bg-zinc-800 text-[11px] text-indigo-300 transition-colors"
              >
                [!NOTE] Info
              </button>
              <button
                type="button"
                onClick={() => handleInsertCallout('tip')}
                className="px-2.5 py-1 text-left rounded hover:bg-zinc-800 text-[11px] text-emerald-300 transition-colors"
              >
                [!TIP] Pro-Tip
              </button>
              <button
                type="button"
                onClick={() => handleInsertCallout('warning')}
                className="px-2.5 py-1 text-left rounded hover:bg-zinc-800 text-[11px] text-amber-300 transition-colors"
              >
                [!WARNING] Caution
              </button>
            </div>
          </div>

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

      {/* KNOWLEDGE CONNECTIONS HUB: Outgoing Referenced Pages & Inbound Bi-directional Backlinks */}
      <div className="w-full mt-10 pt-6 border-t-2 border-zinc-800/90 space-y-6 block clear-both">
        {/* 1. OUTGOING / REFERENCED PAGES (Links created in this note) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
              <span>Referenced Pages ({outgoingLinks.length})</span>
            </div>
            <span className="text-[11px] text-zinc-500">Pages linked from this note</span>
          </div>

          {outgoingLinks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {outgoingLinks.map((targetTitle) => {
                const targetNote = (allNotes || []).find(
                  n => n && (n.title || '').toLowerCase().trim() === targetTitle.toLowerCase().trim()
                );
                return (
                  <button
                    key={targetTitle}
                    type="button"
                    onClick={() => {
                      if (targetNote) {
                        onNavigateToNote(targetNote.id);
                      } else {
                        onEnsurePageExists?.(targetTitle);
                        onNavigateToNote(targetTitle);
                      }
                    }}
                    className="text-left p-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-indigo-500/40 transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-200 group-hover:text-indigo-300 font-medium mb-1">
                      <span className="truncate">{targetTitle}</span>
                      <ArrowUpRight className="w-3 h-3 text-zinc-500 group-hover:text-indigo-400 shrink-0" />
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                      {targetNote
                        ? (targetNote.content || '').replace(/[#*`\\]/g, '').slice(0, 100)
                        : 'Click to create and open page...'}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/40 text-xs text-zinc-500">
              No outgoing links yet. Type <code className="text-zinc-300 font-mono">[[Page Name]]</code> anywhere in this note to link to another page.
            </div>
          )}
        </div>

        {/* 2. BI-DIRECTIONAL BACKLINKS (Notes that reference this page) */}
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
                    {(bNote.content || '').replace(/[#*`\\]/g, '').slice(0, 100)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/40 text-xs text-zinc-500">
              No other notes link to this page yet. Type <code className="text-zinc-300 font-mono">[[{note.title}]]</code> in any other note to link back here.
            </div>
          )}
        </div>
      </div>

      {/* Insert Media Modal */}
      <InsertMediaModal
        isOpen={mediaModal.isOpen}
        mediaType={mediaModal.type}
        onClose={() => setMediaModal(prev => ({ ...prev, isOpen: false }))}
        onInsertImage={handleInsertImage}
        onInsertVideo={handleInsertVideo}
      />

      {/* Wiki-Link Autocomplete Suggestion Popup */}
      <WikiLinkSuggestionPopup
        isOpen={wikiSuggestion.isOpen}
        query={wikiSuggestion.query}
        coords={wikiSuggestion.coords}
        allNotes={allNotes}
        currentNoteId={note.id}
        selectedIndex={wikiSuggestion.selectedIndex}
        onSelect={applyWikiSuggestion}
        onClose={() => setWikiSuggestion(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
