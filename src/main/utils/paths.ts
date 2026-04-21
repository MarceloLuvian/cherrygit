import { app } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

function ensureDir(dir: string): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getAppSupportDir(): string {
  return ensureDir(app.getPath('userData'));
}

/**
 * Default location for the user's local git clones.
 * The user can override this via preferences (`reposRoot`).
 */
export function getDefaultReposRoot(): string {
  return path.join(os.homedir(), 'OXXO', 'POS Móvil transición', 'OXXO_PROJECTs');
}

export function getHistoryFile(): string {
  const dir = getAppSupportDir();
  const file = path.join(dir, 'history.jsonl');
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '');
  }
  return file;
}

export function getLogsDir(): string {
  return ensureDir(app.getPath('logs'));
}

export function getLogFile(): string {
  return path.join(getLogsDir(), 'app.log');
}

export const APP_SUPPORT_DIR = {
  get path(): string {
    return getAppSupportDir();
  }
};

export const HISTORY_FILE = {
  get path(): string {
    return getHistoryFile();
  }
};

export const LOG_FILE = {
  get path(): string {
    return getLogFile();
  }
};
