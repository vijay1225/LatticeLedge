const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  
  selectVaultFolder: () => ipcRenderer.invoke('dialog:select-vault-folder'),
  
  readVaultFile: (folderPath, fileName) => 
    ipcRenderer.invoke('vault:read-file', { folderPath, fileName }),
    
  writeVaultFile: (folderPath, data, fileName) => 
    ipcRenderer.invoke('vault:write-file', { folderPath, data, fileName }),
    
  checkVaultFileInfo: (folderPath, fileName) => 
    ipcRenderer.invoke('vault:check-file-info', { folderPath, fileName }),
    
  watchVaultFolder: (folderPath, fileName) => 
    ipcRenderer.invoke('vault:watch-folder', { folderPath, fileName }),
    
  unwatchVaultFolder: () => 
    ipcRenderer.invoke('vault:unwatch-folder'),
    
  onVaultFileChanged: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('vault:file-changed', listener);
    return () => ipcRenderer.removeListener('vault:file-changed', listener);
  }
});
