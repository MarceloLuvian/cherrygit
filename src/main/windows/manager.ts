import { BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolvePreloadPath(): string {
  // In electron-vite, preload is built to out/preload/index.js (or .mjs/.cjs).
  // main bundle is emitted under out/main; relative go up one dir.
  return path.resolve(__dirname, '..', 'preload', 'index.js');
}

function resolveRendererIndexPath(): string {
  return path.resolve(__dirname, '..', 'renderer', 'index.html');
}

export function createMainWindow(): BrowserWindow {
  const preload = resolvePreloadPath();

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#111111',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  // Open links in external browser instead of new Electron windows.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(resolveRendererIndexPath());
  }

  return win;
}

export function newWindow(): BrowserWindow {
  return createMainWindow();
}

export function allWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows();
}
