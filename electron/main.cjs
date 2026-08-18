const { app, BrowserWindow, dialog, ipcMain, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const { createReadStream } = require('node:fs');
const { readFile, stat } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');
const { pathToFileURL } = require('node:url');
const { mimeTypeFor, parseSingleRange } = require('./file-resource.cjs');

const devUrl = process.env.VITE_DEV_SERVER_URL;
const appOrigin = 'aedriain://app';
const distRoot = path.resolve(__dirname, '..', 'dist');
const userApprovedFiles = new Map();
const MAX_RENDERER_FILE_BYTES = 16 * 1024 * 1024;
const MAX_APPROVED_FILES = 128;
const RESOURCE_PREFIX = '/_resource/file/';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'aedriain',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      codeCache: true,
      corsEnabled: true,
    },
  },
]);

function isTrustedUrl(rawUrl) {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'aedriain:' && parsed.host === 'app') return true;
    if (devUrl) {
      const dev = new URL(devUrl);
      return parsed.origin === dev.origin;
    }
    return false;
  } catch {
    return false;
  }
}

function assertTrustedSender(event) {
  const senderUrl = event.senderFrame?.url || event.sender.getURL();
  if (!isTrustedUrl(senderUrl)) throw new Error('Blocked IPC from an untrusted renderer.');
}

function addApprovedFile(filePath, descriptor) {
  const id = randomUUID();
  userApprovedFiles.set(id, { path: filePath, descriptor: { ...descriptor, id }, approvedAt: Date.now() });
  while (userApprovedFiles.size > MAX_APPROVED_FILES) {
    const oldest = userApprovedFiles.keys().next().value;
    if (!oldest) break;
    userApprovedFiles.delete(oldest);
  }
  return userApprovedFiles.get(id).descriptor;
}

function resourceCorsHeaders() {
  if (!devUrl) return {};
  return {
    'Access-Control-Allow-Origin': new URL(devUrl).origin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Length, Content-Range, Content-Type',
    Vary: 'Origin',
  };
}

function resourceHeaders(approved, size, extra = {}) {
  const headers = {
    'Content-Type': approved.descriptor.mimeType || mimeTypeFor(approved.path),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...resourceCorsHeaders(),
    ...extra,
  };
  if (size != null) headers['Content-Length'] = String(size);
  return headers;
}

async function serveApprovedResource(request, token) {
  const approved = userApprovedFiles.get(token);
  if (!approved) return new Response('File resource expired', { status: 404, headers: { 'Cache-Control': 'no-store', ...resourceCorsHeaders() } });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', ...resourceCorsHeaders() } });
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD, OPTIONS', 'Cache-Control': 'no-store', ...resourceCorsHeaders() } });
  }

  let fileStat;
  try {
    fileStat = await stat(approved.path);
  } catch {
    userApprovedFiles.delete(token);
    return new Response('File unavailable', { status: 410, headers: { 'Cache-Control': 'no-store', ...resourceCorsHeaders() } });
  }

  if (!fileStat.isFile()) return new Response('Not a file', { status: 400, headers: { 'Cache-Control': 'no-store', ...resourceCorsHeaders() } });
  const rangeHeader = request.headers.get('range');
  const range = parseSingleRange(rangeHeader, fileStat.size);
  if (rangeHeader && !range) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${fileStat.size}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', ...resourceCorsHeaders() } });
  }

  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers: resourceHeaders(approved, fileStat.size) });
  }

  if (range) {
    const length = range.end - range.start + 1;
    const stream = Readable.toWeb(createReadStream(approved.path, { start: range.start, end: range.end }));
    return new Response(stream, {
      status: 206,
      headers: resourceHeaders(approved, length, { 'Content-Range': `bytes ${range.start}-${range.end}/${fileStat.size}` }),
    });
  }

  const stream = Readable.toWeb(createReadStream(approved.path));
  return new Response(stream, { status: 200, headers: resourceHeaders(approved, fileStat.size) });
}

function registerAppProtocol() {
  protocol.handle('aedriain', async (request) => {
    const requestUrl = new URL(request.url);
    if (requestUrl.host !== 'app') return new Response('Not found', { status: 404 });

    let pathname;
    try {
      pathname = decodeURIComponent(requestUrl.pathname || '/');
    } catch {
      return new Response('Bad request', { status: 400 });
    }

    if (pathname.startsWith(RESOURCE_PREFIX)) {
      const token = pathname.slice(RESOURCE_PREFIX.length);
      if (!token || token.includes('/')) return new Response('Invalid file resource', { status: 400 });
      return serveApprovedResource(request, token);
    }

    if (devUrl) return new Response('Not found', { status: 404 });
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
  registerAppProtocol();

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
      let size = 0;
      let modifiedAt;
      try {
        const fileStat = await stat(resolved);
        size = fileStat.size;
        modifiedAt = fileStat.mtimeMs;
      } catch { /* Metadata is optional. */ }
      descriptors.push(addApprovedFile(resolved, {
        name: path.basename(resolved),
        size,
        mimeType: mimeTypeFor(resolved),
        ...(modifiedAt != null ? { modifiedAt } : {}),
      }));
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
      if (fileStat.size > MAX_RENDERER_FILE_BYTES) return { ok: false, error: 'File is too large for direct renderer loading. Use the file resource URL.' };
      const buffer = await readFile(approved.path);
      return { ok: true, file: { ...approved.descriptor, size: fileStat.size }, data: new Uint8Array(buffer) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Could not read file.' };
    }
  });

  ipcMain.handle('files:revoke', (event, fileId) => {
    assertTrustedSender(event);
    if (typeof fileId !== 'string') return { ok: false };
    return { ok: userApprovedFiles.delete(fileId) };
  });

  ipcMain.handle('system:platform', (event) => {
    assertTrustedSender(event);
    return process.platform;
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
