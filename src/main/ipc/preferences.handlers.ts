import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels.js';
import type { Preferences } from '@shared/types.js';
import { getPreferences, setPreferences } from '../services/preferences.service.js';
import { logError } from '../utils/logger.js';

export function registerPreferencesHandlers(): void {
  ipcMain.handle(IPC.preferences.get, async () => {
    try {
      return getPreferences();
    } catch (err) {
      logError('ipc prefs.get', err);
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.preferences.set, async (_e, partial: Partial<Preferences>) => {
    try {
      if (!partial || typeof partial !== 'object') {
        throw new Error('Payload de preferencias invalido');
      }
      return setPreferences(partial);
    } catch (err) {
      logError('ipc prefs.set', err);
      throw toClientError(err);
    }
  });
}

function toClientError(err: unknown): Error {
  if (err instanceof Error) return new Error(err.message);
  return new Error(String(err));
}
