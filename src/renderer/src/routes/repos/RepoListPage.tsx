import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { FolderOpen, Download, RefreshCw, Search, Lock, Globe } from 'lucide-react';
import { api } from '@renderer/lib/api';
import type { Repo } from '@shared/types';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Card } from '@renderer/components/ui/Card';
import { Spinner } from '@renderer/components/ui/Spinner';
import { timeAgo, cn } from '@renderer/lib/utils';
import { toastError } from '@renderer/components/feedback/Toast';

export function RepoListPage(): JSX.Element {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');

  const reposQuery = useQuery<Repo[]>({
    queryKey: ['repos'],
    queryFn: () => api.repos.list()
  });

  const refreshMut = useMutation({
    mutationFn: () => api.repos.list(true),
    onSuccess: (data) => {
      qc.setQueryData(['repos'], data);
    },
    onError: (err) => toastError(err)
  });

  const cloneMut = useMutation({
    mutationFn: ({ owner, name }: { owner: string; name: string }) => api.repos.clone(owner, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repos'] });
    },
    onError: (err) => toastError(err)
  });

  const filtered = useMemo(() => {
    const list = reposQuery.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
    );
  }, [reposQuery.data, query]);

  const handleOpen = (repo: Repo): void => {
    navigate(`/repo/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Repositorios</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            Elige un repositorio para trabajar con cherry-picks.
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
          placeholder="Filtrar por nombre o descripcion..."
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
          <p className="text-sm text-[var(--color-fg-muted)]">
            {query
              ? 'No hay repositorios que coincidan con tu busqueda.'
              : 'No se encontraron repositorios en tu cuenta.'}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((repo) => (
            <li key={repo.id}>
              <RepoCard
                repo={repo}
                onOpen={() => handleOpen(repo)}
                onClone={() => cloneMut.mutate({ owner: repo.owner, name: repo.name })}
                cloning={
                  cloneMut.isPending &&
                  cloneMut.variables?.owner === repo.owner &&
                  cloneMut.variables?.name === repo.name
                }
              />
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
  onClone: () => void;
  cloning: boolean;
}

function RepoCard({ repo, onOpen, onClone, cloning }: RepoCardProps): JSX.Element {
  const cloned = Boolean(repo.localPath);

  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-[var(--color-fg)]">
            {repo.fullName}
          </h3>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
              repo.visibility === 'private'
                ? 'border-[var(--color-warning)] text-[var(--color-warning)]'
                : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
            )}
            title={repo.visibility === 'private' ? 'Privado' : 'Publico'}
          >
            {repo.visibility === 'private' ? (
              <Lock size={10} aria-hidden="true" />
            ) : (
              <Globe size={10} aria-hidden="true" />
            )}
            {repo.visibility === 'private' ? 'privado' : 'publico'}
          </span>
        </div>
        {repo.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-fg-muted)]">
            {repo.description}
          </p>
        ) : null}
        <p className="mt-1.5 text-xs text-[var(--color-fg-subtle)]">
          Rama por defecto: <span className="font-mono">{repo.defaultBranch}</span>
          {' . '}Actualizado {timeAgo(repo.updatedAt)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        {cloned ? (
          <Button size="sm" onClick={onOpen} aria-label={`Abrir ${repo.fullName}`}>
            <FolderOpen size={14} aria-hidden="true" />
            Abrir
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={onClone}
            loading={cloning}
            disabled={cloning}
            aria-label={`Clonar ${repo.fullName}`}
          >
            {cloning ? <Spinner size={12} /> : <Download size={14} aria-hidden="true" />}
            {cloning ? 'Clonando...' : 'Clonar'}
          </Button>
        )}
      </div>
    </Card>
  );
}
