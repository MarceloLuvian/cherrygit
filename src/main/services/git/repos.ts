import fs from 'node:fs';
import path from 'node:path';
import type { Repo } from '@shared/types.js';
import { git } from './exec.js';

/**
 * Lists subdirectories of `reposRoot` that contain a `.git` directory,
 * sorted alphabetically by name. Returns name, absolute path, and
 * current branch (best-effort; undefined if git fails).
 */
export async function listRepos(reposRoot: string): Promise<Repo[]> {
  if (!reposRoot || !fs.existsSync(reposRoot)) return [];
  const entries = fs.readdirSync(reposRoot, { withFileTypes: true });
  const repos: Repo[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('.')) continue;
    const p = path.join(reposRoot, e.name);
    if (!fs.existsSync(path.join(p, '.git'))) continue;
    let currentBranch: string | null = null;
    try {
      const branch = await git(p, ['rev-parse', '--abbrev-ref', 'HEAD']);
      currentBranch = branch && branch !== 'HEAD' ? branch : null;
    } catch {
      currentBranch = null;
    }
    repos.push({ name: e.name, path: p, currentBranch });
  }
  return repos.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}
