import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_BUFFER = 20 * 1024 * 1024;

export interface GitOpts {
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  maxBuffer?: number;
}

export async function git(cwd: string, args: string[], opts: GitOpts = {}): Promise<string> {
  const { stdout } = await execFileP('git', args, {
    cwd,
    timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBuffer: opts.maxBuffer ?? MAX_BUFFER,
    env: opts.env ?? process.env
  });
  return stdout.toString().trim();
}

export interface GitSpawnResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export function gitSpawn(
  cwd: string,
  args: string[],
  onStdout?: (chunk: string) => void,
  onStderr?: (chunk: string) => void,
  opts: { env?: NodeJS.ProcessEnv; timeoutMs?: number } = {}
): Promise<GitSpawnResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, {
      cwd,
      env: opts.env ?? process.env,
      shell: false
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          proc.kill('SIGKILL');
        } catch {
          /* noop */
        }
        reject(new Error(`git ${args.join(' ')} timed out`));
      }
    }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    proc.stdout.on('data', (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      if (onStdout) onStdout(s);
    });
    proc.stderr.on('data', (d: Buffer) => {
      const s = d.toString();
      stderr += s;
      if (onStderr) onStderr(s);
    });
    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(err);
    });
    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });
  });
}

export function extractGitError(err: unknown): string {
  if (err && typeof err === 'object') {
    const anyErr = err as { stderr?: unknown; message?: unknown };
    if (anyErr.stderr) return String(anyErr.stderr).trim();
    if (anyErr.message) return String(anyErr.message).trim();
  }
  return String(err).trim();
}
