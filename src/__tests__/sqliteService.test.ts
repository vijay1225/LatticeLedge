import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getAllNotesFromSql, 
  saveNoteToSql, 
  deleteNoteFromSql, 
  exportSqliteDatabaseBlob, 
  getSqliteDatabaseBinary,
  importSqliteDatabaseFile,
  replaceAllNotesInSql,
  resetSqliteToSeed,
  createEmptySqliteVault
} from '../services/sqliteService';
import { Note } from '../types';

describe('SQLite Database Service', () => {
  beforeEach(async () => {
    await resetSqliteToSeed();
  });

  it('initializes SQLite database and loads seeded notes', async () => {
    const notes = await getAllNotesFromSql();
    expect(notes.length).toBeGreaterThanOrEqual(10);
    const harryNote = notes.find(n => n.id === 'wiki-harry-potter');
    expect(harryNote).toBeDefined();
    expect(harryNote?.title).toBe('Harry Potter');
    expect(harryNote?.tags).toContain('#Gryffindor');
  });

  it('saves, updates, and retrieves notes using SQLite transactions', async () => {
    const newNote: Note = {
      id: 'wiki-test-sql',
      type: 'wiki',
      title: 'SQL Performance Test',
      content: 'SQLite is faster than loose markdown files',
      tags: ['#Database', '#Fast'],
      links: ['Harry Potter'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await saveNoteToSql(newNote);
    const notes = await getAllNotesFromSql();
    const fetched = notes.find(n => n.id === 'wiki-test-sql');
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe('SQL Performance Test');
    expect(fetched?.tags).toContain('#Database');

    // Update note
    fetched!.content = 'Updated content in SQLite';
    fetched!.updatedAt = Date.now() + 1000;
    await saveNoteToSql(fetched!);

    const afterUpdate = await getAllNotesFromSql();
    const updatedNote = afterUpdate.find(n => n.id === 'wiki-test-sql');
    expect(updatedNote?.content).toBe('Updated content in SQLite');
  });

  it('deletes notes cleanly from SQLite database', async () => {
    const notesBefore = await getAllNotesFromSql();
    const countBefore = notesBefore.length;

    await deleteNoteFromSql('wiki-harry-potter');
    const notesAfter = await getAllNotesFromSql();
    expect(notesAfter.length).toBe(countBefore - 1);
    expect(notesAfter.find(n => n.id === 'wiki-harry-potter')).toBeUndefined();
  });

  it('exports SQLite database as valid binary blob and Uint8Array', async () => {
    const blob = await exportSqliteDatabaseBlob();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(10000); // SQLite minimum size is 12KB+

    const binary = await getSqliteDatabaseBinary();
    expect(binary).toBeInstanceOf(Uint8Array);
    expect(binary.length).toBeGreaterThan(10000);
  });

  it('replaces entire vault notes cleanly in SQLite', async () => {
    const customNotes: Note[] = [
      {
        id: 'wiki-replaced-1',
        type: 'wiki',
        title: 'Replaced Page 1',
        content: 'Brand new page content',
        tags: ['#New'],
        links: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    const result = await replaceAllNotesInSql(customNotes);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('wiki-replaced-1');
    expect(result[0].title).toBe('Replaced Page 1');
  });

  it('creates a fresh empty SQLite vault with zero notes', async () => {
    const emptyNotes = await createEmptySqliteVault();
    expect(emptyNotes).toEqual([]);

    const notesInDb = await getAllNotesFromSql();
    expect(notesInDb).toHaveLength(0);

    const binary = await getSqliteDatabaseBinary();
    expect(binary).toBeInstanceOf(Uint8Array);
    expect(binary.length).toBeGreaterThan(0);
  });

  it('handles pinned notes ordering by returning pinned notes first', async () => {
    await createEmptySqliteVault();

    const olderPinnedNote: Note = {
      id: 'wiki-pinned-older',
      type: 'wiki',
      title: 'Older Pinned Document',
      content: 'This note is pinned to top',
      tags: ['#Pinned'],
      links: [],
      isPinned: true,
      createdAt: 1000,
      updatedAt: 1000
    };

    const newerUnpinnedNote: Note = {
      id: 'wiki-unpinned-newer',
      type: 'wiki',
      title: 'Newer Unpinned Document',
      content: 'This note has a newer timestamp but is unpinned',
      tags: ['#Unpinned'],
      links: [],
      isPinned: false,
      createdAt: 5000,
      updatedAt: 5000
    };

    const olderUnpinnedNote: Note = {
      id: 'wiki-unpinned-older',
      type: 'wiki',
      title: 'Older Unpinned Document',
      content: 'This note is older and unpinned',
      tags: ['#Unpinned'],
      links: [],
      isPinned: false,
      createdAt: 2000,
      updatedAt: 2000
    };

    await saveNoteToSql(olderPinnedNote);
    await saveNoteToSql(newerUnpinnedNote);
    await saveNoteToSql(olderUnpinnedNote);

    const orderedNotes = await getAllNotesFromSql();
    expect(orderedNotes).toHaveLength(3);
    // Pinned note comes first regardless of having oldest timestamp (1000)
    expect(orderedNotes[0].id).toBe('wiki-pinned-older');
    expect(orderedNotes[0].isPinned).toBe(true);
    // Newer unpinned note comes second (updatedAt: 5000)
    expect(orderedNotes[1].id).toBe('wiki-unpinned-newer');
    // Older unpinned note comes third (updatedAt: 2000)
    expect(orderedNotes[2].id).toBe('wiki-unpinned-older');
  });

  it('safely stores and retrieves special characters, SQL quotes, emojis, and multiline content without injection', async () => {
    const complexNote: Note = {
      id: 'wiki-complex-chars-test',
      type: 'wiki',
      title: `Harry's "Invisibility Cloak" -- dangerous; DROP TABLE notes; 🧙‍♂️⚡`,
      content: `# Section 1: SQL Injection & Unicode Safety 🏰\n\n` +
               `Special chars: ' single quote, " double quote, \`backticks\`, \\backslash\n` +
               `LaTeX math: $$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$\n` +
               `HTML tags: <div class="potion-recipe">Wolfsbane & Mandrake</div>\n` +
               `Emojis: ⚡ 🔮 🧪 📜 🪄`,
      tags: ['#Special/Chars', '#SQL_Safety', '#🧙‍♂️Magic'],
      links: ['Advanced Potions', 'Defence Against The Dark Arts'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await saveNoteToSql(complexNote);

    const allNotes = await getAllNotesFromSql();
    const retrieved = allNotes.find(n => n.id === 'wiki-complex-chars-test');

    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe(complexNote.title);
    expect(retrieved?.content).toBe(complexNote.content);
    expect(retrieved?.tags).toEqual(['#Special/Chars', '#SQL_Safety', '#🧙‍♂️Magic']);
    expect(retrieved?.links).toEqual(['Advanced Potions', 'Defence Against The Dark Arts']);
  });

  it('persists and deserializes structured AI summary JSON in notes', async () => {
    const noteWithAiSummary: Note = {
      id: 'wiki-ai-summary-test',
      type: 'wiki',
      title: 'Quantum Spell Mechanics',
      content: 'Detailed theoretical notes on transfiguration wavefunctions.',
      tags: ['#Theory', '#Quantum'],
      links: [],
      summary: {
        tldr: [
          'Transfiguration obeys probabilistic wave collapse.',
          'Wand frequencies modulate phase cancellation.'
        ],
        actionItems: [
          'Verify with Ravenclaw archives',
          'Calculate Planck-Hermione constant'
        ]
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await saveNoteToSql(noteWithAiSummary);

    const notes = await getAllNotesFromSql();
    const fetched = notes.find(n => n.id === 'wiki-ai-summary-test');

    expect(fetched).toBeDefined();
    expect(fetched?.summary).toBeDefined();
    expect(fetched?.summary?.tldr).toHaveLength(2);
    expect(fetched?.summary?.tldr[0]).toBe('Transfiguration obeys probabilistic wave collapse.');
    expect(fetched?.summary?.actionItems).toHaveLength(2);
    expect(fetched?.summary?.actionItems[1]).toBe('Calculate Planck-Hermione constant');
  });

  it('imports raw SQLite binary database file and restores all notes accurately', async () => {
    // 1. Prepare clean custom notes in a dedicated database
    const notesToExport: Note[] = [
      {
        id: 'wiki-export-1',
        type: 'wiki',
        title: 'Exported Note 1',
        content: 'Content of note 1',
        tags: ['#Export'],
        links: [],
        createdAt: 100,
        updatedAt: 100
      },
      {
        id: 'quick-export-2',
        type: 'quick',
        title: 'Scratchpad Idea',
        content: 'Quick fleeting thought',
        tags: ['#Quick'],
        links: [],
        createdAt: 200,
        updatedAt: 200
      }
    ];

    await replaceAllNotesInSql(notesToExport);
    const exportedBinary = await getSqliteDatabaseBinary();
    expect(exportedBinary.length).toBeGreaterThan(0);

    // 2. Wipe the database to simulate empty/fresh state
    await createEmptySqliteVault();
    const emptyCheck = await getAllNotesFromSql();
    expect(emptyCheck).toHaveLength(0);

    // 3. Import the binary database
    const importedNotes = await importSqliteDatabaseFile(exportedBinary);

    expect(importedNotes).toHaveLength(2);
    expect(importedNotes.map(n => n.id).sort()).toEqual(['quick-export-2', 'wiki-export-1']);
    expect(importedNotes.find(n => n.id === 'quick-export-2')?.type).toBe('quick');
    expect(importedNotes.find(n => n.id === 'wiki-export-1')?.type).toBe('wiki');
  });

  it('handles concurrent and rapid consecutive saves atomically without corruption', async () => {
    await createEmptySqliteVault();

    const batchCount = 15;
    const batchNotes: Note[] = Array.from({ length: batchCount }, (_, i) => ({
      id: `wiki-concurrent-${i}`,
      type: 'wiki',
      title: `Concurrent Page ${i}`,
      content: `Content for page ${i} written simultaneously`,
      tags: [`#Batch${i}`],
      links: [],
      createdAt: Date.now() + i,
      updatedAt: Date.now() + i
    }));

    // Save all notes concurrently
    await Promise.all(batchNotes.map(note => saveNoteToSql(note)));

    const notesInDb = await getAllNotesFromSql();
    expect(notesInDb).toHaveLength(batchCount);

    for (let i = 0; i < batchCount; i++) {
      const found = notesInDb.find(n => n.id === `wiki-concurrent-${i}`);
      expect(found).toBeDefined();
      expect(found?.title).toBe(`Concurrent Page ${i}`);
    }
  });

  it('gracefully handles deleting a non-existent note ID without error', async () => {
    const notesBefore = await getAllNotesFromSql();
    const countBefore = notesBefore.length;

    // Deleting a non-existent ID should execute without error
    await expect(deleteNoteFromSql('non-existent-id-999999')).resolves.not.toThrow();

    const notesAfter = await getAllNotesFromSql();
    expect(notesAfter.length).toBe(countBefore);
  });
});
