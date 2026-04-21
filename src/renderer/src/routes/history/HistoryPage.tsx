import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, History, RefreshCw, Search } from 'lucide-react';
import { api } from '@renderer/lib/api';
import type { HistoryEntry } from '@shared/types';
import { Card, CardTitle, CardDescription } from '@renderer/components/ui/Card';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Spinner } from '@renderer/components/ui/Spinner';
import { toast, toastError } from '@renderer/components/feedback/Toast';

type ResultFilter = '' | HistoryEntry['result'];

export function HistoryPage(): JSX.Element {
  const [repo, setRepo] = useState('');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');

  const historyQuery = useQuery<HistoryEntry[]>({
    queryKey: ['history'],
    queryFn: () => api.history.list({ limit: 500 })
  });

  const entries = historyQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = repo.trim().toLowerCase();
    return entries.filter((e) => {
      if (q && !e.repo.toLowerCase().includes(q)) return false;
      if (resultFilter && e.result !== resultFilter) return false;
      if (since && e.timestamp < since) return false;
      if (until && e.timestamp > `${until}T23:59:59.999Z`) return false;
      return true;
    });
  }, [entries, repo, resultFilter, since, until]);

  const handleExport = async (format: 'json' | 'csv'): Promise<void> => {
    try {
      const content = await api.history.export(format);
      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cherrygit-history-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(`Historial exportado (${format.toUpperCase()})`);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Historial</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            Registro persistente de operaciones de cherry-pick (ultimas 500).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => historyQuery.refetch()}
            loading={historyQuery.isFetching}
            aria-label="Recargar historial"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Recargar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('json')}>
            <Download size={14} aria-hidden="true" />
            JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('csv')}>
            <Download size={14} aria-hidden="true" />
            CSV
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-fg-subtle)]"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Filtrar por repo..."
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              aria-label="Filtrar por repo"
              className="pl-8"
            />
          </div>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as ResultFilter)}
            aria-label="Filtrar por resultado"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-fg)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            <option value="">Todos los resultados</option>
            <option value="success">Exito</option>
            <option value="conflict">Conflicto</option>
            <option value="aborted">Abortado</option>
            <option value="error">Error</option>
          </select>
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            aria-label="Desde"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-fg)]"
          />
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            aria-label="Hasta"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-fg)]"
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Ejecuciones</CardTitle>
          <CardDescription>{filtered.length} de {entries.length}</CardDescription>
        </div>

        {historyQuery.isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-fg-muted)]">
            <Spinner size={14} />
            Cargando historial...
          </div>
        ) : historyQuery.isError ? (
          <p className="mt-4 text-sm text-[var(--color-danger)]">
            Error: {(historyQuery.error as Error).message}
          </p>
        ) : filtered.length === 0 ? (
          <div className="mt-4 flex items-start gap-2 text-sm text-[var(--color-fg-muted)]">
            <History size={16} aria-hidden="true" />
            {entries.length === 0
              ? 'Aun no hay ejecuciones registradas.'
              : 'Ningun registro coincide con los filtros.'}
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-fg-muted)]">
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Repo</th>
                  <th className="py-2 pr-3 font-medium">Origen</th>
                  <th className="py-2 pr-3 font-medium">Destino</th>
                  <th className="py-2 pr-3 font-medium">Commits</th>
                  <th className="py-2 pr-3 font-medium">Resultado</th>
                  <th className="py-2 pr-3 font-medium">Duracion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-muted)]"
                  >
                    <td className="py-2 pr-3 text-[var(--color-fg-muted)]">
                      {formatDate(e.timestamp)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[var(--color-fg)]">{e.repo}</td>
                    <td className="py-2 pr-3 font-mono text-[var(--color-fg-muted)]">
                      {e.sourceBranch || '-'}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[var(--color-fg-muted)]">
                      {e.targetBranch || '-'}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-fg)]">
                      {e.originalShas.length}
                      {e.newShas.length > 0 ? (
                        <span className="text-[var(--color-fg-muted)]">
                          {' '}
                          ({e.newShas.length} aplicados)
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3">
                      <ResultBadge result={e.result} />
                    </td>
                    <td className="py-2 pr-3 font-mono text-[var(--color-fg-muted)]">
                      {formatDuration(e.durationMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return `${date} ${time}`;
}

function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);
  return `${m}m ${rem}s`;
}

function ResultBadge({ result }: { result: HistoryEntry['result'] }): JSX.Element {
  const map: Record<HistoryEntry['result'], { label: string; cls: string }> = {
    success: {
      label: 'Exito',
      cls: 'border-[var(--color-success)] text-[var(--color-success)]'
    },
    conflict: {
      label: 'Conflicto',
      cls: 'border-[var(--color-warning)] text-[var(--color-warning)]'
    },
    aborted: {
      label: 'Abortado',
      cls: 'border-[var(--color-fg-muted)] text-[var(--color-fg-muted)]'
    },
    error: {
      label: 'Error',
      cls: 'border-[var(--color-danger)] text-[var(--color-danger)]'
    }
  };
  const b = map[result] ?? map.error;
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${b.cls}`}
    >
      {b.label}
    </span>
  );
}
