import fs from 'node:fs';
import path from 'node:path';
import type {
  AbortResult,
  CommitApplyResult,
  ExecuteResult,
  Progress,
  RepoStatus,
  StepResult
} from '@shared/types.js';
import { extractGitError, git } from './exec.js';
import { resolveRepoPath, validateBranchName, validateSha } from './validators.js';

export type ProgressCallback = (evt: Progress) => void;

async function isCherryPickInProgress(repo: string): Promise<boolean> {
  try {
    const out = await git(repo, ['rev-parse', '--git-path', 'CHERRY_PICK_HEAD']);
    const p = path.isAbsolute(out) ? out : path.join(repo, out);
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

async function hasUnresolvedConflictMarkers(repo: string): Promise<boolean> {
  try {
    const out = await git(repo, ['diff', '--name-only', '--diff-filter=U']);
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

async function unresolvedConflictFiles(repo: string): Promise<string[]> {
  try {
    const out = await git(repo, ['diff', '--name-only', '--diff-filter=U']);
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getStatus(reposRoot: string, name: string): Promise<RepoStatus> {
  const repo = resolveRepoPath(reposRoot, name);
  const porcelain = await git(repo, ['status', '--porcelain']);
  const clean = porcelain.trim().length === 0;
  const inProgress = await isCherryPickInProgress(repo);
  let currentBranch: string | null = null;
  try {
    const raw = await git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);
    currentBranch = raw && raw !== 'HEAD' ? raw : null;
  } catch {
    currentBranch = null;
  }
  const unresolvedConflicts = await unresolvedConflictFiles(repo);

  return { clean, cherryPickInProgress: inProgress, currentBranch, unresolvedConflicts };
}

export async function abortCherryPick(reposRoot: string, name: string): Promise<AbortResult> {
  const repo = resolveRepoPath(reposRoot, name);
  if (!(await isCherryPickInProgress(repo))) {
    return { success: false, error: 'No hay un cherry-pick en progreso para abortar.' };
  }
  try {
    await git(repo, ['cherry-pick', '--abort']);
    return { success: true };
  } catch (err) {
    return { success: false, error: extractGitError(err) };
  }
}

export async function continueCherryPick(
  reposRoot: string,
  name: string,
  pendingShas: string[],
  opts: { useX?: boolean; onProgress?: ProgressCallback } = {}
): Promise<ExecuteResult> {
  const useX = opts.useX !== false;
  const onProgress = opts.onProgress;
  const repo = resolveRepoPath(reposRoot, name);

  const steps: StepResult[] = [];
  const results: CommitApplyResult[] = [];

  const inProgress = await isCherryPickInProgress(repo);

  if (inProgress) {
    if (await hasUnresolvedConflictMarkers(repo)) {
      return {
        success: false,
        steps,
        results,
        conflict: true,
        repo: name,
        error:
          'Aun hay archivos con conflictos sin resolver. Termina de resolver y stagear los archivos (git add) antes de continuar.'
      };
    }
    try {
      await git(repo, ['-c', 'core.editor=true', 'cherry-pick', '--continue']);
      const newSha = await git(repo, ['rev-parse', 'HEAD']);
      steps.push({ step: 'cherry-pick-continue', ok: true });
      onProgress?.({ phase: 'cherry-pick', step: 'cherry-pick-continue', ok: true, repo: name });
      results.push({ sha: '(resuelto)', ok: true, newSha });
    } catch (err) {
      const msg = extractGitError(err);
      steps.push({ step: 'cherry-pick-continue', ok: false, stderr: msg });
      onProgress?.({
        phase: 'cherry-pick',
        step: 'cherry-pick-continue',
        ok: false,
        repo: name,
        error: msg
      });
      return {
        success: false,
        steps,
        results,
        repo: name,
        error:
          'git cherry-pick --continue fallo. Revisa el estado del repo manualmente. ' + msg
      };
    }
  } else {
    steps.push({ step: 'cherry-pick-continue', ok: true });
  }

  if (!Array.isArray(pendingShas) || pendingShas.length === 0) {
    return {
      success: true,
      steps,
      results,
      repo: name,
      note: 'Cherry-pick continuado. No habia SHAs pendientes por aplicar.'
    };
  }
  pendingShas.forEach(validateSha);

  for (let i = 0; i < pendingShas.length; i++) {
    const sha = pendingShas[i]!;
    try {
      const args = useX ? ['cherry-pick', '-x', sha] : ['cherry-pick', sha];
      await git(repo, args);
      const newSha = await git(repo, ['rev-parse', 'HEAD']);
      results.push({ sha, ok: true, newSha });
      onProgress?.({ phase: 'cherry-pick', step: 'cherry-pick', ok: true, repo: name, sha, newSha });
    } catch (err) {
      const msg = extractGitError(err);
      results.push({ sha, ok: false, error: msg });
      const pending = pendingShas.slice(i + 1);
      onProgress?.({
        phase: 'cherry-pick',
        step: 'cherry-pick',
        ok: false,
        repo: name,
        sha,
        error: msg
      });
      return {
        success: false,
        steps,
        results,
        conflict: true,
        conflictAt: sha,
        pendingShas: pending,
        repo: name,
        error: `Conflicto al aplicar ${sha}. Resuelvelo manualmente en el repo ${name}.`
      };
    }
  }
  steps.push({ step: 'cherry-pick-pending', ok: true });

  return {
    success: true,
    steps,
    results,
    repo: name,
    note: 'Cherry-pick completado. Haz push manualmente cuando lo valides.'
  };
}

export async function executeCherryPick(
  reposRoot: string,
  name: string,
  targetBranch: string,
  shas: string[],
  opts: { useX?: boolean; sourceBranch?: string; onProgress?: ProgressCallback } = {}
): Promise<ExecuteResult> {
  const useX = opts.useX !== false;
  const sourceBranch = opts.sourceBranch;
  const onProgress = opts.onProgress;

  validateBranchName(targetBranch);
  if (sourceBranch) validateBranchName(sourceBranch);
  if (!Array.isArray(shas) || shas.length === 0) {
    return {
      success: false,
      steps: [],
      results: [],
      repo: name,
      error: 'Lista de commits vacia'
    };
  }
  shas.forEach(validateSha);

  const repo = resolveRepoPath(reposRoot, name);
  const steps: StepResult[] = [];

  // 1. Working tree clean
  const status = await git(repo, ['status', '--porcelain']);
  if (status.trim()) {
    return {
      success: false,
      steps,
      results: [],
      repo: name,
      sourceBranch,
      targetBranch,
      error: 'Working tree no esta limpio. Haz commit o stash de tus cambios antes de continuar.'
    };
  }
  steps.push({ step: 'working-tree-clean', ok: true });
  onProgress?.({ phase: 'status', step: 'working-tree-clean', ok: true, repo: name });

  // 2. Fetch
  try {
    await git(repo, ['fetch', '--all', '--prune']);
    steps.push({ step: 'fetch', ok: true });
    onProgress?.({ phase: 'fetch', step: 'fetch', ok: true, repo: name });
  } catch (err) {
    const msg = extractGitError(err);
    steps.push({ step: 'fetch', ok: false, stderr: msg });
    onProgress?.({ phase: 'fetch', step: 'fetch', ok: false, repo: name, error: msg });
    return {
      success: false,
      steps,
      results: [],
      repo: name,
      sourceBranch,
      targetBranch,
      error: 'git fetch fallo: ' + msg
    };
  }

  // 3. Checkout
  try {
    await git(repo, ['checkout', targetBranch]);
    steps.push({ step: 'checkout', ok: true });
    onProgress?.({ phase: 'checkout', step: 'checkout', ok: true, repo: name });
  } catch (err) {
    const msg = extractGitError(err);
    steps.push({ step: 'checkout', ok: false, stderr: msg });
    onProgress?.({ phase: 'checkout', step: 'checkout', ok: false, repo: name, error: msg });
    return {
      success: false,
      steps,
      results: [],
      repo: name,
      sourceBranch,
      targetBranch,
      error: `No se pudo hacer checkout a ${targetBranch}: ` + msg
    };
  }

  // 4. Pull --ff-only
  try {
    await git(repo, ['pull', '--ff-only']);
    steps.push({ step: 'pull', ok: true });
    onProgress?.({ phase: 'pull', step: 'pull', ok: true, repo: name });
  } catch (err) {
    const msg = extractGitError(err);
    steps.push({ step: 'pull', ok: false, stderr: msg });
    onProgress?.({ phase: 'pull', step: 'pull', ok: false, repo: name, error: msg });
    return {
      success: false,
      steps,
      results: [],
      repo: name,
      sourceBranch,
      targetBranch,
      error:
        'git pull --ff-only fallo. El branch local diverge del remoto; resuelvelo manualmente. ' +
        msg
    };
  }

  // 5. Cherry-pick one by one
  const results: CommitApplyResult[] = [];
  for (let i = 0; i < shas.length; i++) {
    const sha = shas[i]!;
    try {
      const args = useX ? ['cherry-pick', '-x', sha] : ['cherry-pick', sha];
      await git(repo, args);
      const newSha = await git(repo, ['rev-parse', 'HEAD']);
      results.push({ sha, ok: true, newSha });
      onProgress?.({ phase: 'cherry-pick', step: 'cherry-pick', ok: true, repo: name, sha, newSha });
    } catch (err) {
      const msg = extractGitError(err);
      results.push({ sha, ok: false, error: msg });
      const pending = shas.slice(i + 1);
      onProgress?.({
        phase: 'cherry-pick',
        step: 'cherry-pick',
        ok: false,
        repo: name,
        sha,
        error: msg
      });
      return {
        success: false,
        steps,
        results,
        conflict: true,
        conflictAt: sha,
        pendingShas: pending,
        repo: name,
        sourceBranch,
        targetBranch,
        error: `Conflicto al aplicar ${sha}. Resuelvelo manualmente en el repo ${name} (no se ejecuta --abort automaticamente).`
      };
    }
  }
  steps.push({ step: 'cherry-pick', ok: true });

  return {
    success: true,
    steps,
    results,
    repo: name,
    sourceBranch,
    targetBranch,
    note: 'Cherry-pick aplicado en local. Haz push manualmente cuando lo valides.'
  };
}
