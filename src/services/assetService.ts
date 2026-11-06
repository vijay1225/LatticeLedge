import { Filesystem, Directory } from '@capacitor/filesystem';
import { isElectron, isCapacitorNative, getVaultSyncState } from './vaultSyncService';

const ASSETS_IDB_NAME = 'LatticeLedgerAssetsDB';
const ASSETS_STORE_NAME = 'assets_store';

// In-memory cache for resolved Blob URLs to prevent memory leaks and repeat calls
const resolvedUrlCache = new Map<string, string>();

/**
 * Open or initialize the IndexedDB store for media assets.
 */
function openAssetsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = window.indexedDB.open(ASSETS_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ASSETS_STORE_NAME)) {
        db.createObjectStore(ASSETS_STORE_NAME, { keyPath: 'path' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save an asset record to IndexedDB for offline persistence.
 */
async function saveAssetToIdb(path: string, bytes: Uint8Array, mimeType: string): Promise<void> {
  try {
    const db = await openAssetsDb();
    const tx = db.transaction(ASSETS_STORE_NAME, 'readwrite');
    tx.objectStore(ASSETS_STORE_NAME).put({
      path,
      bytes,
      mimeType,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn('[AssetService] Failed to cache asset in IndexedDB:', err);
  }
}

/**
 * Load an asset record from IndexedDB.
 */
async function loadAssetFromIdb(path: string): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  try {
    const db = await openAssetsDb();
    return new Promise((resolve) => {
      const tx = db.transaction(ASSETS_STORE_NAME, 'readonly');
      const req = tx.objectStore(ASSETS_STORE_NAME).get(path);
      req.onsuccess = () => {
        if (req.result && req.result.bytes) {
          resolve({ bytes: req.result.bytes, mimeType: req.result.mimeType || 'application/octet-stream' });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

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

/**
 * Clean and sanitize a filename for storing in the assets folder.
 */
export function sanitizeFileName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Save an uploaded image or video file into the vault assets folder.
 * Conventionally stored in `assets/<filename>`.
 */
export async function saveAsset(
  fileOrBlob: File | Blob, 
  preferredName?: string
): Promise<{ assetPath: string; resolvedUrl: string }> {
  const mimeType = fileOrBlob.type || 'application/octet-stream';
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  
  const rawName = preferredName || (fileOrBlob instanceof File ? fileOrBlob.name : `media-${Date.now()}.${ext}`);
  const safeName = sanitizeFileName(rawName);
  const fileName = `asset-${Date.now()}-${safeName}`;
  const assetPath = `assets/${fileName}`;

  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // 1. Cache in IndexedDB for immediate offline access
  await saveAssetToIdb(assetPath, bytes, mimeType);

  // 2. Persist to bound vault directory (Electron Desktop / Android / Browser FS)
  const syncState = getVaultSyncState();

  if (syncState.isConfigured && syncState.folderPath) {
    // A. Electron Desktop: write to <folderPath>/assets/<fileName>
    if (isElectron() && typeof window !== 'undefined') {
      try {
        await (window as any).electronAPI.writeVaultFile(syncState.folderPath, bytes, assetPath);
      } catch (e) {
        console.warn('[AssetService] Electron asset write error:', e);
      }
    }

    // B. Capacitor Mobile: write to <folderPath>/assets/<fileName>
    else if (isCapacitorNative() && typeof window !== 'undefined') {
      try {
        const base64Data = uint8ArrayToBase64(bytes);
        await Filesystem.writeFile({
          path: `${syncState.folderPath}/${assetPath}`,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true
        });
      } catch (e) {
        console.warn('[AssetService] Capacitor asset write error:', e);
      }
    }
  }

  // 3. Create live Blob URL for instant rendering in editor
  let liveUrl = '';
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const blob = new Blob([bytes], { type: mimeType });
    liveUrl = URL.createObjectURL(blob);
    resolvedUrlCache.set(assetPath, liveUrl);
    resolvedUrlCache.set(`./${assetPath}`, liveUrl);
  }

  return {
    assetPath,
    resolvedUrl: liveUrl || assetPath
  };
}

/**
 * Resolves a Markdown asset link (e.g., `assets/diagram.png` or `https://...`)
 * into a live, displayable URL for <img> and <video> elements.
 */
export async function resolveAssetUrl(src: string): Promise<string> {
  if (!src) return '';

  // 1. External URLs or direct data/blob URIs need no resolution
  if (
    src.startsWith('http://') || 
    src.startsWith('https://') || 
    src.startsWith('data:') || 
    src.startsWith('blob:')
  ) {
    return src;
  }

  // 2. Check in-memory URL cache
  if (resolvedUrlCache.has(src)) {
    return resolvedUrlCache.get(src)!;
  }

  const normalized = src.replace(/^\.\//, '');

  // 3. Try to load from IndexedDB
  const idbAsset = await loadAssetFromIdb(normalized);
  if (idbAsset && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const blob = new Blob([idbAsset.bytes as any], { type: idbAsset.mimeType });
    const blobUrl = URL.createObjectURL(blob);
    resolvedUrlCache.set(src, blobUrl);
    resolvedUrlCache.set(normalized, blobUrl);
    return blobUrl;
  }

  // 4. Try to load from Electron Desktop disk
  const syncState = getVaultSyncState();
  if (isElectron() && syncState.folderPath && typeof window !== 'undefined') {
    try {
      const buffer = await (window as any).electronAPI.readVaultFile(syncState.folderPath, normalized);
      if (buffer) {
        const bytes = new Uint8Array(buffer);
        const mimeType = inferMimeType(normalized);
        const blob = new Blob([bytes as any], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        resolvedUrlCache.set(src, blobUrl);
        return blobUrl;
      }
    } catch (e) {
      console.warn('[AssetService] Electron load asset error:', e);
    }
  }

  // 5. Try to load from Capacitor Android disk
  if (isCapacitorNative() && syncState.folderPath && typeof window !== 'undefined') {
    try {
      const res = await Filesystem.readFile({
        path: `${syncState.folderPath}/${normalized}`,
        directory: Directory.Documents
      });
      if (res && res.data) {
        const bytes = typeof res.data === 'string' ? base64ToUint8Array(res.data) : (res.data as any);
        const mimeType = inferMimeType(normalized);
        const blob = new Blob([bytes as any], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        resolvedUrlCache.set(src, blobUrl);
        return blobUrl;
      }
    } catch (e) {
      console.warn('[AssetService] Capacitor load asset error:', e);
    }
  }

  // Fallback to original src
  return src;
}

/**
 * Check if a URL is a YouTube or Vimeo embed link.
 */
export function isVideoEmbedUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('vimeo.com')
  );
}

/**
 * Convert any YouTube watch URL or share link to an embeddable URL.
 */
export function getYoutubeEmbedUrl(url: string): string {
  if (!url) return '';
  if (url.includes('youtube.com/embed/')) return url;

  // Handles https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  // Handles https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  // Handles Vimeo https://vimeo.com/VIDEO_ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
}

function inferMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mov': return 'video/quicktime';
    default: return 'application/octet-stream';
  }
}
