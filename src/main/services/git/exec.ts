import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_BUFFER = 20 * 1024 * 1024;

export interface GitOpts {
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  maxBuffer?: number;
}

/**
 * Wrapper around `git` that uses execFile (no shell) and trims stdout.
 * Returns stdout only; throws if the command exits non-zero.
 */
export async function git(cwd: string, args: string[], opts: GitOpts = {}): Promise<string> {
  const { stdout } = await execFileP('git', args, {
    cwd,
    timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBuffer: opts.maxBuffer ?? MAX_BUFFER,
    env: opts.env ?? process.env
  });
  return stdout.toString().trim();
}

export function extractGitError(err: unknown): string {
  if (err && typeof err === 'object') {
    const anyErr = err as { stderr?: unknown; message?: unknown };
    if (anyErr.stderr) return String(anyErr.stderr).trim();
    if (anyErr.message) return String(anyErr.message).trim();
  }
  return String(err).trim();
}
