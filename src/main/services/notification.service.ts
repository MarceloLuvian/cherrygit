import { Notification } from 'electron';
import { getPreferences } from './preferences.service.js';
import { logError } from '../utils/logger.js';

function canNotify(): boolean {
  try {
    if (!getPreferences().notificationsEnabled) return false;
  } catch {
    return false;
  }
  return Notification.isSupported();
}

export function notifySuccess(title: string, body: string): void {
  if (!canNotify()) return;
  try {
    new Notification({ title, body, silent: false }).show();
  } catch (err) {
    logError('notification.success failed', err);
  }
}

export function notifyConflict(repo: string, sha: string): void {
  if (!canNotify()) return;
  try {
    new Notification({
      title: 'Cherry-pick en conflicto',
      body: `${repo}: conflicto al aplicar ${sha.slice(0, 7)}. Resuelve y continua.`,
      silent: false
    }).show();
  } catch (err) {
    logError('notification.conflict failed', err);
  }
}

export function notifyError(title: string, body: string): void {
  if (!canNotify()) return;
  try {
    new Notification({ title, body, silent: false }).show();
  } catch (err) {
    logError('notification.error failed', err);
  }
}
