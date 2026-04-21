import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { LocalRepo } from '@shared/types.js';
import { getReposDir, getRepoLocalPath } from '../utils/paths.js';
import { getToken } from './auth.service.js';
import { validateRepoFullName } from '../utils/validators.js';
import { logError, logInfo } from '../utils/logger.js';

export async function cloneRepo(
  owner: string,
  name: string,
  onProgress?: (line: string) => void
): Promise<LocalRepo> {
  const fullName = `${owner}/${name}`;
  validateRepoFullName(fullName);

  const token = await getToken();
  if (!token) {
    throw new Error('No hay token. Loggeate primero.');
  }

  const targetPath = getRepoLocalPath(fullName);

  if (fs.existsSync(path.join(targetPath, '.git'))) {
    logInfo('clone: repo ya clonado', { fullName });
    return {
      fullName,
      localPath: targetPath,
      lastOpenedAt: new Date().toISOString()
    };
  }

  await fsp.mkdir(path.dirname(targetPath), { recursive: true });

  const askpassPath = await createAskpassHelper(token);

  try {
    const cloneUrl = `https://github.com/${owner}/${name}.git`;
    await runClone(cloneUrl, targetPath, askpassPath, onProgress);
  } finally {
    await safeUnlink(askpassPath);
  }

  logInfo('clone: ok', { fullName, targetPath });
  return {
    fullName,
    localPath: targetPath,
    lastOpenedAt: new Date().toISOString()
  };
}

function runClone(
  url: string,
  dest: string,
  askpassPath: string,
  onProgress?: (line: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      GIT_ASKPASS: askpassPath,
      GIT_TERMINAL_PROMPT: '0'
    };

    const proc = spawn('git', ['clone', '--progress', url, dest], {
      env,
      shell: false
    });

    let stderr = '';

    proc.stdout.on('data', (d: Buffer) => {
      const msg = d.toString();
      if (onProgress) onProgress(msg);
    });
    proc.stderr.on('data', (d: Buffer) => {
      const msg = d.toString();
      stderr += msg;
      if (onProgress) onProgress(msg);
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `git clone fallo con codigo ${code}`));
    });
  });
}

async function createAskpassHelper(token: string): Promise<string> {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'cherrygit-askpass-'));
  const file = path.join(tmpDir, 'askpass.sh');
  // git will call this with the prompt ("Username for ..." or "Password for ...").
  // For a PAT, returning the token as the password works; the username is typically ignored
  // or can be any non-empty string. We return the token on password prompts and "x-access-token"
  // on username prompts.
  const script =
    '#!/bin/sh\n' +
    'case "$1" in\n' +
    '  Username*) echo "x-access-token" ;;\n' +
    `  *) printf '%s' ${shellEscape(token)} ;;\n` +
    'esac\n';
  await fsp.writeFile(file, script, { mode: 0o700 });
  return file;
}

function shellEscape(s: string): string {
  // Single-quote escaping safe for /bin/sh: 'foo' with ' inside becomes 'foo'\''bar'
  return `'${s.replace(/'/g, "'\\''")}'`;
}

async function safeUnlink(p: string): Promise<void> {
  try {
    await fsp.unlink(p);
    await fsp.rmdir(path.dirname(p));
  } catch (err) {
    logError('clone: cleanup askpass failed', err, { path: p });
  }
}

export async function getLocalClones(): Promise<LocalRepo[]> {
  const root = getReposDir();
  const results: LocalRepo[] = [];
  if (!fs.existsSync(root)) return results;

  const owners = await fsp.readdir(root, { withFileTypes: true });
  for (const ownerDir of owners) {
    if (!ownerDir.isDirectory()) continue;
    const ownerPath = path.join(root, ownerDir.name);
    const repos = await fsp.readdir(ownerPath, { withFileTypes: true });
    for (const repoDir of repos) {
      if (!repoDir.isDirectory()) continue;
      const repoPath = path.join(ownerPath, repoDir.name);
      if (!fs.existsSync(path.join(repoPath, '.git'))) continue;
      let lastOpenedAt = new Date().toISOString();
      try {
        const stat = await fsp.stat(repoPath);
        lastOpenedAt = stat.mtime.toISOString();
      } catch {
        /* ignore */
      }
      results.push({
        fullName: `${ownerDir.name}/${repoDir.name}`,
        localPath: repoPath,
        lastOpenedAt
      });
    }
  }
  return results;
}

export async function resolveRepoPath(fullName: string): Promise<string> {
  validateRepoFullName(fullName);
  const p = getRepoLocalPath(fullName);
  if (!fs.existsSync(path.join(p, '.git'))) {
    throw new Error(`Repo no clonado localmente: ${fullName}`);
  }
  return p;
}
