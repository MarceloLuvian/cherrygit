import fs from 'node:fs';
import path from 'node:path';

const SHA_RE = /^[0-9a-f]{4,40}$/i;
const REPO_NAME_RE = /^[A-Za-z0-9._-]+$/;
// Ref-name rules: no spaces, no double-dots, no leading '-', no control chars.
const BRANCH_RE = /^(?!-)(?!.*\.\.)[A-Za-z0-9._\-/]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateSha(sha: string): string {
  if (typeof sha !== 'string' || !SHA_RE.test(sha)) {
    throw new Error(`SHA invalido: ${sha}`);
  }
  return sha;
}

export function validateRepoName(name: string): string {
  if (typeof name !== 'string' || !REPO_NAME_RE.test(name)) {
    throw new Error(`Nombre de repo invalido: ${name}`);
  }
  return name;
}

export function validateBranchName(branch: string): string {
  if (typeof branch !== 'string' || !BRANCH_RE.test(branch) || branch.length > 255) {
    throw new Error(`Nombre de rama invalido: ${branch}`);
  }
  return branch;
}

export function validateIsoDate(d: string): string {
  if (!ISO_DATE_RE.test(d)) {
    throw new Error(`Fecha invalida (esperado YYYY-MM-DD): ${d}`);
  }
  return d;
}

/**
 * Resolves a repo name (basename of a subdir under `reposRoot`) to its absolute path,
 * ensuring it exists and has a `.git` directory. Prevents path traversal.
 */
export function resolveRepoPath(reposRoot: string, name: string): string {
  validateRepoName(name);
  const resolved = path.resolve(reposRoot, name);
  const rootResolved = path.resolve(reposRoot);
  if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
    throw new Error(`Path fuera de la carpeta base: ${name}`);
  }
  if (!fs.existsSync(path.join(resolved, '.git'))) {
    throw new Error(`Repo no encontrado: ${name}`);
  }
  return resolved;
}
