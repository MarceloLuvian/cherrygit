import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels.js';
import type { ThemeMode } from '@shared/types.js';
import { getTheme, setTheme } from '../services/theme.service.js';
import { logError } from '../utils/logger.js';

export function registerThemeHandlers(): void {
  ipcMain.handle(IPC.theme.get, async () => {
    try {
      return getTheme();
    } catch (err) {
      logError('ipc theme.get', err);
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.theme.set, async (_e, mode: ThemeMode) => {
    try {
      return setTheme(mode);
    } catch (err) {
      logError('ipc theme.set', err);
      throw toClientError(err);
    }
  });
}

function toClientError(err: unknown): Error {
  if (err instanceof Error) return new Error(err.message);
  return new Error(String(err));
}
