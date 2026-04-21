import fs from 'node:fs';
import path from 'node:path';
import type {
  AbortResult,
  Branches,
  Commit,
  CommitDetail,
  CommitFile,
  ExecuteParams,
  ExecuteResult,
  RepoStatus,
  StepResult,
  CommitApplyResult
} from '@shared/types.js';
import { git, extractGitError } from '../utils/git-exec.js';
import { resolveRepoPath } from './clone.service.js';
import {
  validateBranchName,
  validateIsoDate,
  validateRepoFullName,
  validateSha
} from '../utils/validators.js';
import { logError, logInfo } from '../utils/logger.js';

export async function listBranches(repoFullName: string): Promise<Branches> {
  validateRepoFullName(repoFullName);
  const repo = await resolveRepoPath(repoFullName);

  try {
    await git(repo, ['fetch', '--all', '--prune']);
  } catch (err) {
    logError('git.listBranches: fetch failed (continuing)', err, { repo: repoFullName });
  }

  const localOut = await git(repo, ['for-each-ref', 'refs/heads', '--format=%(refname:short)']);
  const remoteOut = await git(repo, ['for-each-ref', 'refs/remotes', '--format=%(refname:short)']);
  const current = await git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);

  const local = localOut.split('\n').map((s) => s.trim()).filter(Boolean);
  const remote = remoteOut
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((b) => !b.endsWith('/HEAD'));

  return { current: current || null, local, remote };
}

export async function listCommits(
  repoFullName: string,
  branch: string,
  since: string,
  until?: string
): Promise<Commit[]> {
  validateRepoFullName(repoFullName);
  validateBranchName(branch);
  validateIsoDate(since);
  if (until) validateIsoDate(until);
  const repo = await resolveRepoPath(repoFullName);

  const args = [
    'log',
    branch,
    `--since=${since}`,
    '--format=%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%s',
    '--no-merges'
  ];
  if (until) {
    args.splice(3, 0, `--until=${until} 23:59:59`);
  }
  const out = await git(repo, args);
  const commits = out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l): Commit => {
      const [fullSha, shortSha, author, authorEmail, date, ...rest] = l.split('\x1f');
      return {
        fullSha: fullSha ?? '',
        shortSha: shortSha ?? '',
        author: author ?? '',
        authorEmail: authorEmail ?? '',
        date: date ?? '',
        subject: (rest.join('\x1f') ?? '').trim()
      };
    });
  // Orden cronologico ascendente (mas viejo primero) para cherry-pick correcto
  commits.reverse();
  return commits;
}

export async function inspectCommits(
  repoFullName: string,
  shas: string[]
): Promise<CommitDetail[]> {
  validateRepoFullName(repoFullName);
  const repo = await resolveRepoPath(repoFullName);
  const results: CommitDetail[] = [];

  for (const raw of shas) {
    const sha = String(raw).trim();
    if (!sha) continue;
    validateSha(sha);

    const info = await git(repo, [
      'show',
      '--no-patch',
      '--format=%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%s%x1e%b',
      sha
    ]);
    const [head, body = ''] = info.split('\x1e');
    const parts = (head ?? '').split('\x1f');
    const [fullSha = '', shortSha = '', author = '', authorEmail = '', date = '', subject = ''] =
      parts;

    const filesOut = await git(repo, [
      'show',
      '--numstat',
      '--format=',
      sha
    ]);
    const statusOut = await git(repo, [
      'show',
      '--name-status',
      '--format=',
      sha
    ]);

    const statusMap = new Map<string, string>();
    for (const line of statusOut.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [status, ...rest] = trimmed.split('\t');
      const p = rest[rest.length - 1];
      if (status && p) statusMap.set(p, status[0] ?? 'M');
    }

    const files: CommitFile[] = filesOut
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const parts2 = l.split('\t');
        const added = parts2[0] === '-' ? 0 : parseInt(parts2[0] ?? '0', 10) || 0;
        const deleted = parts2[1] === '-' ? 0 : parseInt(parts2[1] ?? '0', 10) || 0;
        const filePath = parts2[2] ?? '';
        return {
          path: filePath,
          status: statusMap.get(filePath) ?? 'M',
          additions: added,
          deletions: deleted
        };
      });

    results.push({
      fullSha,
      shortSha,
      author,
      authorEmail,
      date,
      subject: subject.trim(),
      body: body.trim(),
      files
    });
  }
  return results;
}

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

export async function getStatus(repoFullName: string): Promise<RepoStatus> {
  validateRepoFullName(repoFullName);
  const repo = await resolveRepoPath(repoFullName);

  const porcelain = await git(repo, ['status', '--porcelain']);
  const clean = porcelain.trim().length === 0;
  const inProgress = await isCherryPickInProgress(repo);
  let currentBranch: string | null = null;
  try {
    currentBranch = (await git(repo, ['rev-parse', '--abbrev-ref', 'HEAD'])) || null;
    if (currentBranch === 'HEAD') currentBranch = null;
  } catch {
    currentBranch = null;
  }
  const unresolvedConflicts = await unresolvedConflictFiles(repo);

  return {
    clean,
    cherryPickInProgress: inProgress,
    currentBranch,
    unresolvedConflicts
  };
}

export async function abortCherryPick(repoFullName: string): Promise<AbortResult> {
  validateRepoFullName(repoFullName);
  const repo = await resolveRepoPath(repoFullName);
  if (!(await isCherryPickInProgress(repo))) {
    return {
      success: false,
      error: 'No hay un cherry-pick en progreso para abortar.'
    };
  }
  try {
    await git(repo, ['cherry-pick', '--abort']);
    logInfo('git.abortCherryPick ok', { repo: repoFullName });
    return { success: true };
  } catch (err) {
    logError('git.abortCherryPick failed', err, { repo: repoFullName });
    return { success: false, error: extractGitError(err) };
  }
}

export async function continueCherryPick(
  repoFullName: string,
  pendingShas: string[],
  opts: { useX: boolean } = { useX: true }
): Promise<ExecuteResult> {
  validateRepoFullName(repoFullName);
  const useX = opts.useX !== false;
  const repo = await resolveRepoPath(repoFullName);

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
        repo: repoFullName,
        error:
          'Aun hay archivos con conflictos sin resolver. Termina de resolver y stagear los archivos (git add) antes de continuar.'
      };
    }
    try {
      await git(repo, ['-c', 'core.editor=true', 'cherry-pick', '--continue']);
      const newSha = await git(repo, ['rev-parse', 'HEAD']);
      steps.push({ step: 'cherry-pick-continue', ok: true });
      results.push({ sha: '(resuelto)', ok: true, newSha });
    } catch (err) {
      const msg = extractGitError(err);
      steps.push({ step: 'cherry-pick-continue', ok: false, stderr: msg });
      return {
        success: false,
        steps,
        results,
        repo: repoFullName,
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
      repo: repoFullName,
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
    } catch (err) {
      const msg = extractGitError(err);
      results.push({ sha, ok: false, error: msg });
      const pending = pendingShas.slice(i + 1);
      return {
        success: false,
        steps,
        results,
        conflict: true,
        conflictAt: sha,
        pendingShas: pending,
        repo: repoFullName,
        error: `Conflicto al aplicar ${sha}. Resuelvelo manualmente en el repo ${repoFullName}.`
      };
    }
  }
  steps.push({ step: 'cherry-pick-pending', ok: true });

  return {
    success: true,
    steps,
    results,
    repo: repoFullName,
    note: 'Cherry-pick completado. Haz push manualmente cuando lo valides.'
  };
}

export async function executeCherryPick(params: ExecuteParams): Promise<ExecuteResult> {
  const { repoFullName, sourceBranch, targetBranch, shas, useX } = params;
  validateRepoFullName(repoFullName);
  validateBranchName(targetBranch);
  if (sourceBranch) validateBranchName(sourceBranch);
  if (!Array.isArray(shas) || shas.length === 0) {
    return {
      success: false,
      steps: [],
      results: [],
      repo: repoFullName,
      error: 'Lista de commits vacia'
    };
  }
  shas.forEach(validateSha);

  const repo = await resolveRepoPath(repoFullName);
  const steps: StepResult[] = [];

  // 1. Working tree limpio
  const status = await git(repo, ['status', '--porcelain']);
  if (status.trim()) {
    return {
      success: false,
      steps,
      results: [],
      repo: repoFullName,
      sourceBranch,
      targetBranch,
      error:
        'Working tree no esta limpio. Haz commit o stash de tus cambios antes de continuar.'
    };
  }
  steps.push({ step: 'working-tree-clean', ok: true });

  // 2. Fetch
  try {
    await git(repo, ['fetch', '--all', '--prune']);
    steps.push({ step: 'fetch', ok: true });
  } catch (err) {
    const msg = extractGitError(err);
    steps.push({ step: 'fetch', ok: false, stderr: msg });
    return {
      success: false,
      steps,
      results: [],
      repo: repoFullName,
      sourceBranch,
      targetBranch,
      error: 'git fetch fallo: ' + msg
    };
  }

  // 3. Checkout
  try {
    await git(repo, ['checkout', targetBranch]);
    steps.push({ step: 'checkout', ok: true });
  } catch (err) {
    const msg = extractGitError(err);
    steps.push({ step: 'checkout', ok: false, stderr: msg });
    return {
      success: false,
      steps,
      results: [],
      repo: repoFullName,
      sourceBranch,
      targetBranch,
      error: `No se pudo hacer checkout a ${targetBranch}: ` + msg
    };
  }

  // 4. Pull --ff-only
  try {
    await git(repo, ['pull', '--ff-only']);
    steps.push({ step: 'pull', ok: true });
  } catch (err) {
    const msg = extractGitError(err);
    steps.push({ step: 'pull', ok: false, stderr: msg });
    return {
      success: false,
      steps,
      results: [],
      repo: repoFullName,
      sourceBranch,
      targetBranch,
      error:
        'git pull --ff-only fallo. El branch local diverge del remoto; resuelvelo manualmente. ' +
        msg
    };
  }

  // 5. Cherry-pick uno por uno
  const results: CommitApplyResult[] = [];
  for (let i = 0; i < shas.length; i++) {
    const sha = shas[i]!;
    try {
      const args = useX ? ['cherry-pick', '-x', sha] : ['cherry-pick', sha];
      await git(repo, args);
      const newSha = await git(repo, ['rev-parse', 'HEAD']);
      results.push({ sha, ok: true, newSha });
    } catch (err) {
      const msg = extractGitError(err);
      results.push({ sha, ok: false, error: msg });
      const pending = shas.slice(i + 1);
      return {
        success: false,
        steps,
        results,
        conflict: true,
        conflictAt: sha,
        pendingShas: pending,
        repo: repoFullName,
        sourceBranch,
        targetBranch,
        error: `Conflicto al aplicar ${sha}. Resuelvelo manualmente en el repo ${repoFullName} (no se ejecuta --abort automaticamente).`
      };
    }
  }
  steps.push({ step: 'cherry-pick', ok: true });

  return {
    success: true,
    steps,
    results,
    repo: repoFullName,
    sourceBranch,
    targetBranch,
    note: 'Cherry-pick aplicado en local. Haz push manualmente cuando lo valides.'
  };
}
