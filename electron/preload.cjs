const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spatialDesktop', {
  pickFiles: () => ipcRenderer.invoke('files:pick'),
  openFile: (fileId) => ipcRenderer.invoke('files:open', fileId),
  readFile: (fileId) => ipcRenderer.invoke('files:read', fileId),
  fileResourceUrl: (fileId) => `aedriain://app/_resource/file/${encodeURIComponent(fileId)}`,
  revokeFile: (fileId) => ipcRenderer.invoke('files:revoke', fileId),
  platform: () => ipcRenderer.invoke('system:platform'),
});
