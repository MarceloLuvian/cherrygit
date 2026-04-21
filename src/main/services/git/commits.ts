import type { Commit, CommitDetail, CommitFile } from '@shared/types.js';
import { git } from './exec.js';
import {
  resolveRepoPath,
  validateBranchName,
  validateIsoDate,
  validateSha
} from './validators.js';

export async function listCommitsInRange(
  reposRoot: string,
  name: string,
  branch: string,
  since: string,
  until?: string
): Promise<Commit[]> {
  validateBranchName(branch);
  validateIsoDate(since);
  if (until) validateIsoDate(until);
  const repo = resolveRepoPath(reposRoot, name);

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
  // Chronological ascending (oldest first) for correct cherry-pick ordering.
  commits.reverse();
  return commits;
}

export async function inspectCommits(
  reposRoot: string,
  name: string,
  shas: string[]
): Promise<CommitDetail[]> {
  const repo = resolveRepoPath(reposRoot, name);
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

    const filesOut = await git(repo, ['show', '--numstat', '--format=', sha]);
    const statusOut = await git(repo, ['show', '--name-status', '--format=', sha]);

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
