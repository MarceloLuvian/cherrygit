import { BrowserWindow, ipcMain, type WebContents } from 'electron';
import { IPC } from '@shared/ipc-channels.js';
import type { ExecuteParams, Progress } from '@shared/types.js';
import { listBranches } from '../services/git/branches.js';
import { listCommitsInRange, inspectCommits } from '../services/git/commits.js';
import {
  abortCherryPick,
  continueCherryPick,
  executeCherryPick
} from '../services/git/cherry-pick.js';
import { getPreferences } from '../services/preferences.service.js';
import { notifyConflict, notifyError, notifySuccess } from '../services/notification.service.js';
import { logError } from '../utils/logger.js';

function reposRoot(): string {
  return getPreferences().reposRoot;
}

function emitterFor(sender: WebContents): (p: Progress) => void {
  const win = BrowserWindow.fromWebContents(sender);
  return (p: Progress): void => {
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.progress.event, p);
    }
  };
}

export function registerGitHandlers(): void {
  ipcMain.handle(IPC.git.listBranches, async (_e, name: string) => {
    try {
      const autoFetch = getPreferences().autoFetch !== false;
      return await listBranches(reposRoot(), name, { fetch: autoFetch });
    } catch (err) {
      logError('ipc git.listBranches', err, { name });
      throw toClientError(err);
    }
  });

  ipcMain.handle(
    IPC.git.listCommits,
    async (_e, name: string, branch: string, since: string, until?: string) => {
      try {
        return await listCommitsInRange(reposRoot(), name, branch, since, until);
      } catch (err) {
        logError('ipc git.listCommits', err, { name, branch });
        throw toClientError(err);
      }
    }
  );

  ipcMain.handle(IPC.git.inspect, async (_e, name: string, shas: string[]) => {
    try {
      return await inspectCommits(reposRoot(), name, shas);
    } catch (err) {
      logError('ipc git.inspect', err, { name });
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.git.execute, async (event, params: ExecuteParams) => {
    const startedAt = Date.now();
    try {
      const onProgress = emitterFor(event.sender);
      const res = await executeCherryPick(
        reposRoot(),
        params.repoName,
        params.targetBranch,
        params.shas,
        { useX: params.useX, sourceBranch: params.sourceBranch, onProgress }
      );
      const duration = Date.now() - startedAt;
      if (res.success) {
        notifySuccess(
          'Cherry-pick completado',
          `${params.repoName}: ${res.results.length} commits aplicados.`
        );
      } else if (res.conflict && res.conflictAt) {
        notifyConflict(params.repoName, res.conflictAt);
      } else if (res.error) {
        notifyError('Cherry-pick con error', `${params.repoName}: ${res.error}`);
      }
      return { ...res, durationMs: duration };
    } catch (err) {
      logError('ipc git.execute', err, { params });
      throw toClientError(err);
    }
  });

  ipcMain.handle(
    IPC.git.continue,
    async (event, name: string, pendingShas: string[], opts: { useX: boolean }) => {
      try {
        const onProgress = emitterFor(event.sender);
        const res = await continueCherryPick(reposRoot(), name, pendingShas, {
          useX: opts?.useX !== false,
          onProgress
        });
        if (res.success) {
          notifySuccess('Cherry-pick continuado', `${name}: operacion completada.`);
        } else if (res.conflict && res.conflictAt) {
          notifyConflict(name, res.conflictAt);
        } else if (res.error) {
          notifyError('Cherry-pick con error', `${name}: ${res.error}`);
        }
        return res;
      } catch (err) {
        logError('ipc git.continue', err, { name });
        throw toClientError(err);
      }
    }
  );

  ipcMain.handle(IPC.git.abort, async (_e, name: string) => {
    try {
      return await abortCherryPick(reposRoot(), name);
    } catch (err) {
      logError('ipc git.abort', err, { name });
      throw toClientError(err);
    }
  });
}

function toClientError(err: unknown): Error {
  if (err instanceof Error) return new Error(err.message);
  return new Error(String(err));
}
