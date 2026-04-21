import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../../utils/logger.js';

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
 * Every invocation is traced to the app log.
 */
export async function git(cwd: string, args: string[], opts: GitOpts = {}): Promise<string> {
  const log = logger().child({ scope: 'git.exec' });
  const started = Date.now();
  const cmd = `git ${args.join(' ')}`;
  log.info({ cwd, cmd, args }, 'git.start');
  try {
    const { stdout, stderr } = await execFileP('git', args, {
      cwd,
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxBuffer: opts.maxBuffer ?? MAX_BUFFER,
      env: opts.env ?? process.env
    });
    const out = stdout.toString();
    const errOut = stderr.toString();
    log.info(
      {
        cwd,
        cmd,
        durationMs: Date.now() - started,
        stdoutBytes: out.length,
        stderrPreview: errOut.trim().slice(0, 500) || undefined
      },
      'git.ok'
    );
    return out.trim();
  } catch (err) {
    const anyErr = err as { code?: number; stderr?: unknown; message?: unknown };
    log.error(
      {
        cwd,
        cmd,
        durationMs: Date.now() - started,
        code: anyErr.code,
        stderr: anyErr.stderr ? String(anyErr.stderr).trim().slice(0, 2000) : undefined,
        message: anyErr.message ? String(anyErr.message).slice(0, 500) : undefined
      },
      'git.fail'
    );
    throw err;
  }
}

export function extractGitError(err: unknown): string {
  if (err && typeof err === 'object') {
    const anyErr = err as { stderr?: unknown; message?: unknown };
    if (anyErr.stderr) return String(anyErr.stderr).trim();
    if (anyErr.message) return String(anyErr.message).trim();
  }
  return String(err).trim();
}
