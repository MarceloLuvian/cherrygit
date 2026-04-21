import { BrowserWindow, ipcMain, shell } from 'electron';
import { IPC } from '@shared/ipc-channels.js';
import type { Progress } from '@shared/types.js';
import { listRepos } from '../services/github.service.js';
import { cloneRepo, getLocalClones, resolveRepoPath } from '../services/clone.service.js';
import { logError } from '../utils/logger.js';

export function registerReposHandlers(): void {
  ipcMain.handle(IPC.repos.list, async (_e, force?: boolean) => {
    try {
      return await listRepos(Boolean(force));
    } catch (err) {
      logError('ipc repos.list', err);
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.repos.clone, async (event, owner: string, name: string) => {
    try {
      const sender = BrowserWindow.fromWebContents(event.sender);
      const emit = (p: Progress): void => {
        if (sender && !sender.isDestroyed()) {
          sender.webContents.send(IPC.progress.event, p);
        }
      };
      const localRepo = await cloneRepo(owner, name, (line) => {
        emit({ phase: 'clone', message: line.trim() });
      });
      return localRepo;
    } catch (err) {
      logError('ipc repos.clone', err, { owner, name });
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.repos.localClones, async () => {
    try {
      return await getLocalClones();
    } catch (err) {
      logError('ipc repos.localClones', err);
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.repos.openInFinder, async (_e, fullName: string) => {
    try {
      const p = await resolveRepoPath(fullName);
      shell.openPath(p);
    } catch (err) {
      logError('ipc repos.openInFinder', err, { fullName });
      throw toClientError(err);
    }
  });
}

function toClientError(err: unknown): Error {
  if (err instanceof Error) return new Error(err.message);
  return new Error(String(err));
}
