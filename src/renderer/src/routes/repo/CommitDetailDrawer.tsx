import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Copy, FileText } from 'lucide-react';
import { api } from '@renderer/lib/api';
import type { CommitDetail, CommitFile } from '@shared/types';
import { Button } from '@renderer/components/ui/Button';
import { Spinner } from '@renderer/components/ui/Spinner';
import { toast, toastError } from '@renderer/components/feedback/Toast';

interface CommitDetailDrawerProps {
  repoName: string;
  sha: string | null;
  onClose: () => void;
}

export function CommitDetailDrawer({
  repoName,
  sha,
  onClose
}: CommitDetailDrawerProps): JSX.Element | null {
  const open = Boolean(sha);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const detailQuery = useQuery<CommitDetail | null>({
    queryKey: ['commit-detail', repoName, sha],
    queryFn: async () => {
      if (!sha) return null;
      const [d] = await api.git.inspect(repoName, [sha]);
      return d ?? null;
    },
    enabled: open
  });

  useEffect(() => {
    if (detailQuery.error) toastError(detailQuery.error);
  }, [detailQuery.error]);

  if (!open) return null;

  const detail = detailQuery.data;

  const copySha = async (): Promise<void> => {
    if (!sha) return;
    try {
      await navigator.clipboard.writeText(sha);
      toast('SHA copiado');
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Detalle del commit"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar detalle"
        className="absolute inset-0 h-full w-full cursor-default bg-black/30"
      />

      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] p-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--color-fg)]">Detalle del commit</h2>
            {sha ? (
              <p className="mt-0.5 break-all font-mono text-xs text-[var(--color-fg-muted)]">{sha}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={copySha} aria-label="Copiar SHA">
              <Copy size={14} aria-hidden="true" />
              Copiar SHA
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
              <X size={14} aria-hidden="true" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {detailQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-fg-muted)]">
              <Spinner size={14} />
              Cargando detalle...
            </div>
          ) : detail ? (
            <DetailBody detail={detail} />
          ) : (
            <p className="text-sm text-[var(--color-danger)]">No se pudo cargar el detalle.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function DetailBody({ detail }: { detail: CommitDetail }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">Autor</h3>
        <p className="text-sm text-[var(--color-fg)]">
          {detail.author}
          {detail.authorEmail ? (
            <span className="text-[var(--color-fg-muted)]"> &lt;{detail.authorEmail}&gt;</span>
          ) : null}
        </p>
        <p className="text-xs text-[var(--color-fg-muted)]">{detail.date}</p>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">Mensaje</h3>
        <p className="text-sm font-medium text-[var(--color-fg)]">{detail.subject}</p>
        {detail.body ? (
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-[var(--color-bg-muted)] p-3 text-xs text-[var(--color-fg)]">
            {detail.body}
          </pre>
        ) : null}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
            Archivos modificados
          </h3>
          <span className="text-xs text-[var(--color-fg-muted)]">{detail.files.length}</span>
        </div>
        {detail.files.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">Sin archivos.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {detail.files.map((f) => (
              <FileRow key={f.path} file={f} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function statusBadge(status: CommitFile['status']): { label: string; cls: string } {
  switch (status) {
    case 'A':
      return { label: 'A', cls: 'border-[var(--color-success)] text-[var(--color-success)]' };
    case 'D':
      return { label: 'D', cls: 'border-[var(--color-danger)] text-[var(--color-danger)]' };
    case 'R':
      return { label: 'R', cls: 'border-[var(--color-warning)] text-[var(--color-warning)]' };
    case 'C':
      return { label: 'C', cls: 'border-[var(--color-warning)] text-[var(--color-warning)]' };
    case 'U':
      return { label: 'U', cls: 'border-[var(--color-danger)] text-[var(--color-danger)]' };
    case 'M':
    default:
      return { label: 'M', cls: 'border-[var(--color-primary)] text-[var(--color-primary)]' };
  }
}

function FileRow({ file }: { file: CommitFile }): JSX.Element {
  const badge = statusBadge(file.status);
  return (
    <li className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-2 py-1.5 text-xs">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded border font-mono text-[10px] font-semibold ${badge.cls}`}
        title={`Estado: ${file.status}`}
      >
        {badge.label}
      </span>
      <FileText size={12} className="shrink-0 text-[var(--color-fg-muted)]" aria-hidden="true" />
      <span className="flex-1 truncate font-mono" title={file.path}>
        {file.path}
      </span>
      {file.additions > 0 || file.deletions > 0 ? (
        <span className="shrink-0 font-mono text-[var(--color-fg-muted)]">
          {file.additions > 0 ? (
            <span className="text-[var(--color-success)]">+{file.additions}</span>
          ) : null}
          {file.additions > 0 && file.deletions > 0 ? ' ' : ''}
          {file.deletions > 0 ? (
            <span className="text-[var(--color-danger)]">-{file.deletions}</span>
          ) : null}
        </span>
      ) : null}
    </li>
  );
}
