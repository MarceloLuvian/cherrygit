import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type {
  AbortResult,
  Branches,
  CherryGitAPI,
  Commit,
  CommitDetail,
  ExecuteParams,
  ExecuteResult,
  HistoryEntry,
  HistoryFilters,
  LocalRepo,
  Preferences,
  Progress,
  Repo,
  RepoStatus,
  Session,
  ThemeMode
} from '../shared/types';

const api: CherryGitAPI = {
  auth: {
    getSession: () => ipcRenderer.invoke(IPC.auth.getSession) as Promise<Session | null>,
    login: (token: string) => ipcRenderer.invoke(IPC.auth.login, token) as Promise<Session>,
    logout: () => ipcRenderer.invoke(IPC.auth.logout) as Promise<void>
  },
  repos: {
    list: (force?: boolean) => ipcRenderer.invoke(IPC.repos.list, !!force) as Promise<Repo[]>,
    clone: (owner: string, name: string) =>
      ipcRenderer.invoke(IPC.repos.clone, owner, name) as Promise<LocalRepo>,
    getLocalClones: () => ipcRenderer.invoke(IPC.repos.localClones) as Promise<LocalRepo[]>,
    openInFinder: (fullName: string) =>
      ipcRenderer.invoke(IPC.repos.openInFinder, fullName) as Promise<void>
  },
  git: {
    listBranches: (repo: string) =>
      ipcRenderer.invoke(IPC.git.listBranches, repo) as Promise<Branches>,
    listCommits: (repo: string, branch: string, since: string, until?: string) =>
      ipcRenderer.invoke(IPC.git.listCommits, repo, branch, since, until) as Promise<Commit[]>,
    inspect: (repo: string, shas: string[]) =>
      ipcRenderer.invoke(IPC.git.inspect, repo, shas) as Promise<CommitDetail[]>,
    execute: (params: ExecuteParams) =>
      ipcRenderer.invoke(IPC.git.execute, params) as Promise<ExecuteResult>,
    continueOp: (repo: string, pendingShas: string[], opts: { useX: boolean }) =>
      ipcRenderer.invoke(IPC.git.continue, repo, pendingShas, opts) as Promise<ExecuteResult>,
    abort: (repo: string) => ipcRenderer.invoke(IPC.git.abort, repo) as Promise<AbortResult>,
    getStatus: (repo: string) => ipcRenderer.invoke(IPC.git.status, repo) as Promise<RepoStatus>
  },
  history: {
    list: (filters?: HistoryFilters) =>
      ipcRenderer.invoke(IPC.history.list, filters ?? {}) as Promise<HistoryEntry[]>,
    export: (format: 'json' | 'csv') =>
      ipcRenderer.invoke(IPC.history.export, format) as Promise<string>
  },
  preferences: {
    get: () => ipcRenderer.invoke(IPC.preferences.get) as Promise<Preferences>,
    set: (prefs: Partial<Preferences>) =>
      ipcRenderer.invoke(IPC.preferences.set, prefs) as Promise<void>
  },
  system: {
    openInEditor: (p: string) => ipcRenderer.invoke(IPC.system.openInEditor, p) as Promise<void>,
    openInTerminal: (p: string) =>
      ipcRenderer.invoke(IPC.system.openInTerminal, p) as Promise<void>,
    openInFinder: (p: string) => ipcRenderer.invoke(IPC.system.openInFinder, p) as Promise<void>,
    newWindow: () => ipcRenderer.invoke(IPC.system.newWindow) as Promise<void>
  },
  theme: {
    get: () =>
      ipcRenderer.invoke(IPC.theme.get) as Promise<{ mode: ThemeMode; shouldUseDark: boolean }>,
    set: (mode: ThemeMode) =>
      ipcRenderer.invoke(IPC.theme.set, mode) as Promise<{
        mode: ThemeMode;
        shouldUseDark: boolean;
      }>,
    onChange: (listener: (payload: { mode: ThemeMode; shouldUseDark: boolean }) => void) => {
      const channel = IPC.theme.changed;
      const handler = (
        _e: unknown,
        payload: { mode: ThemeMode; shouldUseDark: boolean }
      ) => listener(payload);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    }
  },
  progress: {
    subscribe: (listener: (p: Progress) => void) => {
      const channel = IPC.progress.event;
      const handler = (_e: unknown, p: Progress) => listener(p);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    }
  }
};

try {
  contextBridge.exposeInMainWorld('cherrygit', api);
} catch (err) {
  console.error('Failed to expose cherrygit API', err);
}
