export type ThemeMode = 'system' | 'light' | 'dark';

export interface Session {
  user: {
    login: string;
    name?: string;
    email?: string;
    avatarUrl: string;
  };
  scopes: string[];
  createdAt: string;
}

export interface Repo {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  visibility: 'public' | 'private';
  updatedAt: string;
  localPath?: string | null;
  cloneUrl: string;
  htmlUrl: string;
}

export interface LocalRepo {
  fullName: string;
  localPath: string;
  lastOpenedAt: string;
}

export interface Branches {
  local: string[];
  remote: string[];
  current: string | null;
}

export interface Commit {
  fullSha: string;
  shortSha: string;
  author: string;
  authorEmail: string;
  date: string;
  subject: string;
}

export interface CommitFile {
  path: string;
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'U' | string;
  additions: number;
  deletions: number;
}

export interface CommitDetail extends Commit {
  body: string;
  files: CommitFile[];
}

export interface StepResult {
  step: string;
  ok: boolean;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
}

export interface CommitApplyResult {
  sha: string;
  ok: boolean;
  newSha?: string;
  error?: string;
}

export interface ExecuteParams {
  repoFullName: string;
  sourceBranch: string;
  targetBranch: string;
  shas: string[];
  useX: boolean;
}

export interface ExecuteResult {
  success: boolean;
  steps: StepResult[];
  results: CommitApplyResult[];
  conflict?: boolean;
  conflictAt?: string;
  pendingShas?: string[];
  error?: string;
  repo: string;
  sourceBranch?: string;
  targetBranch?: string;
  note?: string;
}

export interface AbortResult {
  success: boolean;
  error?: string;
}

export interface RepoStatus {
  clean: boolean;
  cherryPickInProgress: boolean;
  currentBranch: string | null;
  unresolvedConflicts: string[];
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  repo: string;
  sourceBranch: string;
  targetBranch: string;
  originalShas: string[];
  newShas: string[];
  result: 'success' | 'conflict' | 'aborted' | 'error';
  durationMs: number;
  notes?: string;
}

export interface HistoryFilters {
  repo?: string;
  result?: HistoryEntry['result'];
  since?: string;
  until?: string;
  limit?: number;
}

export interface Preferences {
  theme: ThemeMode;
  editor: 'vscode' | 'cursor' | 'sublime' | 'system' | 'none';
  terminal: 'iterm' | 'terminal' | 'warp' | 'system';
  useX: boolean;
  cherryPickDryRunFirst: boolean;
  confirmBeforeExecute: boolean;
  notificationsEnabled: boolean;
  clonesRoot: string;
}

export interface Progress {
  phase: 'clone' | 'fetch' | 'cherry-pick' | 'inspect';
  percent?: number;
  message?: string;
}

export interface CherryGitAPI {
  auth: {
    getSession(): Promise<Session | null>;
    login(token: string): Promise<Session>;
    logout(): Promise<void>;
  };
  repos: {
    list(force?: boolean): Promise<Repo[]>;
    clone(owner: string, name: string): Promise<LocalRepo>;
    getLocalClones(): Promise<LocalRepo[]>;
    openInFinder(fullName: string): Promise<void>;
  };
  git: {
    listBranches(repoFullName: string): Promise<Branches>;
    listCommits(repoFullName: string, branch: string, since: string, until?: string): Promise<Commit[]>;
    inspect(repoFullName: string, shas: string[]): Promise<CommitDetail[]>;
    execute(params: ExecuteParams): Promise<ExecuteResult>;
    continueOp(repoFullName: string, pendingShas: string[], opts: { useX: boolean }): Promise<ExecuteResult>;
    abort(repoFullName: string): Promise<AbortResult>;
    getStatus(repoFullName: string): Promise<RepoStatus>;
  };
  history: {
    list(filters?: HistoryFilters): Promise<HistoryEntry[]>;
    export(format: 'json' | 'csv'): Promise<string>;
  };
  preferences: {
    get(): Promise<Preferences>;
    set(prefs: Partial<Preferences>): Promise<void>;
  };
  system: {
    openInEditor(path: string): Promise<void>;
    openInTerminal(path: string): Promise<void>;
    openInFinder(path: string): Promise<void>;
    newWindow(): Promise<void>;
  };
  theme: {
    get(): Promise<{ mode: ThemeMode; shouldUseDark: boolean }>;
    set(mode: ThemeMode): Promise<{ mode: ThemeMode; shouldUseDark: boolean }>;
    onChange(listener: (payload: { mode: ThemeMode; shouldUseDark: boolean }) => void): () => void;
  };
  progress: {
    subscribe(listener: (p: Progress) => void): () => void;
  };
}

declare global {
  interface Window {
    cherrygit: CherryGitAPI;
  }
}
