import keytar from 'keytar';
import { Octokit } from '@octokit/rest';
import type { Session } from '@shared/types.js';
import { logError, logInfo } from '../utils/logger.js';

const SERVICE = 'CherryGit';
const ACCOUNT = 'github-token';

let cachedSession: Session | null = null;

export async function getToken(): Promise<string | null> {
  return keytar.getPassword(SERVICE, ACCOUNT);
}

export async function getSession(): Promise<Session | null> {
  if (cachedSession) return cachedSession;
  const token = await getToken();
  if (!token) return null;
  try {
    const octokit = new Octokit({ auth: token });
    const res = await octokit.request('GET /user');
    const scopes = parseScopes(res.headers['x-oauth-scopes']);
    const user = res.data as {
      login: string;
      name?: string | null;
      email?: string | null;
      avatar_url: string;
    };
    cachedSession = {
      user: {
        login: user.login,
        ...(user.name ? { name: user.name } : {}),
        ...(user.email ? { email: user.email } : {}),
        avatarUrl: user.avatar_url
      },
      scopes,
      createdAt: new Date().toISOString()
    };
    return cachedSession;
  } catch (err) {
    logError('auth.getSession failed', err);
    return null;
  }
}

export async function login(token: string): Promise<Session> {
  if (typeof token !== 'string' || token.trim().length < 10) {
    throw new Error('Token invalido');
  }
  const clean = token.trim();
  const octokit = new Octokit({ auth: clean });
  let res;
  try {
    res = await octokit.request('GET /user');
  } catch (err) {
    logError('auth.login validation failed', err);
    throw new Error('No se pudo validar el token con GitHub. Verifica que sea correcto y tenga scope `repo`.');
  }
  const scopes = parseScopes(res.headers['x-oauth-scopes']);
  const user = res.data as {
    login: string;
    name?: string | null;
    email?: string | null;
    avatar_url: string;
  };
  await keytar.setPassword(SERVICE, ACCOUNT, clean);
  const session: Session = {
    user: {
      login: user.login,
      ...(user.name ? { name: user.name } : {}),
      ...(user.email ? { email: user.email } : {}),
      avatarUrl: user.avatar_url
    },
    scopes,
    createdAt: new Date().toISOString()
  };
  cachedSession = session;
  logInfo('auth.login ok', { user: session.user.login });
  return session;
}

export async function logout(): Promise<void> {
  try {
    await keytar.deletePassword(SERVICE, ACCOUNT);
  } catch (err) {
    logError('auth.logout keytar delete failed', err);
  }
  cachedSession = null;
}

function parseScopes(h: unknown): string[] {
  if (typeof h !== 'string' || !h.trim()) return [];
  return h
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
