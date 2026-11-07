const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let activeWatcher = null;
let lastSelfWriteTimestamp = 0;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#09090b',
    title: 'LatticeLedger',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Remove default menu bar for clean modern appearance (Alt key can still toggle or custom controls)
  mainWindow.setMenuBarVisibility(false);

  // Forward renderer console logs to main process for diagnostics
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      console.error(`[Renderer Error] ${message} (${sourceId}:${line})`);
    } else {
      console.log(`[Renderer] ${message}`);
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (activeWatcher) {
      try { activeWatcher.close(); } catch {}
      activeWatcher = null;
    }
  });
}

// ----------------------------------------------------
// IPC Handlers for Vault Folder & SQLite File Sync
// ----------------------------------------------------

ipcMain.handle('dialog:select-vault-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select LatticeLedger Vault Folder (Google Drive / Local)',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('vault:check-file-info', async (_event, { folderPath, fileName = 'lattice_vault.db' }) => {
  if (!folderPath) return { exists: false };
  try {
    const fullPath = path.join(folderPath, fileName);
    if (!fs.existsSync(fullPath)) {
      return { exists: false, fullPath };
    }
    const stats = await fs.promises.stat(fullPath);
    return {
      exists: true,
      fullPath,
      size: stats.size,
      mtime: stats.mtimeMs
    };
  } catch (err) {
    return { exists: false, error: err.message };
  }
});

ipcMain.handle('vault:read-file', async (_event, { folderPath, fileName = 'lattice_vault.db' }) => {
  if (!folderPath) throw new Error('No vault folder path provided');
  const fullPath = path.join(folderPath, fileName);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const buffer = await fs.promises.readFile(fullPath);
  return buffer;
});

ipcMain.handle('vault:write-file', async (_event, { folderPath, data, fileName = 'lattice_vault.db' }) => {
  if (!folderPath) throw new Error('No vault folder path provided');
  const fullPath = path.join(folderPath, fileName);
  const parentDir = path.dirname(fullPath);
  if (!fs.existsSync(parentDir)) {
    await fs.promises.mkdir(parentDir, { recursive: true });
  }
  
  // Mark self write timestamp to ignore echo from fs.watch
  lastSelfWriteTimestamp = Date.now();
  
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  await fs.promises.writeFile(fullPath, buffer);
  
  const stats = await fs.promises.stat(fullPath);
  return { success: true, mtime: stats.mtimeMs, size: stats.size };
});

ipcMain.handle('vault:watch-folder', async (_event, { folderPath, fileName = 'lattice_vault.db' }) => {
  if (activeWatcher) {
    try { activeWatcher.close(); } catch {}
    activeWatcher = null;
  }

  if (!folderPath || !fs.existsSync(folderPath)) return false;

  let debounceTimer = null;
  const targetFile = path.normalize(fileName);

  try {
    activeWatcher = fs.watch(folderPath, (eventType, filename) => {
      if (!filename) return;
      if (path.normalize(filename) === targetFile) {
        // Debounce external sync notifications
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          // If we wrote this file ourselves within the last 2000ms, ignore
          if (Date.now() - lastSelfWriteTimestamp < 2000) return;
          
          if (mainWindow && !mainWindow.isDestroyed()) {
            try {
              const fullPath = path.join(folderPath, fileName);
              if (fs.existsSync(fullPath)) {
                const stats = await fs.promises.stat(fullPath);
                mainWindow.webContents.send('vault:file-changed', {
                  fileName,
                  mtime: stats.mtimeMs,
                  size: stats.size
                });
              }
            } catch {}
          }
        }, 600);
      }
    });
    return true;
  } catch (err) {
    console.warn('[Electron] Failed to start folder watcher:', err);
    return false;
  }
});

ipcMain.handle('vault:unwatch-folder', async () => {
  if (activeWatcher) {
    try { activeWatcher.close(); } catch {}
    activeWatcher = null;
  }
  return true;
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
