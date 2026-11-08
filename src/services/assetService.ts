import { Filesystem, Directory } from '@capacitor/filesystem';
import { isElectron, isCapacitorNative, getVaultSyncState, NativeVaultPicker } from './vaultSyncService';

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
        try {
          await NativeVaultPicker.writeAssetFile({
            folderPath: syncState.folderPath,
            assetPath,
            data: base64Data
          });
        } catch {
          await Filesystem.writeFile({
            path: `${syncState.folderPath}/${assetPath}`,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          });
        }
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
      const assetRes = await NativeVaultPicker.readAssetFile({
        folderPath: syncState.folderPath,
        assetPath: normalized
      });
      if (assetRes && assetRes.data) {
        const bytes = base64ToUint8Array(assetRes.data);
        const mimeType = inferMimeType(normalized);
        const blob = new Blob([bytes as any], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        resolvedUrlCache.set(src, blobUrl);
        return blobUrl;
      }
    } catch {}

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
 * Check if a URL is a YouTube, Vimeo, or standard video embed link.
 */
export function isVideoEmbedUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.includes('youtube.com') ||
    clean.includes('youtu.be') ||
    clean.includes('vimeo.com')
  );
}

/**
 * Check if a URL is a direct video link or embeddable video URL.
 */
export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  if (isVideoEmbedUrl(url)) return true;
  const clean = url.trim().toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.ogg') ||
    clean.includes('/assets/asset-') && (clean.includes('.mp4') || clean.includes('.webm'))
  );
}

/**
 * Check if a URL is specifically a YouTube Shorts video link.
 * Matches:
 *  - https://www.youtube.com/shorts/VIDEO_ID
 *  - https://youtube.com/shorts/VIDEO_ID?feature=share
 *  - https://youtu.be/shorts/VIDEO_ID
 */
export function isYoutubeShort(url: string): boolean {
  if (!url) return false;
  const clean = url.trim();
  return Boolean(
    clean.includes('/shorts/') ||
    clean.match(/(?:youtube\.com|youtu\.be)\/shorts\/[a-zA-Z0-9_-]+/i)
  );
}

/**
 * Extract YouTube Video ID from any format:
 * - Shorts: https://www.youtube.com/shorts/vxmv3snAkig
 * - Standard Watch: https://www.youtube.com/watch?v=vxmv3snAkig
 * - Share URL: https://youtu.be/vxmv3snAkig
 * - Embed: https://www.youtube.com/embed/vxmv3snAkig
 * - Live: https://www.youtube.com/live/vxmv3snAkig
 */
export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();

  // 1. YouTube Shorts: /shorts/VIDEO_ID
  const shortsMatch = clean.match(/(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]{6,15})/i);
  if (shortsMatch) return shortsMatch[1];

  // 2. Standard Watch URL: ?v=VIDEO_ID or &v=VIDEO_ID
  const watchMatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{6,15})/i);
  if (watchMatch) return watchMatch[1];

  // 3. Short URL: youtu.be/VIDEO_ID
  const shortMatch = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{6,15})/i);
  if (shortMatch) return shortMatch[1];

  // 4. Embed URL: /embed/VIDEO_ID
  const embedMatch = clean.match(/(?:youtube\.com|youtu\.be)\/embed\/([a-zA-Z0-9_-]{6,15})/i);
  if (embedMatch) return embedMatch[1];

  // 5. Live Stream URL: /live/VIDEO_ID
  const liveMatch = clean.match(/(?:youtube\.com|youtu\.be)\/live\/([a-zA-Z0-9_-]{6,15})/i);
  if (liveMatch) return liveMatch[1];

  return null;
}

/**
 * Get YouTube video thumbnail image URL (high resolution fallback to medium).
 */
export function getYoutubeThumbnailUrl(url: string): string | null {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Convert any YouTube URL (Shorts, standard watch, share, live) or Vimeo link into a secure, responsive embed URL.
 */
export function getYoutubeEmbedUrl(url: string): string {
  if (!url) return '';
  const clean = url.trim();

  // YouTube (including Shorts!)
  const ytId = extractYoutubeVideoId(clean);
  if (ytId) {
    return `https://www.youtube.com/embed/${ytId}`;
  }

  // Already an embed URL
  if (clean.includes('youtube.com/embed/')) return clean;

  // Vimeo https://vimeo.com/VIDEO_ID
  const vimeoMatch = clean.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i) || clean.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch) {
    const vimeoId = vimeoMatch[3] || vimeoMatch[1];
    return `https://player.vimeo.com/video/${vimeoId}`;
  }

  return clean;
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
