import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getVaultSyncState,
  getPlatformType,
  subscribeVaultSyncState,
  disconnectVaultFolder,
  setMobileVaultFolder,
  shareVaultDatabaseFile,
  pushVaultDbToFolder,
  pullVaultDbFromFolder,
  isElectron
} from '../services/vaultSyncService';

describe('Vault Sync Service', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await disconnectVaultFolder();
  });

  it('provides a valid initial sync state', () => {
    const state = getVaultSyncState();
    expect(state).toBeDefined();
    expect(state.fileName).toBe('lattice_vault.db');
    expect(['electron', 'capacitor', 'browser-fs', 'manual']).toContain(state.platform);
  });

  it('detects platform correctly', () => {
    const platform = getPlatformType();
    expect(['electron', 'capacitor', 'browser-fs', 'manual']).toContain(platform);
  });

  it('notifies subscribers of state changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeVaultSyncState(listener);

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('correctly reports non-electron environment in standard test runner', () => {
    expect(isElectron()).toBe(false);
  });

  it('disconnects folder cleanly and updates isConfigured to false', async () => {
    await disconnectVaultFolder();
    const state = getVaultSyncState();
    expect(state.isConfigured).toBe(false);
    expect(state.folderPath).toBe('');
  });

  it('allows binding mobile vault folder path and creates fresh empty vault when no db exists', async () => {
    const res = await setMobileVaultFolder('Documents/CustomVault');
    expect(res.success).toBe(true);
    expect(res.folderPath).toBe('Documents/CustomVault');
    expect(res.isFresh).toBe(true);
    expect(res.loadedNotes).toEqual([]);
    const state = getVaultSyncState();
    expect(state.folderPath).toBe('Documents/CustomVault');
  });

  it('provides shareVaultDatabaseFile helper function', () => {
    expect(typeof shareVaultDatabaseFile).toBe('function');
  });

  it('handles pushVaultDbToFolder and pullVaultDbFromFolder when unconfigured', async () => {
    await disconnectVaultFolder();
    const pushRes = await pushVaultDbToFolder();
    expect(pushRes.success).toBe(false);
    expect(pushRes.message).toContain('No vault folder bound');

    const pullRes = await pullVaultDbFromFolder();
    expect(pullRes.success).toBe(false);
    expect(pullRes.message).toContain('No vault folder bound');
  });
});
