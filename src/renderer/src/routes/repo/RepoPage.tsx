import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, GitBranch, RefreshCw } from 'lucide-react';
import { api } from '@renderer/lib/api';
import type { Branches } from '@shared/types';
import { Card, CardTitle, CardDescription } from '@renderer/components/ui/Card';
import { Button } from '@renderer/components/ui/Button';
import { Spinner } from '@renderer/components/ui/Spinner';
import { usePreferencesStore } from '@renderer/stores/preferences.store';
import { toastError } from '@renderer/components/feedback/Toast';

export function RepoPage(): JSX.Element {
  const params = useParams<{ name: string }>();
  const navigate = useNavigate();
  const name = params.name ?? '';

  const prefs = usePreferencesStore((s) => s.prefs);
  const loadPrefs = usePreferencesStore((s) => s.load);
  const setPrefs = usePreferencesStore((s) => s.save);

  useEffect(() => {
    if (!prefs) void loadPrefs();
  }, [prefs, loadPrefs]);

  const autoFetch = prefs?.autoFetch ?? true;
  const [sourceBranch, setSourceBranch] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('');

  const branchesQuery = useQuery<Branches>({
    queryKey: ['branches', name, autoFetch],
    queryFn: () => api.git.listBranches(name),
    enabled: Boolean(name),
    retry: false
  });

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

      {sourceBranch && targetBranch ? (
        <Card>
          <CardTitle>Proximos pasos</CardTitle>
          <CardDescription className="mt-1">
            Filtrado por rango de fechas y seleccion de commits (proxima entrega).
          </CardDescription>
        </Card>
      ) : null}
    </div>
  );
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
