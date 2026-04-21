import fs from 'node:fs';
import pino, { type Logger } from 'pino';
import { getLogFile, getLogsDir } from './paths.js';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

let instance: Logger | null = null;

function rotateIfNeeded(file: string): void {
  try {
    if (!fs.existsSync(file)) return;
    const stat = fs.statSync(file);
    if (stat.size > MAX_SIZE_BYTES) {
      const rotated = `${file}.1`;
      if (fs.existsSync(rotated)) fs.unlinkSync(rotated);
      fs.renameSync(file, rotated);
    }
  } catch {
    // Best-effort rotation; do not crash the app if it fails.
  }
}

function build(): Logger {
  let logFile: string;
  try {
    // Will fail before app.isReady; fall back to stdout-only in that case.
    getLogsDir();
    logFile = getLogFile();
    rotateIfNeeded(logFile);
  } catch {
    return pino({ level: process.env['LOG_LEVEL'] ?? 'info' });
  }

  const dest = pino.destination({ dest: logFile, sync: false, mkdir: true });
  return pino(
    {
      level: process.env['LOG_LEVEL'] ?? 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      base: { app: 'cherrygit' }
    },
    dest
  );
}

export function logger(): Logger {
  if (!instance) instance = build();
  return instance;
}

export function logInfo(msg: string, extra?: Record<string, unknown>): void {
  logger().info(extra ?? {}, msg);
}

export function logError(msg: string, err?: unknown, extra?: Record<string, unknown>): void {
  const payload: Record<string, unknown> = { ...(extra ?? {}) };
  if (err instanceof Error) {
    payload['err'] = { name: err.name, message: err.message, stack: err.stack };
  } else if (err !== undefined) {
    payload['err'] = err;
  }
  logger().error(payload, msg);
}

export function logDebug(msg: string, extra?: Record<string, unknown>): void {
  logger().debug(extra ?? {}, msg);
}

export function logWarn(msg: string, extra?: Record<string, unknown>): void {
  logger().warn(extra ?? {}, msg);
}

