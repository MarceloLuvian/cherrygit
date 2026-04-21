import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { IPC } from '@shared/ipc-channels.js';
import { getPreferences } from '../services/preferences.service.js';
import { newWindow } from '../windows/manager.js';
import { getLogsDir } from '../utils/paths.js';
import { logError } from '../utils/logger.js';

export function registerSystemHandlers(): void {
  ipcMain.handle(IPC.system.openInEditor, async (_e, pathArg: string) => {
    try {
      assertSafePath(pathArg);
      const editor = getPreferences().editor;
      await openWithEditor(editor, pathArg);
    } catch (err) {
      logError('ipc sys.openInEditor', err, { pathArg });
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.system.openInTerminal, async (_e, pathArg: string) => {
    try {
      assertSafePath(pathArg);
      const terminal = getPreferences().terminal;
      await openWithTerminal(terminal, pathArg);
    } catch (err) {
      logError('ipc sys.openInTerminal', err, { pathArg });
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.system.openInFinder, async (_e, pathArg: string) => {
    try {
      assertSafePath(pathArg);
      shell.openPath(pathArg);
    } catch (err) {
      logError('ipc sys.openInFinder', err, { pathArg });
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.system.newWindow, async () => {
    try {
      newWindow();
    } catch (err) {
      logError('ipc sys.newWindow', err);
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.system.openLogsDir, async () => {
    try {
      const dir = getLogsDir();
      await shell.openPath(dir);
      return dir;
    } catch (err) {
      logError('ipc sys.openLogsDir', err);
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.system.pickDirectory, async (event) => {
    try {
      const sender = BrowserWindow.fromWebContents(event.sender);
      const opts: Electron.OpenDialogOptions = {
        title: 'Selecciona la carpeta base de tus repos',
        properties: ['openDirectory', 'createDirectory']
      };
      const result = sender
        ? await dialog.showOpenDialog(sender, opts)
        : await dialog.showOpenDialog(opts);
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0] ?? null;
    } catch (err) {
      logError('ipc sys.pickDirectory', err);
      throw toClientError(err);
    }
  });
}

function assertSafePath(p: string): void {
  if (typeof p !== 'string' || !p.trim()) throw new Error('Path invalido');
  if (!fs.existsSync(p)) throw new Error(`Path no existe: ${p}`);
}

function openWithEditor(editor: string, p: string): Promise<void> {
  return new Promise((resolve) => {
    switch (editor) {
      case 'vscode':
        execFile('open', ['-a', 'Visual Studio Code', p], () => resolve());
        return;
      case 'cursor':
        execFile('open', ['-a', 'Cursor', p], () => resolve());
        return;
      case 'sublime':
        execFile('open', ['-a', 'Sublime Text', p], () => resolve());
        return;
      case 'system':
      case 'none':
      default:
        void shell.openPath(p).then(() => resolve());
        return;
    }
  });
}

function openWithTerminal(terminal: string, p: string): Promise<void> {
  return new Promise((resolve) => {
    switch (terminal) {
      case 'iterm':
        execFile('open', ['-a', 'iTerm', p], () => resolve());
        return;
      case 'warp':
        execFile('open', ['-a', 'Warp', p], () => resolve());
        return;
      case 'terminal':
      case 'system':
      default:
        execFile('open', ['-a', 'Terminal', p], () => resolve());
        return;
    }
  });
}

function toClientError(err: unknown): Error {
  if (err instanceof Error) return new Error(err.message);
  return new Error(String(err));
}
