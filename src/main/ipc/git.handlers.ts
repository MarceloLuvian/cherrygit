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
import { saveEntry } from '../services/history.service.js';
import type { ExecuteResult, HistoryEntry } from '@shared/types.js';
import { logError, logInfo } from '../utils/logger.js';

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
    logInfo('user.cherryPick.execute.start', {
      repo: params.repoName,
      sourceBranch: params.sourceBranch,
      targetBranch: params.targetBranch,
      useX: params.useX !== false,
      shaCount: params.shas?.length ?? 0,
      shas: params.shas
    });
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
      logInfo('user.cherryPick.execute.end', {
        repo: params.repoName,
        success: res.success,
        conflict: res.conflict === true,
        conflictAt: res.conflictAt,
        applied: (res.results ?? []).filter((r) => r.ok).length,
        failed: (res.results ?? []).filter((r) => !r.ok).length,
        durationMs: duration,
        error: res.error
      });
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
      await persistHistory(res, params.repoName, params.sourceBranch, params.targetBranch, params.shas, duration);
      return { ...res, durationMs: duration };
    } catch (err) {
      logError('ipc git.execute', err, { params });
      throw toClientError(err);
    }
  });

  ipcMain.handle(
    IPC.git.continue,
    async (event, name: string, pendingShas: string[], opts: { useX: boolean }) => {
      const startedAt = Date.now();
      logInfo('user.cherryPick.continue.start', {
        repo: name,
        useX: opts?.useX !== false,
        pendingCount: pendingShas?.length ?? 0,
        pendingShas
      });
      try {
        const onProgress = emitterFor(event.sender);
        const res = await continueCherryPick(reposRoot(), name, pendingShas, {
          useX: opts?.useX !== false,
          onProgress
        });
        logInfo('user.cherryPick.continue.end', {
          repo: name,
          success: res.success,
          conflict: res.conflict === true,
          applied: (res.results ?? []).filter((r) => r.ok).length,
          durationMs: Date.now() - startedAt,
          error: res.error
        });
        if (res.success) {
          notifySuccess('Cherry-pick continuado', `${name}: operacion completada.`);
        } else if (res.conflict && res.conflictAt) {
          notifyConflict(name, res.conflictAt);
        } else if (res.error) {
          notifyError('Cherry-pick con error', `${name}: ${res.error}`);
        }
        await persistHistory(
          res,
          name,
          res.sourceBranch ?? '',
          res.targetBranch ?? '',
          pendingShas,
          Date.now() - startedAt
        );
        return res;
      } catch (err) {
        logError('ipc git.continue', err, { name });
        throw toClientError(err);
      }
    }
  );

  ipcMain.handle(IPC.git.abort, async (_e, name: string) => {
    const startedAt = Date.now();
    logInfo('user.cherryPick.abort.start', { repo: name });
    try {
      const res = await abortCherryPick(reposRoot(), name);
      logInfo('user.cherryPick.abort.end', {
        repo: name,
        success: res.success,
        durationMs: Date.now() - startedAt,
        error: res.error
      });
      if (res.success) {
        try {
          await saveEntry({
            timestamp: new Date().toISOString(),
            repo: name,
            sourceBranch: '',
            targetBranch: '',
            originalShas: [],
            newShas: [],
            result: 'aborted',
            durationMs: Date.now() - startedAt
          });
        } catch (err) {
          logError('history.saveEntry abort', err);
        }
      }
      return res;
    } catch (err) {
      logError('ipc git.abort', err, { name });
      throw toClientError(err);
    }
  });
}

async function persistHistory(
  res: ExecuteResult,
  repo: string,
  sourceBranch: string,
  targetBranch: string,
  originalShas: string[],
  durationMs: number
): Promise<void> {
  const result: HistoryEntry['result'] = res.success
    ? 'success'
    : res.conflict
      ? 'conflict'
      : 'error';
  const newShas = (res.results ?? [])
    .filter((r) => r.ok && r.newSha)
    .map((r) => r.newSha as string);
  try {
    await saveEntry({
      timestamp: new Date().toISOString(),
      repo,
      sourceBranch,
      targetBranch,
      originalShas,
      newShas,
      result,
      durationMs,
      ...(res.error ? { notes: res.error } : {})
    });
  } catch (err) {
    logError('history.saveEntry', err);
  }
}

function toClientError(err: unknown): Error {
  if (err instanceof Error) return new Error(err.message);
  return new Error(String(err));
}
