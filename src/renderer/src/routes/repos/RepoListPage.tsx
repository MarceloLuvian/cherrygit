import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { FolderOpen, RefreshCw, Search, Settings } from 'lucide-react';
import { api } from '@renderer/lib/api';
import type { Repo } from '@shared/types';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Card } from '@renderer/components/ui/Card';
import { usePreferencesStore } from '@renderer/stores/preferences.store';
import { toastError } from '@renderer/components/feedback/Toast';

export function RepoListPage(): JSX.Element {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');

  const prefs = usePreferencesStore((s) => s.prefs);
  const loadPrefs = usePreferencesStore((s) => s.load);

  useEffect(() => {
    if (!prefs) void loadPrefs();
  }, [prefs, loadPrefs]);

  const reposQuery = useQuery<Repo[]>({
    queryKey: ['repos'],
    queryFn: () => api.repos.list()
  });

  const refreshMut = useMutation({
    mutationFn: () => api.repos.refresh(),
    onSuccess: (data) => {
      qc.setQueryData(['repos'], data);
    },
    onError: (err) => toastError(err)
  });

  const filtered = useMemo(() => {
    const list = reposQuery.data ?? [];
    const q = query.trim().toLowerCase();
    const base = q ? list.filter((r) => r.name.toLowerCase().includes(q)) : list;
    return [...base].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [reposQuery.data, query]);

  const handleOpen = (repo: Repo): void => {
    navigate(`/repo/${encodeURIComponent(repo.name)}`);
  };

  const reposRoot = prefs?.reposRoot ?? '';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Repositorios</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            Repos locales detectados en tu carpeta base.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refreshMut.mutate()}
          loading={refreshMut.isPending}
          aria-label="Actualizar lista de repositorios"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Actualizar
        </Button>
      </div>

      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-fg-subtle)]"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Filtrar por nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filtrar repositorios"
          className="pl-8"
        />
      </div>

      {reposQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="mb-2 h-4 w-48 rounded bg-[var(--color-bg-muted)]" />
              <div className="h-3 w-80 rounded bg-[var(--color-bg-muted)]" />
            </Card>
          ))}
        </div>
      ) : reposQuery.isError ? (
        <Card>
          <p className="text-sm text-[var(--color-danger)]">
            Error cargando repositorios: {(reposQuery.error as Error).message}
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-fg-muted)]">
              {query ? (
                'No hay repositorios que coincidan con tu busqueda.'
              ) : (
                <>
                  No se detectaron repos en{' '}
                  <code className="font-mono text-[var(--color-fg)]">{reposRoot || '(sin configurar)'}</code>
                  .
                </>
              )}
            </p>
            {!query ? (
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/preferences')}
                  aria-label="Configurar carpeta en Preferencias"
                >
                  <Settings size={14} aria-hidden="true" />
                  Configurar carpeta en Preferencias
                </Button>
              </div>
            ) : null}
          </div>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((repo) => (
            <li key={repo.name}>
              <RepoCard repo={repo} onOpen={() => handleOpen(repo)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface RepoCardProps {
  repo: Repo;
  onOpen: () => void;
}

function RepoCard({ repo, onOpen }: RepoCardProps): JSX.Element {
  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-[var(--color-fg)]">{repo.name}</h3>
        <p className="mt-1 text-xs text-[var(--color-fg-subtle)]">
          Rama actual:{' '}
          <span className="font-mono">{repo.currentBranch ?? '(detached)'}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--color-fg-subtle)]" title={repo.path}>
          {repo.path}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <Button size="sm" onClick={onOpen} aria-label={`Abrir ${repo.name}`}>
          <FolderOpen size={14} aria-hidden="true" />
          Abrir
        </Button>
      </div>
    </Card>
  );
}
