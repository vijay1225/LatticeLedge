import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Note } from '../types';
import { 
  importSqliteDatabaseFile, 
  exportSqliteDatabaseBlob, 
  downloadSqliteDatabaseFile,
  getSqliteDatabaseBinary,
  getAllNotesFromSql,
  createEmptySqliteVault
} from './sqliteService';

export interface VaultSyncState {
  isConfigured: boolean;
  platform: 'electron' | 'capacitor' | 'browser-fs' | 'manual';
  folderName: string;
  folderPath: string;
  fileName: string;
  lastSyncedAt: number | null;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage: string | null;
  autoSyncEnabled: boolean;
}

export interface VaultFolderResult {
  success: boolean;
  folderPath?: string;
  folderName?: string;
  loadedNotes?: Note[];
  isFresh?: boolean;
  error?: string;
}

const VAULT_FOLDER_STORAGE_KEY = 'LL_VAULT_FOLDER_PATH';
const VAULT_FOLDER_NAME_KEY = 'LL_VAULT_FOLDER_NAME';
const VAULT_AUTO_SYNC_KEY = 'LL_VAULT_AUTO_SYNC';
const DEFAULT_VAULT_FILE = 'lattice_vault.db';

// IndexedDB handle storage for Browser File System Access API
const IDB_HANDLE_DB = 'LatticeLedgerVaultHandles';
const IDB_HANDLE_STORE = 'handles';
const IDB_HANDLE_KEY = 'active_vault_dir';

let activeDirHandle: any = null;
let externalUpdateListeners: Array<(notes: Note[]) => void> = [];
let statusListeners: Array<(state: VaultSyncState) => void> = [];
let lastSyncTimestamp: number | null = null;
let isSyncing = false;

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;
}

export function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function getPlatformType(): 'electron' | 'capacitor' | 'browser-fs' | 'manual' {
  if (isElectron()) return 'electron';
  if (isCapacitorNative()) return 'capacitor';
  if (isFileSystemAccessSupported()) return 'browser-fs';
  return 'manual';
}

// ----------------------------------------------------
// IndexedDB Directory Handle Persistence (Browser Web)
// ----------------------------------------------------

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = window.indexedDB.open(IDB_HANDLE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_HANDLE_STORE)) {
        db.createObjectStore(IDB_HANDLE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDirHandleToIdb(handle: any): Promise<void> {
  try {
    const db = await openHandleDb();
    const tx = db.transaction(IDB_HANDLE_STORE, 'readwrite');
    tx.objectStore(IDB_HANDLE_STORE).put(handle, IDB_HANDLE_KEY);
  } catch (err) {
    console.warn('[VaultSync] Failed to store directory handle in IndexedDB:', err);
  }
}

async function loadDirHandleFromIdb(): Promise<any | null> {
  try {
    const db = await openHandleDb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_HANDLE_STORE, 'readonly');
      const req = tx.objectStore(IDB_HANDLE_STORE).get(IDB_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function clearDirHandleFromIdb(): Promise<void> {
  try {
    const db = await openHandleDb();
    const tx = db.transaction(IDB_HANDLE_STORE, 'readwrite');
    tx.objectStore(IDB_HANDLE_STORE).delete(IDB_HANDLE_KEY);
  } catch {}
}

// ----------------------------------------------------
// Base64 Helpers for Capacitor Android Storage
// ----------------------------------------------------

function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return typeof btoa !== 'undefined' ? btoa(binary) : '';
}

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const memoryStore = new Map<string, string>();

function getStoredItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {}
  return memoryStore.get(key) || null;
}

function setStoredItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(key, value);
    }
  } catch {}
  memoryStore.set(key, value);
}

function removeStoredItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
      localStorage.removeItem(key);
    }
  } catch {}
  memoryStore.delete(key);
}

// ----------------------------------------------------
// State Management
// ----------------------------------------------------

export function getVaultSyncState(): VaultSyncState {
  const platform = getPlatformType();
  const folderPath = getStoredItem(VAULT_FOLDER_STORAGE_KEY) || '';
  const folderName = getStoredItem(VAULT_FOLDER_NAME_KEY) || '';
  const autoSync = getStoredItem(VAULT_AUTO_SYNC_KEY) !== 'false';

  const isConfigured = Boolean(
    (platform === 'electron' && folderPath) ||
    (platform === 'capacitor' && folderPath) ||
    (platform === 'browser-fs' && (activeDirHandle || folderName))
  );

  return {
    isConfigured,
    platform,
    folderName: folderName || (folderPath ? folderPath.split(/[/\\]/).pop() || folderPath : 'Not Configured'),
    folderPath: folderPath || '',
    fileName: DEFAULT_VAULT_FILE,
    lastSyncedAt: lastSyncTimestamp,
    status: isSyncing ? 'syncing' : (isConfigured ? 'synced' : 'idle'),
    errorMessage: null,
    autoSyncEnabled: autoSync
  };
}

function notifyStateChanged() {
  const state = getVaultSyncState();
  statusListeners.forEach(listener => {
    try { listener(state); } catch {}
  });
}

export function subscribeVaultSyncState(listener: (state: VaultSyncState) => void): () => void {
  statusListeners.push(listener);
  listener(getVaultSyncState());
  return () => {
    statusListeners = statusListeners.filter(l => l !== listener);
  };
}

export function subscribeExternalVaultUpdates(listener: (notes: Note[]) => void): () => void {
  externalUpdateListeners.push(listener);
  return () => {
    externalUpdateListeners = externalUpdateListeners.filter(l => l !== listener);
  };
}

// ----------------------------------------------------
// Core Initialization & Lifecycle
// ----------------------------------------------------

let isInitialized = false;

export async function initVaultSync(onExternalChange?: (notes: Note[]) => void): Promise<void> {
  if (onExternalChange) {
    externalUpdateListeners.push(onExternalChange);
  }
  if (isInitialized) return;
  isInitialized = true;

  const platform = getPlatformType();

  // 1. Electron Platform Setup
  if (platform === 'electron') {
    const savedPath = getStoredItem(VAULT_FOLDER_STORAGE_KEY);
    if (savedPath) {
      try {
        const info = await (window as any).electronAPI.checkVaultFileInfo(savedPath, DEFAULT_VAULT_FILE);
        if (info && info.mtime) {
          lastSyncTimestamp = info.mtime;
        }
        await (window as any).electronAPI.watchVaultFolder(savedPath, DEFAULT_VAULT_FILE);
      } catch (e) {
        console.warn('[VaultSync] Electron watch error:', e);
      }
    }

    // Listen for file change events emitted by Electron main process
    (window as any).electronAPI?.onVaultFileChanged?.(async (changeInfo: any) => {
      console.log('[VaultSync] External change detected in vault folder:', changeInfo);
      await reloadVaultFromFolder();
    });
  }

  // 2. Android Capacitor Setup
  else if (platform === 'capacitor') {
    const savedPath = getStoredItem(VAULT_FOLDER_STORAGE_KEY);
    if (savedPath) {
      setStoredItem(VAULT_FOLDER_NAME_KEY, savedPath.split(/[/\\]/).pop() || savedPath);
    }
  }

  // 3. Browser File System Access API Setup
  else if (platform === 'browser-fs') {
    const savedHandle = await loadDirHandleFromIdb();
    if (savedHandle) {
      try {
        const perm = await savedHandle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          activeDirHandle = savedHandle;
          setStoredItem(VAULT_FOLDER_NAME_KEY, savedHandle.name);
        }
      } catch (err) {
        console.warn('[VaultSync] Could not restore handle permission:', err);
      }
    }

    // Check for changes on window focus
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', async () => {
        if (activeDirHandle) {
          try {
            const fileHandle = await activeDirHandle.getFileHandle(DEFAULT_VAULT_FILE, { create: false });
            const file = await fileHandle.getFile();
            if (lastSyncTimestamp && file.lastModified > lastSyncTimestamp + 1500) {
              console.log('[VaultSync] Newer vault file found on window focus, reloading...');
              await reloadVaultFromFolder();
            }
          } catch {}
        }
      });
    }
  }

  notifyStateChanged();
}

// ----------------------------------------------------
// Folder Selection & Binding Actions
// ----------------------------------------------------

export async function chooseVaultFolder(customMobilePath?: string): Promise<VaultFolderResult> {
  const platform = getPlatformType();

  try {
    // A. ELECTRON DESKTOP NATIVE FOLDER PICKER
    if (platform === 'electron') {
      const selected = await (window as any).electronAPI.selectVaultFolder();
      if (!selected) {
        return { success: false, error: 'Folder selection canceled' };
      }

      const folderName = selected.split(/[/\\]/).pop() || selected;
      setStoredItem(VAULT_FOLDER_STORAGE_KEY, selected);
      setStoredItem(VAULT_FOLDER_NAME_KEY, folderName);

      // Check if lattice_vault.db already exists in this chosen folder
      const info = await (window as any).electronAPI.checkVaultFileInfo(selected, DEFAULT_VAULT_FILE);
      let loadedNotes: Note[] | undefined = undefined;
      let isFresh = false;

      if (info && info.exists) {
        // Folder already contains db file: Resume from there!
        const fileBuffer = await (window as any).electronAPI.readVaultFile(selected, DEFAULT_VAULT_FILE);
        if (fileBuffer) {
          loadedNotes = await importSqliteDatabaseFile(fileBuffer);
          lastSyncTimestamp = info.mtime || Date.now();
        }
      } else {
        // Folder is empty / no db file:
        // Do NOT copy old notes! Create fresh empty repo like a clean slate!
        try {
          loadedNotes = await createEmptySqliteVault();
          isFresh = true;
          const emptyBinary = await getSqliteDatabaseBinary();
          const writeRes = await (window as any).electronAPI.writeVaultFile(selected, emptyBinary, DEFAULT_VAULT_FILE);
          if (writeRes && writeRes.mtime) {
            lastSyncTimestamp = writeRes.mtime;
          }
        } catch (writeErr) {
          console.warn('[VaultSync] Could not write fresh vault file on folder binding:', writeErr);
        }
      }

      // Start watching this folder
      await (window as any).electronAPI.watchVaultFolder(selected, DEFAULT_VAULT_FILE);
      notifyStateChanged();

      return {
        success: true,
        folderPath: selected,
        folderName,
        loadedNotes,
        isFresh
      };
    }

    // B. MODERN BROWSER FILE SYSTEM ACCESS API
    if (platform === 'browser-fs') {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      if (!dirHandle) {
        return { success: false, error: 'Folder selection canceled' };
      }

      activeDirHandle = dirHandle;
      await saveDirHandleToIdb(dirHandle);
      setStoredItem(VAULT_FOLDER_STORAGE_KEY, dirHandle.name);
      setStoredItem(VAULT_FOLDER_NAME_KEY, dirHandle.name);

      let loadedNotes: Note[] | undefined = undefined;
      let isFresh = false;

      // Check if lattice_vault.db exists
      try {
        const fileHandle = await dirHandle.getFileHandle(DEFAULT_VAULT_FILE, { create: false });
        const file = await fileHandle.getFile();
        const buffer = await file.arrayBuffer();
        loadedNotes = await importSqliteDatabaseFile(buffer);
        lastSyncTimestamp = file.lastModified;
      } catch {
        // File doesn't exist yet: Create empty repo like fresh (do not copy old notes)!
        try {
          loadedNotes = await createEmptySqliteVault();
          isFresh = true;
          const emptyBinary = await getSqliteDatabaseBinary();
          const fileHandle = await dirHandle.getFileHandle(DEFAULT_VAULT_FILE, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(emptyBinary);
          await writable.close();
          const file = await fileHandle.getFile();
          lastSyncTimestamp = file.lastModified;
        } catch (writeErr) {
          console.warn('[VaultSync] Could not write fresh file to browser directory:', writeErr);
        }
      }

      notifyStateChanged();
      return {
        success: true,
        folderPath: dirHandle.name,
        folderName: dirHandle.name,
        loadedNotes,
        isFresh
      };
    }

    // C. CAPACITOR ANDROID NATIVE STORAGE
    if (platform === 'capacitor') {
      const targetPath = customMobilePath || getStoredItem(VAULT_FOLDER_STORAGE_KEY) || 'Documents/LatticeLedger';
      return await setMobileVaultFolder(targetPath);
    }

    return {
      success: false,
      error: 'Direct folder binding requires Electron Desktop, Chromium browser, or native Android app.'
    };
  } catch (err: any) {
    console.error('[VaultSync] Error choosing folder:', err);
    return { success: false, error: err.message || 'Failed to select folder' };
  }
}

/**
 * Configure and bind a specific folder on Android mobile storage.
 */
export async function setMobileVaultFolder(customPath: string): Promise<VaultFolderResult> {
  const cleanPath = customPath.trim().replace(/^[/\\]+|[/\\]+$/g, '') || 'Documents/LatticeLedger';
  setStoredItem(VAULT_FOLDER_STORAGE_KEY, cleanPath);
  setStoredItem(VAULT_FOLDER_NAME_KEY, cleanPath.split(/[/\\]/).pop() || cleanPath);

  let loadedNotes: Note[] | undefined = undefined;
  let isFresh = false;

  try {
    const stat = await Filesystem.stat({
      path: `${cleanPath}/${DEFAULT_VAULT_FILE}`,
      directory: Directory.Documents
    });
    if (stat) {
      const res = await Filesystem.readFile({
        path: `${cleanPath}/${DEFAULT_VAULT_FILE}`,
        directory: Directory.Documents
      });
      if (res.data) {
        const raw = typeof res.data === 'string' ? base64ToUint8Array(res.data) : (res.data as any);
        loadedNotes = await importSqliteDatabaseFile(raw);
        lastSyncTimestamp = Date.now();
      }
    }
  } catch {
    // File doesn't exist in folder: Create fresh empty repo (do not copy old notes)!
    try {
      loadedNotes = await createEmptySqliteVault();
      isFresh = true;
      const emptyBinary = await getSqliteDatabaseBinary();
      const base64Data = uint8ArrayToBase64(emptyBinary);
      await Filesystem.writeFile({
        path: `${cleanPath}/${DEFAULT_VAULT_FILE}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });
      lastSyncTimestamp = Date.now();
    } catch (writeErr: any) {
      console.warn('[VaultSync] Could not write fresh file to new mobile folder:', writeErr?.message || writeErr);
    }
  }

  notifyStateChanged();
  return {
    success: true,
    folderPath: cleanPath,
    folderName: cleanPath,
    loadedNotes,
    isFresh
  };
}

/**
 * 1-Tap Google Drive Export & Sharing on Android / Desktop.
 * On Android, opens the native Share sheet with "Save to Drive" / "Google Drive".
 * On Desktop / Browser, downloads the file.
 */
export async function shareVaultDatabaseFile(): Promise<{ success: boolean; method: 'share' | 'download'; message?: string }> {
  try {
    const blob = await exportSqliteDatabaseBlob();
    const file = new File([blob], DEFAULT_VAULT_FILE, { type: 'application/x-sqlite3' });
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: DEFAULT_VAULT_FILE,
        text: 'LatticeLedger SQLite Database Vault for Google Drive',
        files: [file]
      });
      return {
        success: true,
        method: 'share',
        message: 'Share menu opened! Select "Save to Drive" to save lattice_vault.db directly into your Google Drive folder.'
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, method: 'share', message: 'Share canceled.' };
    }
    console.warn('[VaultSync] Web share not available or failed:', err);
  }

  // Fallback to direct download
  await downloadSqliteDatabaseFile();
  return {
    success: true,
    method: 'download',
    message: 'Downloaded lattice_vault.db! Save this file to your Google Drive folder.'
  };
}

// ----------------------------------------------------
// Save & Read Database to/from Bound Vault Folder
// ----------------------------------------------------

/**
 * Automatically save the SQLite binary bytes into the bound vault folder.
 */
export async function saveVaultDbToFolder(bytes: Uint8Array): Promise<boolean> {
  const platform = getPlatformType();
  const folderPath = getStoredItem(VAULT_FOLDER_STORAGE_KEY);

  try {
    isSyncing = true;
    notifyStateChanged();

    // 1. Electron Desktop
    if (platform === 'electron' && folderPath) {
      const res = await (window as any).electronAPI.writeVaultFile(folderPath, bytes, DEFAULT_VAULT_FILE);
      if (res && res.mtime) {
        lastSyncTimestamp = res.mtime;
      } else {
        lastSyncTimestamp = Date.now();
      }
      isSyncing = false;
      notifyStateChanged();
      return true;
    }

    // 2. Browser File System Access API
    if (platform === 'browser-fs' && activeDirHandle) {
      const fileHandle = await activeDirHandle.getFileHandle(DEFAULT_VAULT_FILE, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(bytes);
      await writable.close();
      const file = await fileHandle.getFile();
      lastSyncTimestamp = file.lastModified;
      isSyncing = false;
      notifyStateChanged();
      return true;
    }

    // 3. Android Capacitor
    if (platform === 'capacitor') {
      const relativeFolder = folderPath || 'Documents/LatticeLedger';
      const base64Data = uint8ArrayToBase64(bytes);

      await Filesystem.writeFile({
        path: `${relativeFolder}/${DEFAULT_VAULT_FILE}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      lastSyncTimestamp = Date.now();
      isSyncing = false;
      notifyStateChanged();
      return true;
    }

    isSyncing = false;
    notifyStateChanged();
    return false;
  } catch (err: any) {
    console.warn('[VaultSync] Failed to save vault to folder:', err);
    isSyncing = false;
    notifyStateChanged();
    return false;
  }
}

/**
 * Load SQLite binary bytes directly from the bound folder.
 */
export async function loadVaultDbFromFolder(): Promise<Uint8Array | null> {
  const platform = getPlatformType();
  const folderPath = getStoredItem(VAULT_FOLDER_STORAGE_KEY);

  try {
    if (platform === 'electron' && folderPath) {
      const buffer = await (window as any).electronAPI.readVaultFile(folderPath, DEFAULT_VAULT_FILE);
      if (!buffer) return null;
      return new Uint8Array(buffer);
    }

    if (platform === 'browser-fs' && activeDirHandle) {
      const fileHandle = await activeDirHandle.getFileHandle(DEFAULT_VAULT_FILE, { create: false });
      const file = await fileHandle.getFile();
      const arrayBuffer = await file.arrayBuffer();
      lastSyncTimestamp = file.lastModified;
      return new Uint8Array(arrayBuffer);
    }

    if (platform === 'capacitor') {
      const relativeFolder = folderPath || 'Documents/LatticeLedger';
      const res = await Filesystem.readFile({
        path: `${relativeFolder}/${DEFAULT_VAULT_FILE}`,
        directory: Directory.Documents
      });
      if (res && res.data) {
        lastSyncTimestamp = Date.now();
        return typeof res.data === 'string' ? base64ToUint8Array(res.data) : (res.data as any);
      }
    }

    return null;
  } catch (err) {
    console.warn('[VaultSync] Could not load vault DB from folder:', err);
    return null;
  }
}

/**
 * Explicitly save / push all current SQLite notes to lattice_vault.db in the bound folder.
 */
export async function pushVaultDbToFolder(): Promise<{ success: boolean; message: string; noteCount?: number }> {
  const state = getVaultSyncState();
  if (!state.isConfigured || !state.folderPath) {
    return { success: false, message: 'No vault folder bound. Please connect a folder first.' };
  }

  try {
    const binary = await getSqliteDatabaseBinary();
    const success = await saveVaultDbToFolder(binary);
    if (success) {
      const allNotes = await getAllNotesFromSql();
      return {
        success: true,
        message: `Saved ${allNotes.length} notes into lattice_vault.db in "${state.folderName}"!`,
        noteCount: allNotes.length
      };
    }
    return { success: false, message: 'Failed to write lattice_vault.db to folder.' };
  } catch (err: any) {
    return { success: false, message: `Push failed: ${err.message}` };
  }
}

/**
 * Explicitly pull / reload all notes from lattice_vault.db in the bound folder into SQLite & UI.
 */
export async function pullVaultDbFromFolder(): Promise<{ success: boolean; message: string; notes?: Note[] }> {
  const state = getVaultSyncState();
  if (!state.isConfigured || !state.folderPath) {
    return { success: false, message: 'No vault folder bound. Please connect a folder first.' };
  }

  try {
    const bytes = await loadVaultDbFromFolder();
    if (!bytes || bytes.length === 0) {
      return { success: false, message: `lattice_vault.db was not found in folder "${state.folderName}".` };
    }

    const notes = await importSqliteDatabaseFile(bytes);
    externalUpdateListeners.forEach(listener => {
      try { listener(notes); } catch {}
    });

    return {
      success: true,
      message: `Loaded ${notes.length} notes from lattice_vault.db in "${state.folderName}"!`,
      notes
    };
  } catch (err: any) {
    return { success: false, message: `Failed to load from folder: ${err.message}` };
  }
}

/**
 * Triggered when external modifications to lattice_vault.db are detected.
 */
export async function reloadVaultFromFolder(): Promise<Note[] | null> {
  try {
    const bytes = await loadVaultDbFromFolder();
    if (bytes && bytes.length > 0) {
      const notes = await importSqliteDatabaseFile(bytes);
      externalUpdateListeners.forEach(listener => {
        try { listener(notes); } catch {}
      });
      return notes;
    }
  } catch (err) {
    console.error('[VaultSync] Failed to reload vault from folder:', err);
  }
  return null;
}

/**
 * Disconnect the active vault folder.
 */
export async function disconnectVaultFolder(): Promise<void> {
  if (isElectron()) {
    try {
      await (window as any).electronAPI.unwatchVaultFolder();
    } catch {}
  }
  activeDirHandle = null;
  await clearDirHandleFromIdb();
  removeStoredItem(VAULT_FOLDER_STORAGE_KEY);
  removeStoredItem(VAULT_FOLDER_NAME_KEY);
  lastSyncTimestamp = null;
  notifyStateChanged();
}
