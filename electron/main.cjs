const { app, BrowserWindow, dialog, ipcMain, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const { readFile, stat } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { pathToFileURL } = require('node:url');

const devUrl = process.env.VITE_DEV_SERVER_URL;
const appOrigin = 'aedriain://app';
const distRoot = path.resolve(__dirname, '..', 'dist');
const userApprovedFiles = new Map();
const MAX_RENDERER_FILE_BYTES = 64 * 1024 * 1024;

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


function mimeTypeFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.txt': case '.md': return 'text/plain';
    case '.json': return 'application/json';
    default: return 'application/octet-stream';
  }
}

function isTrustedUrl(rawUrl) {
  if (!rawUrl) return false;
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

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    const origin = details.securityOrigin || details.requestingUrl || webContents.getURL();
    const requestedMedia = Array.isArray(details.mediaTypes) ? details.mediaTypes : [];
    const videoOnly = requestedMedia.length === 0 || requestedMedia.every((mediaType) => mediaType === 'video');
    callback(Boolean(permission === 'media' && isTrustedUrl(origin) && details.isMainFrame !== false && videoOnly));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details = {}) => {
    const origin = details.securityOrigin || requestingOrigin || webContents?.getURL();
    const videoOnly = details.mediaType == null || details.mediaType === 'video' || details.mediaType === 'unknown';
    return Boolean(permission === 'media' && isTrustedUrl(origin) && videoOnly);
  });

  ipcMain.handle('files:pick', async (event) => {
    assertTrustedSender(event);
    const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
    if (result.canceled) return [];

    const descriptors = [];
    for (const filePath of result.filePaths) {
      const resolved = path.resolve(filePath);
      const id = randomUUID();
      let size = 0;
      try { size = (await stat(resolved)).size; } catch { /* Metadata is optional. */ }
      const descriptor = { id, name: path.basename(resolved), size, mimeType: mimeTypeFor(resolved) };
      userApprovedFiles.set(id, { path: resolved, descriptor });
      descriptors.push(descriptor);
    }
    return descriptors;
  });

  ipcMain.handle('files:open', async (event, fileId) => {
    assertTrustedSender(event);
    if (typeof fileId !== 'string') return { ok: false, error: 'Invalid file identifier' };
    const approved = userApprovedFiles.get(fileId);
    if (!approved) return { ok: false, error: 'File access expired or was not user-approved' };
    const error = await shell.openPath(approved.path);
    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('files:read', async (event, fileId) => {
    assertTrustedSender(event);
    if (typeof fileId !== 'string') return { ok: false, error: 'Invalid file identifier' };
    const approved = userApprovedFiles.get(fileId);
    if (!approved) return { ok: false, error: 'File access expired or was not user-approved' };
    try {
      const fileStat = await stat(approved.path);
      if (fileStat.size > MAX_RENDERER_FILE_BYTES) return { ok: false, error: 'File is too large to load into the spatial viewer.' };
      const buffer = await readFile(approved.path);
      return { ok: true, file: { ...approved.descriptor, size: fileStat.size }, data: new Uint8Array(buffer) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Could not read file.' };
    }
  });

  ipcMain.handle('system:platform', (event) => {
    assertTrustedSender(event);
    return process.platform;
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
