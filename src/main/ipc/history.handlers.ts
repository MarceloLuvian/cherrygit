import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels.js';
import type { HistoryFilters } from '@shared/types.js';
import * as history from '../services/history.service.js';
import { logError } from '../utils/logger.js';

export function registerHistoryHandlers(): void {
  ipcMain.handle(IPC.history.list, async (_e, filters?: HistoryFilters) => {
    try {
      return await history.listEntries(filters ?? {});
    } catch (err) {
      logError('ipc history.list', err);
      throw toClientError(err);
    }
  });

  ipcMain.handle(IPC.history.export, async (_e, format: 'json' | 'csv') => {
    try {
      if (format !== 'json' && format !== 'csv') {
        throw new Error('Formato invalido');
      }
      return await history.exportAs(format);
    } catch (err) {
      logError('ipc history.export', err);
      throw toClientError(err);
    }
  });
}

function toClientError(err: unknown): Error {
  if (err instanceof Error) return new Error(err.message);
  return new Error(String(err));
}
