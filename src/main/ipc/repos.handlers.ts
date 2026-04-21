import { ipcMain, shell } from 'electron';
import { IPC } from '@shared/ipc-channels.js';
import { listRepos } from '../services/git/repos.js';
import { getStatus } from '../services/git/cherry-pick.js';
import { resolveRepoPath } from '../services/git/validators.js';
import { getPreferences } from '../services/preferences.service.js';
import { logError } from '../utils/logger.js';

function reposRoot(): string {
  return getPreferences().reposRoot;
}

export function registerReposHandlers(): void {
  ipcMain.handle(IPC.repos.list, async () => {
    try {
      return await listRepos(reposRoot());
    } catch (err) {
      logError('ipc repos.list', err);
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.repos.refresh, async () => {
    try {
      return await listRepos(reposRoot());
    } catch (err) {
      logError('ipc repos.refresh', err);
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.repos.openInFinder, async (_e, name: string) => {
    try {
      const p = resolveRepoPath(reposRoot(), name);
      await shell.openPath(p);
    } catch (err) {
      logError('ipc repos.openInFinder', err, { name });
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.repos.getStatus, async (_e, name: string) => {
    try {
      return await getStatus(reposRoot(), name);
    } catch (err) {
      logError('ipc repos.getStatus', err, { name });
      throw toClientError(err);
    }
  });
}

function toClientError(err: unknown): Error {
  if (err instanceof Error) return new Error(err.message);
  return new Error(String(err));
}
