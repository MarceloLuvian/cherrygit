import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels.js';
import * as auth from '../services/auth.service.js';
import { invalidateReposCache } from '../services/github.service.js';
import { logError } from '../utils/logger.js';

export function registerAuthHandlers(): void {
  ipcMain.handle(IPC.auth.getSession, async () => {
    try {
      return await auth.getSession();
    } catch (err) {
      logError('ipc auth.getSession', err);
      return null;
    }
  });

  ipcMain.handle(IPC.auth.login, async (_e, token: string) => {
    try {
      const session = await auth.login(token);
      invalidateReposCache();
      return session;
    } catch (err) {
      logError('ipc auth.login', err);
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.auth.logout, async () => {
    try {
      await auth.logout();
      invalidateReposCache();
    } catch (err) {
      logError('ipc auth.logout', err);
      throw toClientError(err);
    }
  });
}

function toClientError(err: unknown): Error {
  if (err instanceof Error) return new Error(err.message);
  return new Error(String(err));
}
