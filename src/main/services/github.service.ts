import { Octokit } from '@octokit/rest';
import type { Repo } from '@shared/types.js';
import { getToken } from './auth.service.js';
import { getLocalClones } from './clone.service.js';
import { logError } from '../utils/logger.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; data: Repo[] } | null = null;

export async function getOctokit(): Promise<Octokit> {
  const token = await getToken();
  if (!token) {
    throw new Error('No hay sesion. Loggeate primero.');
  }
  return new Octokit({ auth: token });
}

interface ApiRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  private: boolean;
  updated_at: string | null;
  clone_url: string;
  html_url: string;
  owner: { login: string };
}

export async function listRepos(force = false): Promise<Repo[]> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }
  try {
    const octokit = await getOctokit();
    const data = await octokit.paginate('GET /user/repos', {
      per_page: 100,
      sort: 'updated',
      affiliation: 'owner,collaborator,organization_member'
    });
    const apiRepos = data as ApiRepo[];
    const localClones = await getLocalClones();
    const localMap = new Map(localClones.map((c) => [c.fullName, c.localPath]));

    const repos: Repo[] = apiRepos.map((r) => ({
      id: r.id,
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      defaultBranch: r.default_branch,
      visibility: r.private ? 'private' : 'public',
      updatedAt: r.updated_at ?? new Date(0).toISOString(),
      localPath: localMap.get(r.full_name) ?? null,
      cloneUrl: r.clone_url,
      htmlUrl: r.html_url
    }));

    cache = { at: now, data: repos };
    return repos;
  } catch (err) {
    logError('github.listRepos failed', err);
    throw err;
  }
}

export function invalidateReposCache(): void {
  cache = null;
}
