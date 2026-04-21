import { useEffect } from 'react';
import { X, Play } from 'lucide-react';
import type { Commit } from '@shared/types';
import { Button } from '@renderer/components/ui/Button';

interface ConfirmExecuteModalProps {
  open: boolean;
  repoName: string;
  targetBranch: string;
  selectedCommits: Commit[];
  useX: boolean;
  onToggleUseX: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmExecuteModal({
  open,
  repoName,
  targetBranch,
  selectedCommits,
  useX,
  onToggleUseX,
  onConfirm,
  onCancel
}: ConfirmExecuteModalProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar cherry-pick"
    >
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cerrar"
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
      />

      <div className="relative flex max-h-[80vh] w-full max-w-xl flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] p-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-fg)]">
              Aplicar {selectedCommits.length} commit(s)
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
              Destino: <span className="font-mono">{targetBranch}</span> en{' '}
              <span className="font-mono">{repoName}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Cerrar">
            <X size={14} aria-hidden="true" />
          </Button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          <p className="mb-2 text-xs text-[var(--color-fg-muted)]">
            Se aplicaran en orden cronologico ascendente:
          </p>
          <ul className="flex flex-col gap-1">
            {selectedCommits.map((c, i) => (
              <li
                key={c.fullSha}
                className="flex items-start gap-2 rounded border border-[var(--color-border)] px-2 py-1.5 text-xs"
              >
                <span className="shrink-0 font-mono text-[var(--color-fg-muted)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="shrink-0 font-mono font-semibold text-[var(--color-fg)]"
                  title={c.fullSha}
                >
                  {c.shortSha}
                </span>
                <span className="min-w-0 flex-1 break-words text-[var(--color-fg)]">
                  {c.subject}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] p-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--color-fg)]">
            <input
              type="checkbox"
              checked={useX}
              onChange={(e) => onToggleUseX(e.target.checked)}
              className="rounded border-[var(--color-border)]"
            />
            Usar <code className="rounded bg-[var(--color-bg-muted)] px-1 font-mono">-x</code>{' '}
            (agrega referencia al commit original)
          </label>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
            <Button size="sm" onClick={onConfirm}>
              <Play size={14} aria-hidden="true" />
              Aplicar
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
