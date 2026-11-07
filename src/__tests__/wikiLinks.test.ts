import { describe, it, expect } from 'vitest';
import { extractWikiLinks, findBacklinks, findRelatedQuickNotes } from '../utils/wikiLinks';
import { HARRY_POTTER_SEED_NOTES } from '../services/harryPotterSeed';

describe('Wiki-Links and Backlinks', () => {
  it('extracts all [[wiki-links]] from content correctly', () => {
    const text = 'Harry met with [[Albus Dumbledore]] and [[Lord Voldemort]] at [[Hogwarts]].';
    const links = extractWikiLinks(text);
    expect(links).toEqual(['Albus Dumbledore', 'Lord Voldemort', 'Hogwarts']);
  });

  it('extracts links from escaped markdown brackets produced by TipTap/CommonMark serializer', () => {
    const escapedText = 'Referencing \\[\\[Albus Dumbledore\\]\\] and \\[\\[Severus Snape\\]\\] in document';
    const links = extractWikiLinks(escapedText);
    expect(links).toEqual(['Albus Dumbledore', 'Severus Snape']);
  });

  it('finds bi-directional backlinks even when note content is escaped or links array is empty', () => {
    const customNotes = [
      {
        id: 'note-1',
        type: 'wiki' as const,
        title: 'Potion Lab',
        content: 'Studying under \\[\\[Severus Snape\\]\\] today.',
        tags: [],
        links: [], // Note: empty links array, must extract from content
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: 'note-2',
        type: 'wiki' as const,
        title: 'Severus Snape',
        content: 'Potions Master at Hogwarts.',
        tags: [],
        links: [],
        createdAt: 1,
        updatedAt: 1
      }
    ];

    const backlinks = findBacklinks('Severus Snape', customNotes);
    expect(backlinks.length).toBe(1);
    expect(backlinks[0].title).toBe('Potion Lab');
  });

  it('handles content with no links or duplicates', () => {
    expect(extractWikiLinks('No links here')).toEqual([]);
    expect(extractWikiLinks('[[Hogwarts]] and again [[Hogwarts]]')).toEqual(['Hogwarts']);
  });

  it('finds bi-directional backlinks across notes', () => {
    // Check backlinks to "Harry Potter"
    const backlinks = findBacklinks('Harry Potter', HARRY_POTTER_SEED_NOTES);
    const titles = backlinks.map(b => b.title);

    expect(titles).toContain('Hogwarts School of Witchcraft and Wizardry');
    expect(titles).toContain('Lord Voldemort');
    expect(titles).toContain('Horcruxes');
    expect(titles).toContain('The Golden Trio');
    expect(titles).toContain('Albus Dumbledore');
    expect(titles).toContain('Order of the Phoenix');
  });

  it('suggests relevant Quick Notes to Wiki Pages based on tags and entities', () => {
    const horcruxWiki = HARRY_POTTER_SEED_NOTES.find(n => n.title === 'Horcruxes');
    expect(horcruxWiki).toBeDefined();

    if (horcruxWiki) {
      const suggestions = findRelatedQuickNotes(horcruxWiki, HARRY_POTTER_SEED_NOTES);
      expect(suggestions.length).toBeGreaterThan(0);

      // Should suggest the diary quick note and diadem quick note
      const suggestedContents = suggestions.map(s => s.quickNote.content);
      const hasDiary = suggestedContents.some(c => c.includes('black blank diary'));
      const hasDiadem = suggestedContents.some(c => c.includes('Ravenclaw\'s Diadem'));
      expect(hasDiary || hasDiadem).toBe(true);
    }
  });
});
