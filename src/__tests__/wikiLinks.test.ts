import { describe, it, expect } from 'vitest';
import { extractWikiLinks, extractTags, findBacklinks, findRelatedQuickNotes } from '../utils/wikiLinks';
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

  describe('extractTags', () => {
    it('extracts hashtags from note content and title', () => {
      const tags = extractTags('Working on #QuantumSpells and #Lore today.', 'Spellcraft #Magic');
      expect(tags).toContain('#Magic');
      expect(tags).toContain('#QuantumSpells');
      expect(tags).toContain('#Lore');
    });

    it('strictly ignores markdown headings such as # Heading and ## Subheading', () => {
      const markdown = '# My Title\n\n## Subheading\n\n### Another Section\n\nContent with #RealTag here.';
      const tags = extractTags(markdown);
      expect(tags).toEqual(['#RealTag']);
      expect(tags).not.toContain('#My');
      expect(tags).not.toContain('#Subheading');
      expect(tags).not.toContain('#Another');
    });

    it('ignores code blocks and comments inside code', () => {
      const content = '```python\n# This is a python comment\ndef foo(): pass\n```\n`inline #code` and #ValidTag';
      const tags = extractTags(content);
      expect(tags).toEqual(['#ValidTag']);
    });

    it('ignores markdown link url anchors and html hex colors', () => {
      const content = 'Check out [Documentation](https://site.com#section) and <span style="color: #ffffff">colored</span> #KeepThisTag';
      const tags = extractTags(content);
      expect(tags).toEqual(['#KeepThisTag']);
      expect(tags).not.toContain('#section');
      expect(tags).not.toContain('#ffffff');
    });

    it('returns empty array when note has no hashtags, preventing unwanted #Draft tags', () => {
      const content = '# Untitled Page\n\nStart writing notes about your new topic...';
      const tags = extractTags(content, 'Untitled Page');
      expect(tags).toEqual([]);
    });

    it('deduplicates tags case-insensitively while preserving original casing', () => {
      const content = 'Mentions #Hogwarts and later #hogwarts and #HOGWARTS';
      const tags = extractTags(content);
      expect(tags).toEqual(['#Hogwarts']);
    });
  });
});
