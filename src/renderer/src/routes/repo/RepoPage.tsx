import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CircleAlert,
  Copy,
  GitBranch,
  Play,
  RefreshCw,
  Search
} from 'lucide-react';
import { api } from '@renderer/lib/api';
import type { Branches, Commit, ExecuteResult, Progress, Repo, StepResult } from '@shared/types';
import { Card, CardTitle, CardDescription } from '@renderer/components/ui/Card';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Spinner } from '@renderer/components/ui/Spinner';
import { usePreferencesStore } from '@renderer/stores/preferences.store';
import { toast, toastError } from '@renderer/components/feedback/Toast';
import { CommitDetailDrawer } from './CommitDetailDrawer';
import { ConfirmExecuteModal } from './ConfirmExecuteModal';
import { ConflictPanel } from './ConflictPanel';
import { SuccessPanel } from './SuccessPanel';

type ExecStatus = 'idle' | 'confirming' | 'checking' | 'executing' | 'done';

export function RepoPage(): JSX.Element {
  const params = useParams<{ name: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const name = params.name ?? '';

  const prefs = usePreferencesStore((s) => s.prefs);
  const loadPrefs = usePreferencesStore((s) => s.load);
  const setPrefs = usePreferencesStore((s) => s.save);

  useEffect(() => {
    if (!prefs) void loadPrefs();
  }, [prefs, loadPrefs]);

  const autoFetch = prefs?.autoFetch ?? true;
  const defaultSinceDays = prefs?.defaultSinceDays ?? 30;
  const [sourceBranch, setSourceBranch] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('');
  const [since, setSince] = useState<string>('');
  const [until, setUntil] = useState<string>('');
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('');
  const [detailSha, setDetailSha] = useState<string | null>(null);

  const [useX, setUseX] = useState<boolean>(true);
  useEffect(() => {
    if (prefs) setUseX(prefs.useX);
  }, [prefs]);

  const [execStatus, setExecStatus] = useState<ExecStatus>('idle');
  const [progressEvents, setProgressEvents] = useState<Progress[]>([]);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);
  const [dirtyFiles, setDirtyFiles] = useState<string[]>([]);
  const progressUnsub = useRef<(() => void) | null>(null);

  const selectedCommits = useMemo(
    () => commits.filter((c) => selected.has(c.fullSha)),
    [commits, selected]
  );

  useEffect(() => {
    if (since) return;
    const d = new Date();
    d.setDate(d.getDate() - defaultSinceDays);
    setSince(d.toISOString().slice(0, 10));
  }, [defaultSinceDays, since]);

  const commitsMut = useMutation({
    mutationFn: () => api.git.listCommits(name, sourceBranch, since, until || undefined),
    onSuccess: (data) => {
      setCommits(data);
      setSelected(new Set());
    },
    onError: (err) => toastError(err)
  });

  const filteredCommits = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return commits;
    return commits.filter(
      (c) => c.subject.toLowerCase().includes(q) || c.author.toLowerCase().includes(q)
    );
  }, [commits, filter]);

  const toggleCommit = (sha: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sha)) next.delete(sha);
      else next.add(sha);
      return next;
    });
  };

  const selectAll = (): void => {
    setSelected(new Set(commits.map((c) => c.fullSha)));
  };

  const selectNone = (): void => {
    setSelected(new Set());
  };

  const handleToggleUseX = useCallback(
    (v: boolean) => {
      setUseX(v);
      if (prefs) void setPrefs({ useX: v });
    },
    [prefs, setPrefs]
  );

  const openConfirm = (): void => {
    if (selectedCommits.length === 0 || !targetBranch) return;
    setExecResult(null);
    setDirtyFiles([]);
    setProgressEvents([]);
    setExecStatus('confirming');
  };

  const runExecute = async (): Promise<void> => {
    setExecStatus('checking');
    try {
      const status = await api.repos.getStatus(name);
      if (!status.clean) {
        setDirtyFiles(
          status.unresolvedConflicts.length > 0
            ? status.unresolvedConflicts
            : ['(working tree con cambios sin commitear)']
        );
        setExecStatus('done');
        setExecResult({
          success: false,
          steps: [],
          results: [],
          repo: name,
          sourceBranch,
          targetBranch,
          error: 'Working tree no esta limpio. Haz commit o stash antes de continuar.'
        });
        return;
      }
    } catch (err) {
      toastError(err);
      setExecStatus('idle');
      return;
    }

    progressUnsub.current?.();
    progressUnsub.current = api.progress.subscribe((p) => {
      setProgressEvents((prev) => [...prev, p]);
    });

    setExecStatus('executing');
    try {
      const result = await api.git.execute({
        repoName: name,
        sourceBranch,
        targetBranch,
        shas: selectedCommits.map((c) => c.fullSha),
        useX
      });
      setExecResult(result);
      void qc.invalidateQueries({ queryKey: ['history'] });
    } catch (err) {
      setExecResult({
        success: false,
        steps: [],
        results: [],
        repo: name,
        sourceBranch,
        targetBranch,
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      progressUnsub.current?.();
      progressUnsub.current = null;
      setExecStatus('done');
    }
  };

  useEffect(() => {
    return () => {
      progressUnsub.current?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTyping =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && !e.shiftKey && e.key.toLowerCase() === 'a' && !isTyping && commits.length > 0) {
        e.preventDefault();
        setSelected(new Set(commits.map((c) => c.fullSha)));
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'a' && !isTyping) {
        e.preventDefault();
        setSelected(new Set());
        return;
      }
      if (
        e.key === 'Enter' &&
        mod &&
        execStatus === 'idle' &&
        selected.size > 0 &&
        targetBranch
      ) {
        e.preventDefault();
        setExecResult(null);
        setDirtyFiles([]);
        setProgressEvents([]);
        setExecStatus('confirming');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commits, selected.size, targetBranch, execStatus]);

  const branchesQuery = useQuery<Branches>({
    queryKey: ['branches', name, autoFetch],
    queryFn: () => api.git.listBranches(name),
    enabled: Boolean(name),
    retry: false
  });

  const reposQuery = useQuery<Repo[]>({
    queryKey: ['repos'],
    queryFn: () => api.repos.list(),
    staleTime: 60_000
  });
  const repoPath = useMemo(
    () => reposQuery.data?.find((r) => r.name === name)?.path ?? null,
    [reposQuery.data, name]
  );

  useEffect(() => {
    if (branchesQuery.error) toastError(branchesQuery.error);
  }, [branchesQuery.error]);

  useEffect(() => {
    if (branchesQuery.data?.current && !sourceBranch) {
      setSourceBranch(branchesQuery.data.current);
    }
  }, [branchesQuery.data, sourceBranch]);

  const { local, remote, current } = branchesQuery.data ?? {
    local: [],
    remote: [],
    current: null
  };

  const options = useMemo(() => {
    const locals = local.map((b) => ({ value: b, label: b, group: 'Locales' as const }));
    const remotes = remote.map((b) => ({ value: b, label: `${b} (remoto)`, group: 'Remotos' as const }));
    return { locals, remotes };
  }, [local, remote]);

  const handleToggleFetch = (): void => {
    void setPrefs({ autoFetch: !autoFetch });
  };

  const handleRefresh = (): void => {
    void branchesQuery.refetch();
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/repos')}
          aria-label="Volver a la lista de repositorios"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Volver
        </Button>
        <h1 className="text-xl font-semibold tracking-tight" title={name}>
          {name}
        </h1>
        {current ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-fg-muted)]">
            <GitBranch size={10} aria-hidden="true" />
            <span className="font-mono">{current}</span>
          </span>
        ) : null}
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Ramas</CardTitle>
            <CardDescription className="mt-1">
              Elige la rama origen (de donde salen los commits) y la rama destino (donde se aplican).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)]">
              <input
                type="checkbox"
                checked={autoFetch}
                onChange={handleToggleFetch}
                className="rounded border-[var(--color-border)]"
              />
              Fetch antes de listar
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              loading={branchesQuery.isFetching}
              aria-label="Recargar ramas"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Recargar
            </Button>
          </div>
        </div>

        {branchesQuery.isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-fg-muted)]">
            <Spinner size={14} />
            Cargando ramas{autoFetch ? ' (fetch --all --prune)' : ''}...
          </div>
        ) : branchesQuery.isError ? (
          <p className="mt-4 text-sm text-[var(--color-danger)]">
            Error cargando ramas: {(branchesQuery.error as Error).message}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <BranchSelect
              id="source-branch"
              label="Rama origen"
              value={sourceBranch}
              onChange={setSourceBranch}
              options={options}
              current={current}
            />
            <BranchSelect
              id="target-branch"
              label="Rama destino"
              value={targetBranch}
              onChange={setTargetBranch}
              options={options}
              current={current}
            />
          </div>
        )}
      </Card>

      {sourceBranch ? (
        <Card>
          <CardTitle>Rango de fechas</CardTitle>
          <CardDescription className="mt-1">
            Filtra los commits de <span className="font-mono">{sourceBranch}</span> por fecha. El
            rango es inclusivo hasta el final del dia.
          </CardDescription>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="date-since" className="text-sm font-medium text-[var(--color-fg)]">
                Desde
              </label>
              <input
                id="date-since"
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-fg)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="date-until" className="text-sm font-medium text-[var(--color-fg)]">
                Hasta{' '}
                <span className="text-[var(--color-fg-muted)]">(opcional)</span>
              </label>
              <input
                id="date-until"
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-fg)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => commitsMut.mutate()}
                loading={commitsMut.isPending}
                disabled={!sourceBranch || !since}
                className="w-full"
                aria-label="Cargar commits del rango"
              >
                Cargar commits
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {commitsMut.isSuccess || commitsMut.isPending ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Commits</CardTitle>
              <CardDescription className="mt-1">
                Orden cronologico ascendente (mas viejo arriba). Selecciona los que quieras aplicar.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[var(--color-fg-muted)]">
                {selected.size} / {commits.length} seleccionados
              </span>
              <button
                type="button"
                onClick={selectAll}
                disabled={commits.length === 0}
                className="text-[var(--color-primary)] hover:underline disabled:opacity-50"
              >
                Marcar todos
              </button>
              <button
                type="button"
                onClick={selectNone}
                disabled={selected.size === 0}
                className="text-[var(--color-primary)] hover:underline disabled:opacity-50"
              >
                Desmarcar todos
              </button>
            </div>
          </div>

          <div className="relative mt-3">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-fg-subtle)]"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Filtrar por subject o autor..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filtrar commits"
              className="pl-8"
            />
          </div>

          <div className="mt-3 max-h-[480px] overflow-auto">
            {commitsMut.isPending ? (
              <div className="flex items-center gap-2 py-4 text-sm text-[var(--color-fg-muted)]">
                <Spinner size={14} />
                Cargando commits...
              </div>
            ) : filteredCommits.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--color-fg-muted)]">
                {commits.length === 0
                  ? 'No hay commits en el rango seleccionado.'
                  : 'Ningun commit coincide con el filtro.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {filteredCommits.map((c) => {
                  const checked = selected.has(c.fullSha);
                  return (
                    <li key={c.fullSha}>
                      <div className="flex items-start gap-3 rounded-md border border-[var(--color-border)] px-3 py-2 hover:bg-[var(--color-bg-muted)]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCommit(c.fullSha)}
                          aria-label={`Seleccionar commit ${c.shortSha}`}
                          className="mt-1 cursor-pointer rounded border-[var(--color-border)]"
                        />
                        <button
                          type="button"
                          onClick={() => setDetailSha(c.fullSha)}
                          className="min-w-0 flex-1 cursor-pointer text-left"
                          aria-label={`Ver detalle de ${c.shortSha}: ${c.subject}`}
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-fg-muted)]">
                            <span
                              className="font-mono font-semibold text-[var(--color-fg)]"
                              title={c.fullSha}
                            >
                              {c.shortSha}
                            </span>
                            <span>{c.date.slice(0, 19).replace('T', ' ')}</span>
                            <span className="truncate">{c.author}</span>
                          </div>
                          <div className="mt-0.5 break-words text-sm text-[var(--color-fg)]">
                            {c.subject}
                          </div>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      ) : null}

      {commits.length > 0 && targetBranch ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Ejecutar</CardTitle>
              <CardDescription className="mt-1">
                {selected.size} commit(s) se aplicaran sobre{' '}
                <span className="font-mono">{targetBranch}</span>.
              </CardDescription>
            </div>
            <Button
              onClick={openConfirm}
              disabled={
                selected.size === 0 ||
                !targetBranch ||
                execStatus === 'checking' ||
                execStatus === 'executing'
              }
              loading={execStatus === 'checking' || execStatus === 'executing'}
              aria-label="Ejecutar cherry-pick"
            >
              <Play size={14} aria-hidden="true" />
              {execStatus === 'executing' ? 'Ejecutando...' : 'Ejecutar cherry-pick'}
            </Button>
          </div>
        </Card>
      ) : null}

      {execStatus === 'executing' || (execStatus === 'done' && progressEvents.length > 0) ? (
        <Card>
          <CardTitle>Progreso</CardTitle>
          <ProgressList
            events={progressEvents}
            steps={execResult?.steps ?? []}
            running={execStatus === 'executing'}
            sourceBranch={sourceBranch}
            targetBranch={targetBranch}
            useX={useX}
          />
        </Card>
      ) : null}

      {dirtyFiles.length > 0 ? (
        <Card className="border-[var(--color-warning)]">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={18}
              className="mt-0.5 text-[var(--color-warning)]"
              aria-hidden="true"
            />
            <div className="flex-1">
              <CardTitle>Working tree no esta limpio</CardTitle>
              <CardDescription className="mt-1">
                Haz commit o stash de tus cambios antes de continuar. Archivos afectados:
              </CardDescription>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-[var(--color-bg-muted)] p-2 font-mono text-xs text-[var(--color-fg)]">
                {dirtyFiles.join('\n')}
              </pre>
            </div>
          </div>
        </Card>
      ) : null}

      {execStatus === 'done' && execResult?.success && !execResult.conflict ? (
        <SuccessPanel repoName={name} result={execResult} commits={commits} />
      ) : null}

      {execStatus === 'done' && execResult?.conflict ? (
        <ConflictPanel
          repoName={name}
          repoPath={repoPath}
          result={execResult}
          useX={useX}
          onResolved={(next) => setExecResult(next)}
        />
      ) : null}

      {execStatus === 'done' && execResult && !execResult.success && !execResult.conflict
        ? (
          <Card className="border-[var(--color-danger)]">
            <div className="flex items-start gap-3">
              <CircleAlert
                size={18}
                className="mt-0.5 text-[var(--color-danger)]"
                aria-hidden="true"
              />
              <div>
                <CardTitle>Error</CardTitle>
                <CardDescription className="mt-1 text-[var(--color-danger)]">
                  {execResult.error ?? 'Fallo sin detalle.'}
                </CardDescription>
              </div>
            </div>
          </Card>
        ) : null}

      <ConfirmExecuteModal
        open={execStatus === 'confirming'}
        repoName={name}
        targetBranch={targetBranch}
        selectedCommits={selectedCommits}
        useX={useX}
        onToggleUseX={handleToggleUseX}
        onCancel={() => setExecStatus('idle')}
        onConfirm={() => {
          setExecStatus('idle');
          void runExecute();
        }}
      />

      <CommitDetailDrawer
        repoName={name}
        sha={detailSha}
        onClose={() => setDetailSha(null)}
      />
    </div>
  );
}

interface ProgressListProps {
  events: Progress[];
  steps: StepResult[];
  running: boolean;
  sourceBranch: string;
  targetBranch: string;
  useX: boolean;
}

function ProgressList({
  events,
  steps,
  running,
  sourceBranch,
  targetBranch,
  useX
}: ProgressListProps): JSX.Element {
  const lines = events.length > 0
    ? events.map((e, i) => ({
        key: `${i}-${e.step ?? e.phase}`,
        label: formatProgressLabel(e),
        ok: e.ok !== false,
        error: e.error,
        running: running && i === events.length - 1 && e.ok !== false,
        command: buildEquivalentCommand(e.step ?? e.phase, {
          sourceBranch,
          targetBranch,
          useX,
          sha: e.sha
        })
      }))
    : steps.map((s, i) => ({
        key: `${i}-${s.step}`,
        label: s.step,
        ok: s.ok,
        error: s.stderr,
        running: false,
        command: buildEquivalentCommand(s.step, { sourceBranch, targetBranch, useX })
      }));

  if (lines.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
        Esperando al primer paso...
      </p>
    );
  }

  return (
    <ul className="mt-3 flex flex-col gap-1">
      {lines.map((l) => (
        <li
          key={l.key}
          className="flex items-start gap-2 rounded border border-[var(--color-border)] px-2 py-1.5 text-xs"
        >
          <span className="mt-0.5 shrink-0">
            {l.running ? (
              <Spinner size={12} />
            ) : l.ok ? (
              <Check size={12} className="text-[var(--color-success)]" aria-hidden="true" />
            ) : (
              <CircleAlert size={12} className="text-[var(--color-danger)]" aria-hidden="true" />
            )}
          </span>
          <span className="flex-1 break-words font-mono text-[var(--color-fg)]">{l.label}</span>
          {l.command ? (
            <button
              type="button"
              onClick={() => void copyCommand(l.command!)}
              title={`Copiar: ${l.command}`}
              aria-label="Copiar comando equivalente"
              className="shrink-0 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              <Copy size={12} aria-hidden="true" />
            </button>
          ) : null}
          {l.error ? (
            <span className="shrink-0 text-[var(--color-danger)]" title={l.error}>
              error
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

async function copyCommand(cmd: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(cmd);
    toast('Comando copiado');
  } catch (err) {
    toastError(err);
  }
}

interface CommandCtx {
  sourceBranch: string;
  targetBranch: string;
  useX: boolean;
  sha?: string;
}

function buildEquivalentCommand(step: string, ctx: CommandCtx): string | null {
  const { sourceBranch, targetBranch, useX, sha } = ctx;
  switch (step) {
    case 'working-tree-clean':
    case 'status':
      return 'git status --porcelain';
    case 'fetch':
      return 'git fetch --all --prune';
    case 'checkout':
      return targetBranch ? `git checkout ${targetBranch}` : 'git checkout <destino>';
    case 'pull':
      return 'git pull --ff-only';
    case 'cherry-pick':
      return sha
        ? `git cherry-pick ${useX ? '-x ' : ''}${sha}`
        : `git cherry-pick ${useX ? '-x ' : ''}<sha>`;
    case 'cherry-pick-continue':
      return 'git cherry-pick --continue';
    case 'cherry-pick-pending':
      return `git cherry-pick ${useX ? '-x ' : ''}<pending-shas>`;
    case 'cherry-pick-abort':
      return 'git cherry-pick --abort';
    case 'inspect':
      return sha ? `git show --stat ${sha}` : null;
    default:
      if (sourceBranch && step.includes('commits')) {
        return `git log ${sourceBranch} --since=<fecha>`;
      }
      return null;
  }
}

function formatProgressLabel(e: Progress): string {
  const step = e.step ?? e.phase;
  if (e.sha && e.newSha) return `${step}: ${e.sha.slice(0, 7)} -> ${e.newSha.slice(0, 7)}`;
  if (e.sha) return `${step}: ${e.sha.slice(0, 7)}`;
  return step;
}

interface BranchOption {
  value: string;
  label: string;
  group: 'Locales' | 'Remotos';
}

interface BranchSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { locals: BranchOption[]; remotes: BranchOption[] };
  current: string | null;
}

function BranchSelect({
  id,
  label,
  value,
  onChange,
  options,
  current
}: BranchSelectProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-fg)]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-fg)] focus:border-[var(--color-primary)] focus:outline-none"
      >
        <option value="">Selecciona rama</option>
        {options.locals.length > 0 ? (
          <optgroup label="Locales">
            {options.locals.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
                {o.value === current ? ' (actual)' : ''}
              </option>
            ))}
          </optgroup>
        ) : null}
        {options.remotes.length > 0 ? (
          <optgroup label="Remotos">
            {options.remotes.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </div>
  );
}
