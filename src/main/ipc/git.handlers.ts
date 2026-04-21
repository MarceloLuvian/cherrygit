import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels.js';
import type { ExecuteParams } from '@shared/types.js';
import * as gitService from '../services/git.service.js';
import { notifyConflict, notifyError, notifySuccess } from '../services/notification.service.js';
import { logError } from '../utils/logger.js';

export function registerGitHandlers(): void {
  ipcMain.handle(IPC.git.listBranches, async (_e, repoFullName: string) => {
    try {
      return await gitService.listBranches(repoFullName);
    } catch (err) {
      logError('ipc git.listBranches', err, { repoFullName });
      throw toClientError(err);
    }
  });

  ipcMain.handle(
    IPC.git.listCommits,
    async (_e, repoFullName: string, branch: string, since: string, until?: string) => {
      try {
        return await gitService.listCommits(repoFullName, branch, since, until);
      } catch (err) {
        logError('ipc git.listCommits', err, { repoFullName, branch });
        throw toClientError(err);
      }
    }
  );

  ipcMain.handle(IPC.git.inspect, async (_e, repoFullName: string, shas: string[]) => {
    try {
      return await gitService.inspectCommits(repoFullName, shas);
    } catch (err) {
      logError('ipc git.inspect', err, { repoFullName });
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.git.execute, async (_e, params: ExecuteParams) => {
    const startedAt = Date.now();
    try {
      const res = await gitService.executeCherryPick(params);
      const duration = Date.now() - startedAt;
      if (res.success) {
        notifySuccess(
          'Cherry-pick completado',
          `${params.repoFullName}: ${res.results.length} commits aplicados.`
        );
      } else if (res.conflict && res.conflictAt) {
        notifyConflict(params.repoFullName, res.conflictAt);
      } else if (res.error) {
        notifyError('Cherry-pick con error', `${params.repoFullName}: ${res.error}`);
      }
      return { ...res, durationMs: duration };
    } catch (err) {
      logError('ipc git.execute', err, { params });
      throw toClientError(err);
    }
  });

  ipcMain.handle(
    IPC.git.continue,
    async (_e, repoFullName: string, pendingShas: string[], opts: { useX: boolean }) => {
      try {
        const res = await gitService.continueCherryPick(repoFullName, pendingShas, opts);
        if (res.success) {
          notifySuccess(
            'Cherry-pick continuado',
            `${repoFullName}: operacion completada.`
          );
        } else if (res.conflict && res.conflictAt) {
          notifyConflict(repoFullName, res.conflictAt);
        } else if (res.error) {
          notifyError('Cherry-pick con error', `${repoFullName}: ${res.error}`);
        }
        return res;
      } catch (err) {
        logError('ipc git.continue', err, { repoFullName });
        throw toClientError(err);
      }
    }
  );

  ipcMain.handle(IPC.git.abort, async (_e, repoFullName: string) => {
    try {
      return await gitService.abortCherryPick(repoFullName);
    } catch (err) {
      logError('ipc git.abort', err, { repoFullName });
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.git.status, async (_e, repoFullName: string) => {
    try {
      return await gitService.getStatus(repoFullName);
    } catch (err) {
      logError('ipc git.status', err, { repoFullName });
      throw toClientError(err);
    }
  });
}

function toClientError(err: unknown): Error {
  if (err instanceof Error) return new Error(err.message);
  return new Error(String(err));
}
