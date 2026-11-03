import { Note } from '../types';

/**
 * Extracts all [[Wiki Link]] titles from markdown/text content.
 */
export function extractWikiLinks(content: string): string[] {
  if (!content) return [];
  const regex = /\[\[(.*?)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const title = match[1].trim();
    if (title && !links.includes(title)) {
      links.push(title);
    }
  }
  return links;
}

/**
 * Finds all notes that link back to the given note title.
 */
export function findBacklinks(targetTitle: string, allNotes: Note[]): Note[] {
  if (!targetTitle) return [];
  const normalizedTarget = targetTitle.toLowerCase().trim();
  
  return allNotes.filter(note => {
    // A note cannot be a backlink to itself
    if (note.title.toLowerCase().trim() === normalizedTarget) return false;
    
    // Check if target is in outgoing links
    return note.links.some(link => link.toLowerCase().trim() === normalizedTarget);
  });
}

/**
 * Finds Quick Notes that share tags or keywords with a target note.
 */
export function findRelatedQuickNotes(currentNote: Note, allNotes: Note[]) {
  if (currentNote.type !== 'wiki') return [];
  
  const currentTags = new Set(currentNote.tags.map(t => t.toLowerCase().replace(/^#/, '')));
  const currentEntities = new Set(
    (currentNote.summary?.keyEntities || []).map(e => e.toLowerCase())
  );
  
  const quickNotes = allNotes.filter(n => n.type === 'quick');
  const scoredSuggestions: { quickNote: Note; matchedTags: string[]; reason: string }[] = [];

  for (const qNote of quickNotes) {
    const matched: string[] = [];
    
    // Check tags
    for (const tag of qNote.tags) {
      const cleanTag = tag.toLowerCase().replace(/^#/, '');
      if (currentTags.has(cleanTag)) {
        matched.push(tag);
      }
    }
    
    // Check title/entity overlap
    const contentLower = qNote.content.toLowerCase();
    if (contentLower.includes(currentNote.title.toLowerCase())) {
      matched.push(`Mentions "${currentNote.title}"`);
    }

    for (const ent of currentEntities) {
      if (contentLower.includes(ent) && !matched.includes(ent)) {
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
