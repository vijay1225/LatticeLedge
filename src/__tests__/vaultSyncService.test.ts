import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getVaultSyncState,
  getPlatformType,
  subscribeVaultSyncState,
  disconnectVaultFolder,
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
});
