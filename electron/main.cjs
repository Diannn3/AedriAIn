const { app, BrowserWindow, dialog, ipcMain, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const devUrl = process.env.VITE_DEV_SERVER_URL;
const appOrigin = 'aedriain://app';
const distRoot = path.resolve(__dirname, '..', 'dist');
const userApprovedPaths = new Set();

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'aedriain',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      codeCache: true,
    },
  },
]);

function isTrustedUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (devUrl) {
      const dev = new URL(devUrl);
      return parsed.origin === dev.origin;
    }
    return parsed.protocol === 'aedriain:' && parsed.host === 'app';
  } catch {
    return false;
  }
}

function assertTrustedSender(event) {
  const senderUrl = event.senderFrame?.url || event.sender.getURL();
  if (!isTrustedUrl(senderUrl)) throw new Error('Blocked IPC from an untrusted renderer.');
}

function registerAppProtocol() {
  protocol.handle('aedriain', (request) => {
    const requestUrl = new URL(request.url);
    if (requestUrl.host !== 'app') return new Response('Not found', { status: 404 });

    let pathname;
    try {
      pathname = decodeURIComponent(requestUrl.pathname || '/');
    } catch {
      return new Response('Bad request', { status: 400 });
    }

    if (pathname === '/') pathname = '/index.html';
    const filePath = path.resolve(distRoot, `.${pathname}`);
    const relative = path.relative(distRoot, filePath);
    const safe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
    if (!safe) return new Response('Not found', { status: 404 });

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

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
    if (!isTrustedUrl(url)) event.preventDefault();
  });

  if (devUrl) win.loadURL(devUrl);
  else win.loadURL(`${appOrigin}/index.html`);
}

app.whenReady().then(() => {
  if (!devUrl) registerAppProtocol();

  const isTrustedPermissionRequest = (webContents, permission) => isTrustedUrl(webContents.getURL()) && permission === 'media';

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(isTrustedPermissionRequest(webContents, permission));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return Boolean(webContents && isTrustedPermissionRequest(webContents, permission));
  });

  ipcMain.handle('files:pick', async (event) => {
    assertTrustedSender(event);
    const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
    if (result.canceled) return [];
    result.filePaths.forEach((filePath) => userApprovedPaths.add(path.resolve(filePath)));
    return result.filePaths.map((filePath) => ({ name: path.basename(filePath), path: filePath, size: 0 }));
  });

  ipcMain.handle('files:open', async (event, filePath) => {
    assertTrustedSender(event);
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) return { ok: false, error: 'Invalid path' };
    const resolved = path.resolve(filePath);
    if (!userApprovedPaths.has(resolved)) return { ok: false, error: 'Path was not user-approved' };
    const error = await shell.openPath(resolved);
    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('system:platform', (event) => {
    assertTrustedSender(event);
    return process.platform;
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
