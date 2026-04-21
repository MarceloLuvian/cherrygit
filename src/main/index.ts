import { app, BrowserWindow, nativeTheme } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IPC } from '@shared/ipc-channels.js';
import { createMainWindow } from './windows/manager.js';
import { installMenu } from './windows/menu.js';
import { registerIpc } from './ipc/register.js';
import { initTheme } from './services/theme.service.js';
import { logError, logInfo } from './utils/logger.js';
import { getPreferences } from './services/preferences.service.js';

// Forzar nombre en menues y notificaciones (dev mode sobreescribe "Electron").
app.setName('CherryGit');
if (process.platform === 'darwin' && app.dock) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    app.dock.setIcon(path.resolve(__dirname, '..', '..', 'resources', 'icon.png'));
  } catch {
    /* icono todavia no generado en primera corrida; se reintenta por ventana */
  }
}

// Single-instance lock so multi-launch raises existing windows.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const all = BrowserWindow.getAllWindows();
    if (all.length > 0) {
      const win = all[0]!;
      if (win.isMinimized()) win.restore();
      win.focus();
    } else {
      createMainWindow();
    }
  });

  app.whenReady().then(
    () => {
      try {
        // Warm up preferences (first read will materialize defaults).
        getPreferences();
      } catch (err) {
        logError('bootstrap: preferences init failed', err);
      }

      try {
        initTheme();
      } catch (err) {
        logError('bootstrap: theme init failed', err);
      }

      try {
        registerIpc();
      } catch (err) {
        logError('bootstrap: registerIpc failed', err);
      }

      try {
        installMenu();
      } catch (err) {
        logError('bootstrap: installMenu failed', err);
      }

      createMainWindow();
      logInfo('app ready');

      // Broadcast theme changes to all renderers whenever the system theme changes.
      nativeTheme.on('updated', () => {
        const mode = getPreferences().theme;
        const payload = { mode, shouldUseDark: nativeTheme.shouldUseDarkColors };
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send(IPC.theme.changed, payload);
        }
      });

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow();
        }
      });
    },
    (err) => {
      logError('whenReady rejected', err);
      app.quit();
    }
  );

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  process.on('uncaughtException', (err) => {
    logError('uncaughtException', err);
  });
  process.on('unhandledRejection', (reason) => {
    logError('unhandledRejection', reason);
  });
}
