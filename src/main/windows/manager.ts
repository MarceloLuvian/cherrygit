import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolvePreloadPath(): string {
  return path.resolve(__dirname, '..', 'preload', 'index.mjs');
}

function resolveRendererIndexPath(): string {
  return path.resolve(__dirname, '..', 'renderer', 'index.html');
}

function resolveIconPath(): string {
  return path.resolve(__dirname, '..', '..', 'resources', 'icon.png');
}

let dockIconApplied = false;
function applyDockIconOnce(): void {
  if (dockIconApplied) return;
  if (process.platform === 'darwin' && app.dock) {
    try {
      app.dock.setIcon(resolveIconPath());
      dockIconApplied = true;
    } catch {
      // Icon may not exist yet in dev before `npm run icons`; ignore.
    }
  }
}

export function createMainWindow(): BrowserWindow {
  applyDockIconOnce();
  const preload = resolvePreloadPath();
  const icon = resolveIconPath();

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#111111',
    icon,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
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
