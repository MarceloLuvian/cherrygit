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
  Preferences,
  Progress,
  Repo,
  RepoStatus,
  ThemeMode
} from '../shared/types';

const api: CherryGitAPI = {
  repos: {
    list: () => ipcRenderer.invoke(IPC.repos.list) as Promise<Repo[]>,
    refresh: () => ipcRenderer.invoke(IPC.repos.refresh) as Promise<Repo[]>,
    openInFinder: (name: string) =>
      ipcRenderer.invoke(IPC.repos.openInFinder, name) as Promise<void>,
    getStatus: (name: string) =>
      ipcRenderer.invoke(IPC.repos.getStatus, name) as Promise<RepoStatus>
  },
  git: {
    listBranches: (name: string) =>
      ipcRenderer.invoke(IPC.git.listBranches, name) as Promise<Branches>,
    listCommits: (name: string, branch: string, since: string, until?: string) =>
      ipcRenderer.invoke(IPC.git.listCommits, name, branch, since, until) as Promise<Commit[]>,
    inspect: (name: string, shas: string[]) =>
      ipcRenderer.invoke(IPC.git.inspect, name, shas) as Promise<CommitDetail[]>,
    execute: (params: ExecuteParams) =>
      ipcRenderer.invoke(IPC.git.execute, params) as Promise<ExecuteResult>,
    continueOp: (name: string, pendingShas: string[], opts: { useX: boolean }) =>
      ipcRenderer.invoke(IPC.git.continue, name, pendingShas, opts) as Promise<ExecuteResult>,
    abort: (name: string) => ipcRenderer.invoke(IPC.git.abort, name) as Promise<AbortResult>
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
    newWindow: () => ipcRenderer.invoke(IPC.system.newWindow) as Promise<void>,
    pickDirectory: () => ipcRenderer.invoke(IPC.system.pickDirectory) as Promise<string | null>,
    openLogsDir: () => ipcRenderer.invoke(IPC.system.openLogsDir) as Promise<string>
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
