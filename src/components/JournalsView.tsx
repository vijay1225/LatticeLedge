import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  CheckSquare, 
  Square, 
  Plus, 
  Search, 
  Trash2, 
  ArrowUpCircle, 
  Link2,
  Check,
  Edit3
} from 'lucide-react';
import { Note } from '../types';

interface JournalsViewProps {
  notes: Note[];
  onSaveJournal: (dateKey: string, content: string, title?: string) => void;
  onDeleteJournal: (id: string) => void;
  onNavigateToNote: (titleOrId: string) => void;
  onTagClick?: (tag: string) => void;
  allWikiPages?: Note[];
  allQuickNotes?: Note[];
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

export const JournalsView: React.FC<JournalsViewProps> = ({
  notes,
  onSaveJournal,
  onDeleteJournal,
  onNavigateToNote
}) => {
  const today = new Date();
  const todayKey = formatDateKey(today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomDate, setSelectedCustomDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingDayKey, setEditingDayKey] = useState<string | null>(null);
  const [draftContents, setDraftContents] = useState<Record<string, string>>({});
  const [savedFeedback, setSavedFeedback] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement | null>(null);
  const todaySectionRef = useRef<HTMLDivElement | null>(null);

  // Filter notes that are journals
  const journalNotes = notes.filter(n => n.type === 'journal');

  // Map of dateKey -> Note
  const journalMap = new Map<string, Note>();
  journalNotes.forEach(n => {
    // Note title or ID might contain YYYY-MM-DD
    const match = n.id.match(/\d{4}-\d{2}-\d{2}/) || (n.title || '').match(/\d{4}-\d{2}-\d{2}/);
    const key = match ? match[0] : formatDateKey(new Date(n.createdAt));
    journalMap.set(key, n);
  });

  // Collect all unique date keys to display in reverse chronological order
  const allDateKeysSet = new Set<string>();
  allDateKeysSet.add(todayKey); // Always include Today at the top!
  journalMap.forEach((_, key) => allDateKeysSet.add(key));

  if (selectedCustomDate) {
    allDateKeysSet.add(selectedCustomDate);
  }

  const sortedDateKeys = Array.from(allDateKeysSet).sort((a, b) => b.localeCompare(a));

  // Initialize draft contents from existing notes
  useEffect(() => {
    setDraftContents(prev => {
      const updated = { ...prev };
      sortedDateKeys.forEach(key => {
        if (updated[key] === undefined) {
          const note = journalMap.get(key);
          updated[key] = note ? note.content : '';
        }
      });
      return updated;
    });
  }, [notes]);

  const handleContentChange = (dateKey: string, newText: string) => {
    setDraftContents(prev => ({ ...prev, [dateKey]: newText }));
  };

  const handleCommitSave = (dateKey: string) => {
    const text = draftContents[dateKey] ?? '';
    const dateObj = new Date(dateKey + 'T00:00:00');
    const displayTitle = isNaN(dateObj.getTime()) ? dateKey : formatDisplayDate(dateObj);
    onSaveJournal(dateKey, text, displayTitle);

    setSavedFeedback(prev => ({ ...prev, [dateKey]: true }));
    setTimeout(() => {
      setSavedFeedback(prev => ({ ...prev, [dateKey]: false }));
    }, 2000);
  };

  // Toggle TODO / DONE item inside the day's content
  const handleToggleTodo = (dateKey: string, lineIndex: number) => {
    const current = draftContents[dateKey] || journalMap.get(dateKey)?.content || '';
    const lines = current.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    let targetLine = lines[lineIndex];

    if (targetLine.includes('- [ ] TODO')) {
      targetLine = targetLine.replace('- [ ] TODO', '- [x] DONE');
    } else if (targetLine.includes('- [x] DONE')) {
      targetLine = targetLine.replace('- [x] DONE', '- [ ] TODO');
    } else if (targetLine.includes('- [ ]')) {
      targetLine = targetLine.replace('- [ ]', '- [x]');
    } else if (targetLine.includes('- [x]')) {
      targetLine = targetLine.replace('- [x]', '- [ ]');
    } else if (targetLine.startsWith('TODO ')) {
      targetLine = targetLine.replace(/^TODO\s+/, 'DONE ');
    } else if (targetLine.startsWith('DONE ')) {
      targetLine = targetLine.replace(/^DONE\s+/, 'TODO ');
    } else if (targetLine.startsWith('- TODO ')) {
      targetLine = targetLine.replace(/^- TODO\s+/, '- DONE ');
    } else if (targetLine.startsWith('- DONE ')) {
      targetLine = targetLine.replace(/^- DONE\s+/, '- TODO ');
    }

    lines[lineIndex] = targetLine;
    const updatedContent = lines.join('\n');
    setDraftContents(prev => ({ ...prev, [dateKey]: updatedContent }));

    const dateObj = new Date(dateKey + 'T00:00:00');
    const displayTitle = isNaN(dateObj.getTime()) ? dateKey : formatDisplayDate(dateObj);
    onSaveJournal(dateKey, updatedContent, displayTitle);
  };

  // Insert helper (TODO, bullet, [[link]])
  const handleInsertSnippet = (dateKey: string, snippet: string) => {
    const current = draftContents[dateKey] || journalMap.get(dateKey)?.content || '';
    const prefix = current ? (current.endsWith('\n') ? '' : '\n') : '';
    const updated = current + prefix + snippet;
    handleContentChange(dateKey, updated);
    setEditingDayKey(dateKey);
  };

  const handleJumpToToday = () => {
    if (todaySectionRef.current) {
      todaySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const filteredDateKeys = sortedDateKeys.filter(key => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const note = journalMap.get(key);
    const text = (draftContents[key] || note?.content || '').toLowerCase();
    const dateObj = new Date(key + 'T00:00:00');
    const dateDisplay = formatDisplayDate(dateObj).toLowerCase();
    return key.includes(query) || dateDisplay.includes(query) || text.includes(query);
  });

  return (
    <div 
      ref={containerRef}
      className="flex-1 h-full overflow-y-auto block select-text px-4 sm:px-6 lg:px-12 py-6 pb-36 md:pb-16 max-w-4xl mx-auto w-full text-xs"
    >
      {/* Top Header & Sticky Navigation Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span>Journals & Daily Logs</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Logseq-style daily stream. Capture routines, TODOs, and thoughts with [[wiki-links]].
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
                    setEditingDayKey(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Search in Journals */}
      <div className="mb-6">
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

      {/* CONTINUOUS JOURNAL STREAM */}
      <div className="space-y-8">
        {filteredDateKeys.map((dateKey) => {
          const isToday = dateKey === todayKey;
          const isYesterday = dateKey === yesterdayKey;
          const dateObj = new Date(dateKey + 'T00:00:00');
          const displayHeader = isNaN(dateObj.getTime()) ? dateKey : formatDisplayDate(dateObj);
          const currentText = draftContents[dateKey] ?? '';
          const existingNote = journalMap.get(dateKey);
          const hasContent = Boolean(currentText.trim());
          const isEditing = editingDayKey === dateKey || (isToday && !hasContent);
          const isJustSaved = Boolean(savedFeedback[dateKey]);

          const lines = currentText.split('\n');

          return (
            <section
              key={dateKey}
              ref={isToday ? todaySectionRef : undefined}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isToday
                  ? 'bg-zinc-900/80 border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-lg'
                  : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700/80'
              }`}
            >
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                    <span>{displayHeader}</span>
                  </h2>

                  {isToday && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[10px] border border-emerald-500/30">
                      Today
                    </span>
                  )}
                  {isYesterday && (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium text-[10px]">
                      Yesterday
                    </span>
                  )}
                  {!isToday && !isYesterday && (
                    <span className="text-[11px] font-mono text-zinc-500">
                      {dateKey}
                    </span>
                  )}
                </div>

                {/* Day Action Buttons: TODO, Bullet, Page Link, Save, Edit */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* + TODO Button */}
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet(dateKey, '- [ ] TODO ')}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 text-[11px] font-medium flex items-center gap-1 transition-colors"
                    title="Insert TODO item"
                  >
                    <CheckSquare className="w-3 h-3 text-amber-400" />
                    <span>+ TODO</span>
                  </button>

                  {/* + Bullet */}
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet(dateKey, '- ')}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium transition-colors"
                    title="Insert bullet point"
                  >
                    <span>• Bullet</span>
                  </button>

                  {/* + [[Page Link]] */}
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet(dateKey, '[[Page Name]]')}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-indigo-300 hover:text-indigo-200 text-[11px] font-medium flex items-center gap-1 transition-colors"
                    title="Insert Wiki-Link reference"
                  >
                    <Link2 className="w-3 h-3 text-indigo-400" />
                    <span>[[ ]]</span>
                  </button>

                  {/* Toggle Edit / Done */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        handleCommitSave(dateKey);
                        setEditingDayKey(null);
                      } else {
                        setEditingDayKey(dateKey);
                      }
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors shadow-sm ${
                      isEditing
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <Check className="w-3 h-3 text-white" />
                        <span>Done Editing</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3 h-3 text-zinc-400" />
                        <span>Edit</span>
                      </>
                    )}
                  </button>

                  {/* Delete Day Note if exists */}
                  {existingNote && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete journal entry for ${displayHeader}?`)) {
                          onDeleteJournal(existingNote.id);
                          setDraftContents(prev => ({ ...prev, [dateKey]: '' }));
                        }
                      }}
                      className="p-1 rounded text-zinc-600 hover:text-rose-400 transition-colors ml-1"
                      title="Delete this day's entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Day Body: Interactive TODO list & Clickable [[Links]] */}
              <div className="space-y-3">
                {isEditing ? (
                  /* Live Editor Textarea */
                  <div className="space-y-2">
                    <textarea
                      value={currentText}
                      onChange={(e) => handleContentChange(dateKey, e.target.value)}
                      onBlur={() => handleCommitSave(dateKey)}
                      rows={Math.max(4, lines.length + 1)}
                      placeholder={`What happened on ${displayHeader}? Jot down routines, tasks (- [ ] TODO ...), thoughts, and [[references]]...`}
                      className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono leading-relaxed focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 resize-y"
                    />
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>Click outside or tap &quot;Done Editing&quot; to auto-save to SQLite.</span>
                      {isJustSaved && (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <Check className="w-3 h-3" />
                          <span>Saved to SQLite</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Interactive Logseq Rendered View */
                  <div 
                    onClick={() => setEditingDayKey(dateKey)}
                    className="cursor-pointer group"
                    title="Click anywhere to edit"
                  >
                    {hasContent ? (
                      <div className="space-y-1.5 text-zinc-200 text-xs leading-relaxed">
                        {lines.map((line, idx) => {
                          const isTodo = line.includes('- [ ] TODO') || line.startsWith('TODO ') || line.startsWith('- TODO ');
                          const isDone = line.includes('- [x] DONE') || line.startsWith('DONE ') || line.startsWith('- DONE ');
                          const isCheckboxOpen = !isTodo && line.includes('- [ ]');
                          const isCheckboxDone = !isDone && line.includes('- [x]');

                          // Extract clean text after TODO/DONE markers
                          let displayText = line
                            .replace(/^- \[[ x]\] (TODO|DONE)\s*/i, '')
                            .replace(/^- \[[ x]\]\s*/i, '')
                            .replace(/^(TODO|DONE)\s*/i, '')
                            .replace(/^- (TODO|DONE)\s*/i, '');

                          // Parse [[wiki-links]] in line
                          const wikiRegex = /\[\[([^\]]+)\]\]/g;
                          const parts: React.ReactNode[] = [];
                          let lastIndex = 0;
                          let match: RegExpExecArray | null;

                          while ((match = wikiRegex.exec(displayText)) !== null) {
                            if (match.index > lastIndex) {
                              parts.push(displayText.slice(lastIndex, match.index));
                            }
                            const linkTarget = match[1];
                            parts.push(
                              <button
                                key={match.index}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToNote(linkTarget);
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 font-medium border border-indigo-500/20 underline decoration-indigo-400/40 transition-colors mx-0.5"
                                title={`Navigate to [[${linkTarget}]]`}
                              >
                                <Link2 className="w-2.5 h-2.5 inline" />
                                <span>{linkTarget}</span>
                              </button>
                            );
                            lastIndex = match.index + match[0].length;
                          }
                          if (lastIndex < displayText.length) {
                            parts.push(displayText.slice(lastIndex));
                          }

                          return (
                            <div 
                              key={idx} 
                              className={`flex items-start gap-2 py-0.5 ${
                                isDone || isCheckboxDone ? 'text-zinc-500 line-through' : 'text-zinc-200'
                              }`}
                            >
                              {/* Logseq Interactive TODO / DONE Toggle Badges */}
                              {isTodo && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTodo(dateKey, idx);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-emerald-500/20 border border-amber-500/30 hover:border-emerald-500/40 text-amber-300 hover:text-emerald-300 font-bold text-[10px] transition-colors shrink-0 select-none"
                                  title="Click to mark DONE"
                                >
                                  <Square className="w-3 h-3 text-amber-400" />
                                  <span>TODO</span>
                                </button>
                              )}

                              {isDone && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTodo(dateKey, idx);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-amber-500/20 border border-emerald-500/30 hover:border-amber-500/40 text-emerald-400 hover:text-amber-300 font-bold text-[10px] transition-colors shrink-0 select-none"
                                  title="Click to mark TODO"
                                >
                                  <CheckSquare className="w-3 h-3 text-emerald-400" />
                                  <span>DONE</span>
                                </button>
                              )}

                              {isCheckboxOpen && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTodo(dateKey, idx);
                                  }}
                                  className="p-0.5 text-zinc-500 hover:text-emerald-400 transition-colors shrink-0"
                                >
                                  <Square className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isCheckboxDone && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTodo(dateKey, idx);
                                  }}
                                  className="p-0.5 text-emerald-400 hover:text-zinc-400 transition-colors shrink-0"
                                >
                                  <CheckSquare className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!isTodo && !isDone && !isCheckboxOpen && !isCheckboxDone && line.startsWith('- ') && (
                                <span className="text-zinc-500 shrink-0 font-bold select-none">•</span>
                              )}

                              <div className="flex-1 min-w-0">
                                {parts.length > 0 ? parts : (line || <span className="text-zinc-600 italic">Empty line</span>)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Placeholder for empty day */
                      <div className="py-4 text-center rounded-xl border border-dashed border-zinc-800/80 bg-zinc-950/20 text-zinc-500 text-xs hover:text-zinc-300 hover:border-zinc-700 transition-colors">
                        <span>Click to log thoughts, daily routines, or TODOs for this day...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
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