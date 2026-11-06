import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { Note } from '../types';
import { HARRY_POTTER_SEED_NOTES } from './harryPotterSeed';
import { saveVaultDbToFolder, loadVaultDbFromFolder, getVaultSyncState } from './vaultSyncService';

const DB_INDEXEDDB_NAME = 'LatticeLedgerSqliteDB';
const DB_STORE_NAME = 'sqlite_file_store';
const DB_KEY = 'vault_sqlite_bytes';

let sqlModule: SqlJsStatic | null = null;
let activeDb: Database | null = null;

/**
 * Open or create IndexedDB storage for persisting the raw SQLite binary database.
 */
function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = window.indexedDB.open(DB_INDEXEDDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
        db.createObjectStore(DB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadBytesFromIndexedDb(): Promise<Uint8Array | null> {
  try {
    const idb = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = idb.transaction(DB_STORE_NAME, 'readonly');
      const store = tx.objectStore(DB_STORE_NAME);
      const req = store.get(DB_KEY);
      req.onsuccess = () => {
        resolve(req.result ? new Uint8Array(req.result) : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveBytesToIndexedDb(bytes: Uint8Array): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  try {
    const idb = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(DB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(DB_STORE_NAME);
      const req = store.put(bytes.buffer, DB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[SQLite] Failed to persist binary to IndexedDB:', err);
  }
}

/**
 * Initialize SQLite WebAssembly Engine and Database.
 */
export async function getSqliteDatabase(): Promise<Database> {
  if (activeDb) return activeDb;

  if (!sqlModule) {
    try {
      sqlModule = await initSqlJs({
        locateFile: (file) => {
          if (typeof window === 'undefined') {
            return `./node_modules/sql.js/dist/${file}`;
          }
          return `/${file}`;
        }
      });
    } catch {
      // Fallback
      sqlModule = await initSqlJs();
    }
  }

  // 1. Try to load existing binary database from folder or IndexedDB
  let savedBytes: Uint8Array | null = null;
  try {
    savedBytes = await loadVaultDbFromFolder();
  } catch {}

  if (!savedBytes || savedBytes.length === 0) {
    savedBytes = await loadBytesFromIndexedDb();
  }

  if (savedBytes && savedBytes.length > 0) {
    try {
      activeDb = new sqlModule.Database(savedBytes);
      createSchemaIfMissing(activeDb);

      // If the database has notes but lacks the demo showcase notes, auto-merge them
      try {
        const res = activeDb.exec("SELECT COUNT(*) FROM notes WHERE id IN ('wiki-code-showcase', 'wiki-media-gallery', 'wiki-markdown-callouts')");
        const demoCount = (res && res[0] && res[0].values[0] && res[0].values[0][0]) as number || 0;
        
        const totalRes = activeDb.exec("SELECT COUNT(*) FROM notes");
        const totalCount = (totalRes && totalRes[0] && totalRes[0].values[0] && totalRes[0].values[0][0]) as number || 0;

        if (demoCount < 3 && totalCount > 0) {
          const demoNotes = HARRY_POTTER_SEED_NOTES.filter(n =>
            ['wiki-code-showcase', 'wiki-media-gallery', 'wiki-markdown-callouts'].includes(n.id)
          );
          insertNotesBatch(activeDb, demoNotes);
          await persistDatabase();
        }
      } catch (mergeErr) {
        console.warn('[SQLite] Demo notes check/merge error:', mergeErr);
      }

      return activeDb;
    } catch (e) {
      console.warn('[SQLite] Corrupted database bytes, reinitializing:', e);
    }
  }

  // 2. Initialize fresh SQLite database
  activeDb = new sqlModule.Database();
  createSchemaIfMissing(activeDb);

  // If a vault folder is already configured, start with empty vault (do not reseed sample data)
  try {
    const syncState = getVaultSyncState();
    if (syncState && syncState.isConfigured) {
      await persistDatabase();
      return activeDb;
    }
  } catch {}

  // Seed default notes for first-time onboarding without configured folder
  insertNotesBatch(activeDb, HARRY_POTTER_SEED_NOTES);
  await persistDatabase();

  return activeDb;
}

function createSchemaIfMissing(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL,
      links TEXT NOT NULL,
      summary TEXT,
      is_pinned INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
  `);
}

function insertNotesBatch(db: Database, notes: Note[]) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO notes 
    (id, type, title, content, tags, links, summary, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    for (const n of notes) {
      stmt.run([
        n.id,
        n.type,
        n.title,
        n.content,
        JSON.stringify(n.tags || []),
        JSON.stringify(n.links || []),
        n.summary ? JSON.stringify(n.summary) : null,
        n.isPinned ? 1 : 0,
        n.createdAt || Date.now(),
        n.updatedAt || Date.now()
      ]);
    }
  } finally {
    stmt.free();
  }
}

/**
 * Persist in-memory SQLite state to persistent device storage & bound vault folder.
 */
export async function persistDatabase(): Promise<void> {
  if (!activeDb) return;
  const binary = activeDb.export();
  await saveBytesToIndexedDb(binary);
  try {
    await saveVaultDbToFolder(binary);
  } catch (err) {
    console.warn('[SQLite] Vault folder sync warning:', err);
  }
}

/**
 * Load all notes from SQLite ordered by updated_at (sub-millisecond speed).
 */
export async function getAllNotesFromSql(): Promise<Note[]> {
  const db = await getSqliteDatabase();
  const res = db.exec(`
    SELECT id, type, title, content, tags, links, summary, is_pinned, created_at, updated_at 
    FROM notes 
    ORDER BY is_pinned DESC, updated_at DESC
  `);

  if (!res || res.length === 0) return [];

  const rows = res[0].values;
  return rows.map((r): Note => {
    let tags: string[] = [];
    let links: string[] = [];
    let summary: any = undefined;

    try { tags = JSON.parse(r[4] as string); } catch {}
    try { links = JSON.parse(r[5] as string); } catch {}
    try { summary = r[6] ? JSON.parse(r[6] as string) : undefined; } catch {}

    return {
      id: r[0] as string,
      type: r[1] as ('wiki' | 'quick'),
      title: r[2] as string,
      content: r[3] as string,
      tags,
      links,
      summary,
      isPinned: Boolean(r[7]),
      createdAt: Number(r[8]),
      updatedAt: Number(r[9])
    };
  });
}

/**
 * Save or update a single note inside SQLite database with an atomic transaction.
 */
export async function saveNoteToSql(note: Note): Promise<void> {
  const db = await getSqliteDatabase();
  insertNotesBatch(db, [note]);
  await persistDatabase();
}

/**
 * Delete a note from SQLite database.
 */
export async function deleteNoteFromSql(id: string): Promise<void> {
  const db = await getSqliteDatabase();
  db.run('DELETE FROM notes WHERE id = ?', [id]);
  await persistDatabase();
}

/**
 * Reset SQLite database to Harry Potter seed data.
 */
export async function resetSqliteToSeed(): Promise<Note[]> {
  const db = await getSqliteDatabase();
  db.run('DELETE FROM notes');
  insertNotesBatch(db, HARRY_POTTER_SEED_NOTES);
  await persistDatabase();
  return getAllNotesFromSql();
}

/**
 * Load or re-insert the interactive Code, Media, and Markdown demo showcase notes.
 */
export async function loadDemoShowcaseNotes(): Promise<Note[]> {
  const db = await getSqliteDatabase();
  const demoNotes = HARRY_POTTER_SEED_NOTES.filter(n =>
    ['wiki-code-showcase', 'wiki-media-gallery', 'wiki-markdown-callouts'].includes(n.id)
  );
  insertNotesBatch(db, demoNotes);
  await persistDatabase();
  return getAllNotesFromSql();
}

/**
 * Create a fresh, empty SQLite vault (clears all notes and returns an empty note list).
 */
export async function createEmptySqliteVault(): Promise<Note[]> {
  const db = await getSqliteDatabase();
  db.run('DELETE FROM notes');
  await persistDatabase();
  return [];
}

/**
 * Replace entire vault with a new set of notes (e.g. from JSON or database import).
 */
export async function replaceAllNotesInSql(newNotes: Note[]): Promise<Note[]> {
  const db = await getSqliteDatabase();
  db.run('DELETE FROM notes');
  insertNotesBatch(db, newNotes);
  await persistDatabase();
  return getAllNotesFromSql();
}

/**
 * Export the raw SQLite binary Uint8Array bytes directly.
 */
export async function getSqliteDatabaseBinary(): Promise<Uint8Array> {
  const db = await getSqliteDatabase();
  return db.export();
}

/**
 * Export the raw SQLite binary database file (.db) for Google Drive.
 */
export async function exportSqliteDatabaseBlob(): Promise<Blob> {
  const binary = await getSqliteDatabaseBinary();
  return new Blob([new Uint8Array(binary)], { type: 'application/x-sqlite3' });
}

/**
 * Download raw lattice_vault.db SQLite database file directly.
 */
export async function downloadSqliteDatabaseFile(): Promise<void> {
  const blob = await exportSqliteDatabaseBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lattice_vault.db';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import a raw SQLite database file (.db or .sqlite) from Google Drive.
 */
export async function importSqliteDatabaseFile(fileOrBuffer: ArrayBuffer | Uint8Array): Promise<Note[]> {
  await getSqliteDatabase();
  if (!sqlModule) {
    sqlModule = await initSqlJs({
      locateFile: (file) => (typeof window === 'undefined' ? `./node_modules/sql.js/dist/${file}` : `/${file}`)
    });
  }

  const bytes = fileOrBuffer instanceof Uint8Array ? fileOrBuffer : new Uint8Array(fileOrBuffer);
  activeDb = new sqlModule.Database(bytes);
  createSchemaIfMissing(activeDb);
  await persistDatabase();
  return getAllNotesFromSql();
}
