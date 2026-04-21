export type ThemeMode = 'system' | 'light' | 'dark';

export interface Repo {
  name: string;
  path: string;
  currentBranch?: string | null;
  lastOpenedAt?: string;
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
  repoName: string;
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
  reposRoot: string;
  autoFetch: boolean;
  defaultSinceDays: number;
}

export interface Progress {
  phase: 'fetch' | 'cherry-pick' | 'inspect' | 'checkout' | 'pull' | 'status';
  step?: string;
  ok?: boolean;
  percent?: number;
  message?: string;
  repo?: string;
  sha?: string;
  newSha?: string;
  error?: string;
}

export interface CherryGitAPI {
  repos: {
    list(): Promise<Repo[]>;
    refresh(): Promise<Repo[]>;
    openInFinder(name: string): Promise<void>;
    getStatus(name: string): Promise<RepoStatus>;
  };
  git: {
    listBranches(name: string): Promise<Branches>;
    listCommits(name: string, branch: string, since: string, until?: string): Promise<Commit[]>;
    inspect(name: string, shas: string[]): Promise<CommitDetail[]>;
    execute(params: ExecuteParams): Promise<ExecuteResult>;
    continueOp(name: string, pendingShas: string[], opts: { useX: boolean }): Promise<ExecuteResult>;
    abort(name: string): Promise<AbortResult>;
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
    pickDirectory(): Promise<string | null>;
    openLogsDir(): Promise<string>;
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
