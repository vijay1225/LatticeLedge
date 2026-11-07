import { Note } from '../types';

/**
 * Extracts all [[Wiki Link]] titles from markdown/text content.
 * Handles standard [[Page Name]] as well as escaped variants \[\[Page Name\]\].
 */
export function extractWikiLinks(content: string): string[] {
  if (!content) return [];
  // Normalize escaped brackets from markdown serializers (e.g. \[\[ -> [[ and \]\] -> ]])
  const normalized = content
    .replace(/\\+\[\\+\[/g, '[[')
    .replace(/\\+\]\\+\]/g, ']]');

  const regex = /\[\[(.*?)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    const title = match[1].trim();
    if (title && !links.includes(title)) {
      links.push(title);
    }
  }
  return links;
}

/**
 * Extracts hashtags from note content and title (e.g. #Project, #Hogwarts, #lore/spells).
 * Strictly ignores:
 * - Markdown headings (# Heading, ## Heading)
 * - Code blocks (```...``` and `...`)
 * - URLs and markdown links ([text](url#anchor))
 * - HTML tags and attributes (<div style="...">)
 */
export function extractTags(content: string, title?: string): string[] {
  const combined = `${title || ''}\n\n${content || ''}`;
  if (!combined.trim()) return [];

  // 1. Remove fenced code blocks (```...```) and inline code (`...`)
  let text = combined
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]+`/g, ' ');

  // 2. Remove markdown links [text](url) to avoid matching URL fragments
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // 3. Remove HTML tags (<div ...>) to avoid matching hex colors or attributes
  text = text.replace(/<[^>]*>/g, ' ');

  // 4. Remove escaped characters
  text = text.replace(/\\/g, '');

  // 5. Match #tag: must be preceded by start-of-line or whitespace/boundary (not & or alphanumeric)
  // Must start with a letter (avoids markdown headings '# ' which have space, and avoids pure numbers #123)
  const tagRegex = /(?:^|[^\w#&])#([a-zA-Z\p{L}][\w\p{L}\-\/]*)/gu;
  const tags: string[] = [];
  const seenLower = new Set<string>();

  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    let raw = match[1];
    // Trim trailing slash or hyphen if any
    raw = raw.replace(/[\-\/]+$/, '');
    if (!raw) continue;

    // Filter out common hex colors (e.g. #ffffff, #000000, or 6-char hex with numbers like #1a2b3c)
    if (/^[0-9a-fA-F]{6}$/i.test(raw) && (/\d/.test(raw) || raw.toLowerCase() === 'ffffff' || raw.toLowerCase() === '000000')) {
      continue;
    }

    const tagWithHash = `#${raw}`;
    const lower = tagWithHash.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      tags.push(tagWithHash);
    }
  }

  return tags;
}

/**
 * Strips duplicate top-level # Title heading from markdown content if it matches the note title.
 * This ensures the user only has a single place to edit the page title (the title input),
 * eliminating redundant double titles.
 */
export function stripDuplicateTitleHeading(content: string, title?: string): string {
  if (!content) return '';
  const cleanTitle = (title || '').trim();
  if (cleanTitle) {
    const escaped = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicateRegex = new RegExp(`^#\\s+${escaped}\\s*(\\n+|$)`, 'i');
    if (duplicateRegex.test(content.trimStart())) {
      return content.trimStart().replace(duplicateRegex, '');
    }
  }

  // Also strip generic # Untitled Page if present as first heading
  if (/^#\s+Untitled(\s+Page)?\s*(\\n+|$)/i.test(content.trimStart())) {
    return content.trimStart().replace(/^#\s+Untitled(\s+Page)?\s*(\\n+|$)/i, '');
  }

  return content;
}

/**
 * Detects whether pasted text contains common Markdown formatting syntax.
 */
export function isMarkdownText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;

  const hasHeading = /^#{1,6}\s+\S/m.test(trimmed);
  const hasList = /^(\s*[-*+]|\s*\d+\.)\s+\S/m.test(trimmed);
  const hasTaskList = /^\s*[-*+]\s+\[[ xX]\]\s+\S/m.test(trimmed);
  const hasBoldOrItalic = /(\*\*|__)[^\s*].*?\1|(\*|_)[^\s*].*?\2/.test(trimmed);
  const hasBlockquote = /^>\s+\S/m.test(trimmed);
  const hasCodeFence = /```[\s\S]*?```/.test(trimmed);
  const hasInlineCode = /`[^`\n]+`/.test(trimmed);
  const hasTable = /\|.+?\|.+?\|\n\s*\|[-: ]+\|/m.test(trimmed);
  const hasMdLink = /\[[^\]]+\]\([^)]+\)/.test(trimmed);
  const hasWikiLink = /\[\[[^\]]+\]\]/.test(trimmed);
  const hasHorizontalRule = /^(\*{3,}|-{3,}|_{3,})$/m.test(trimmed);

  return (
    hasHeading ||
    hasList ||
    hasTaskList ||
    hasBoldOrItalic ||
    hasBlockquote ||
    hasCodeFence ||
    hasInlineCode ||
    hasTable ||
    hasMdLink ||
    hasWikiLink ||
    hasHorizontalRule
  );
}

/**
 * Finds all notes that link back to the given note title.
 */
export function findBacklinks(targetTitle: string, allNotes: Note[]): Note[] {
  if (!targetTitle) return [];
  const normalizedTarget = targetTitle.toLowerCase().trim();
  
  return (allNotes || []).filter(note => {
    if (!note) return false;
    const noteTitle = (note.title || '').toLowerCase().trim();
    // A note cannot be a backlink to itself
    if (noteTitle === normalizedTarget) return false;
    
    // Check if target is in outgoing links array
    const inLinks = (note.links || []).some(
      link => typeof link === 'string' && link.toLowerCase().trim() === normalizedTarget
    );
    if (inLinks) return true;

    // Direct fallback: check if target is mentioned via [[wiki-link]] in raw content
    const extracted = extractWikiLinks(note.content || '');
    return extracted.some(link => link.toLowerCase().trim() === normalizedTarget);
  });
}

/**
 * Finds Quick Notes that share tags or keywords with a target note.
 */
export function findRelatedQuickNotes(currentNote: Note, allNotes: Note[]) {
  if (!currentNote || currentNote.type !== 'wiki') return [];
  
  const currentTags = new Set(
    (currentNote.tags || []).map(t => (typeof t === 'string' ? t.toLowerCase().replace(/^#/, '') : ''))
  );
  const currentEntities = new Set(
    (currentNote.summary?.keyEntities || []).map(e => (typeof e === 'string' ? e.toLowerCase() : ''))
  );
  
  const quickNotes = (allNotes || []).filter(n => n && n.type === 'quick');
  const scoredSuggestions: { quickNote: Note; matchedTags: string[]; reason: string }[] = [];

  for (const qNote of quickNotes) {
    const matched: string[] = [];
    
    // Check tags
    for (const tag of (qNote.tags || [])) {
      if (typeof tag !== 'string') continue;
      const cleanTag = tag.toLowerCase().replace(/^#/, '');
      if (currentTags.has(cleanTag)) {
        matched.push(tag);
      }
    }
    
    // Check title/entity overlap
    const contentLower = (qNote.content || '').toLowerCase();
    const currentTitleLower = (currentNote.title || '').toLowerCase();
    if (currentTitleLower && contentLower.includes(currentTitleLower)) {
      matched.push(`Mentions "${currentNote.title}"`);
    }

    for (const ent of currentEntities) {
      if (ent && contentLower.includes(ent) && !matched.includes(ent)) {
        matched.push(ent);
      }
    }

    if (matched.length > 0) {
      scoredSuggestions.push({
        quickNote: qNote,
        matchedTags: matched,
        reason: `Shares concepts: ${matched.slice(0, 3).join(', ')}`
      });
    }
  }

  return scoredSuggestions;
}
