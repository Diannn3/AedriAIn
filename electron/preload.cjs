const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spatialDesktop', {
  pickFiles: () => ipcRenderer.invoke('files:pick'),
  openPath: (path) => ipcRenderer.invoke('files:open', path),
  platform: () => ipcRenderer.invoke('system:platform'),
});
