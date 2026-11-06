import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getAllNotesFromSql, 
  saveNoteToSql, 
  deleteNoteFromSql, 
  exportSqliteDatabaseBlob, 
  getSqliteDatabaseBinary,
  replaceAllNotesInSql,
  resetSqliteToSeed 
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
});
