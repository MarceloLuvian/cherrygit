import type { Branches } from '@shared/types.js';
import { git } from './exec.js';
import { resolveRepoPath } from './validators.js';

export async function listBranches(
  reposRoot: string,
  name: string,
  opts: { fetch?: boolean } = {}
): Promise<Branches> {
  const repo = resolveRepoPath(reposRoot, name);

  if (opts.fetch !== false) {
    try {
      await git(repo, ['fetch', '--all', '--prune']);
    } catch {
      // fetch may fail offline; continue with local refs.
    }
  }

  const localOut = await git(repo, ['for-each-ref', 'refs/heads', '--format=%(refname:short)']);
  const remoteOut = await git(repo, ['for-each-ref', 'refs/remotes', '--format=%(refname:short)']);
  const currentRaw = await git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);

  const local = localOut
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const remote = remoteOut
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((b) => !b.endsWith('/HEAD'));
  const current = currentRaw && currentRaw !== 'HEAD' ? currentRaw : null;

  return { current, local, remote };
}
