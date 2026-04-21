import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

// Lazy-evaluated to ensure app is ready when imported from handlers,
// but also export a function form for early callers.
function ensureDir(dir: string): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getAppSupportDir(): string {
  return ensureDir(app.getPath('userData'));
}

export function getReposDir(): string {
  return ensureDir(path.join(getAppSupportDir(), 'repos'));
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

export function getRepoLocalPath(fullName: string): string {
  const [owner, name] = fullName.split('/');
  if (!owner || !name) {
    throw new Error(`fullName invalido: ${fullName}`);
  }
  return path.join(getReposDir(), owner, name);
}

// Exported constants with getters for convenience
export const APP_SUPPORT_DIR = {
  get path(): string {
    return getAppSupportDir();
  }
};

export const REPOS_DIR = {
  get path(): string {
    return getReposDir();
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
