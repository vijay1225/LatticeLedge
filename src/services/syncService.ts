import { Note } from '../types';

export interface ServerSyncResult {
  success: boolean;
  notes?: Note[];
  message: string;
  count?: number;
}

export interface ServerStatusResult {
  success: boolean;
  serverName?: string;
  notesCount?: number;
  hasApk?: boolean;
  apkDownloadUrl?: string;
  message: string;
}

export async function checkServerStatus(serverUrl: string, apiKey: string): Promise<ServerStatusResult> {
  const cleanUrl = serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${cleanUrl}/api/status`, {
      headers: {
        'x-api-key': apiKey
      }
    });

    if (!res.ok) {
      return { success: false, message: `Server returned status ${res.status}` };
    }

    const data = await res.json();
    return {
      success: true,
      serverName: data.serverName,
      notesCount: data.notesCount,
      hasApk: data.hasApk,
      apkDownloadUrl: data.apkDownloadUrl,
      message: 'Server online and reachable'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Cannot reach server at ${cleanUrl}. Check Wi-Fi / IP.`
    };
  }
}

export async function syncVaultWithServer(
  serverUrl: string,
  apiKey: string,
  clientNotes: Note[]
): Promise<ServerSyncResult> {
  const cleanUrl = serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${cleanUrl}/api/notes/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ notes: clientNotes })
    });

    if (res.status === 401) {
      return { success: false, message: 'Invalid API Key. Connection refused.' };
    }

    if (!res.ok) {
      return { success: false, message: `Sync failed with status ${res.status}` };
    }

    const data = await res.json();
    return {
      success: true,
      notes: data.notes,
      count: data.notes?.length || 0,
      message: `Synchronized ${data.notes?.length || 0} notes with server`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Network error: ${err.message || 'Server unreachable'}`
    };
  }
}
