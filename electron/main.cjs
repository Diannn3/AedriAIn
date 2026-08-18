const { app, BrowserWindow, dialog, ipcMain, session, shell } = require('electron');
const path = require('node:path');

const devUrl = process.env.VITE_DEV_SERVER_URL;
const userApprovedPaths = new Set();

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#02090c',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = devUrl ? url.startsWith(devUrl) : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });

  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL();
    const trustedOrigin = devUrl ? url.startsWith(devUrl) : url.startsWith('file://');
    callback(Boolean(trustedOrigin && permission === 'media'));
  });

  ipcMain.handle('files:pick', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
    if (result.canceled) return [];
    result.filePaths.forEach((filePath) => userApprovedPaths.add(path.resolve(filePath)));
    return result.filePaths.map((filePath) => ({ name: path.basename(filePath), path: filePath, size: 0 }));
  });

  ipcMain.handle('files:open', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) return { ok: false, error: 'Invalid path' };
    const resolved = path.resolve(filePath);
    if (!userApprovedPaths.has(resolved)) return { ok: false, error: 'Path was not user-approved' };
    const error = await shell.openPath(resolved);
    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('system:platform', () => process.platform);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
