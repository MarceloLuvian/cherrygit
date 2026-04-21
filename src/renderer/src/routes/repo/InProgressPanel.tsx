import { useState } from 'react';
import {
  AlertOctagon,
  FolderOpen,
  GitBranch,
  Pencil,
  Play,
  Terminal,
  XCircle
} from 'lucide-react';
import { api } from '@renderer/lib/api';
import type { RepoStatus } from '@shared/types';
import { Card, CardTitle, CardDescription } from '@renderer/components/ui/Card';
import { Button } from '@renderer/components/ui/Button';
import { toastError } from '@renderer/components/feedback/Toast';

interface InProgressPanelProps {
  repoName: string;
  repoPath: string | null;
  status: RepoStatus;
  useX: boolean;
  onResolved: () => void;
}

export function InProgressPanel({
  repoName,
  repoPath,
  status,
  useX,
  onResolved
}: InProgressPanelProps): JSX.Element {
  const [busy, setBusy] = useState<'continue' | 'abort' | null>(null);
  const [confirm, setConfirm] = useState<'continue' | 'abort' | null>(null);

  const hasUnresolved = status.unresolvedConflicts.length > 0;

  const handleOpenTerminal = async (): Promise<void> => {
    if (!repoPath) return;
    try {
      await api.system.openInTerminal(repoPath);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenEditor = async (): Promise<void> => {
    if (!repoPath) return;
    try {
      await api.system.openInEditor(repoPath);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenFinder = async (): Promise<void> => {
    try {
      await api.repos.openInFinder(repoName);
    } catch (err) {
      toastError(err);
    }
  };

  const handleContinue = async (): Promise<void> => {
    setConfirm(null);
    setBusy('continue');
    try {
      const res = await api.git.continueOp(repoName, [], { useX });
      if (!res.success && res.conflict) {
        toastError(new Error(res.error ?? 'Aun hay conflictos por resolver.'));
      } else if (!res.success) {
        toastError(new Error(res.error ?? 'No se pudo continuar.'));
      }
      onResolved();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(null);
    }
  };

  const handleAbort = async (): Promise<void> => {
    setConfirm(null);
    setBusy('abort');
    try {
      const r = await api.git.abort(repoName);
      if (!r.success) {
        toastError(new Error(r.error ?? 'No se pudo abortar.'));
        return;
      }
      onResolved();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-[var(--color-warning)]">
      <div className="flex items-start gap-3">
        <AlertOctagon
          size={20}
          className="mt-0.5 shrink-0 text-[var(--color-warning)]"
          aria-hidden="true"
        />
        <div className="flex-1">
          <CardTitle>Cherry-pick en progreso</CardTitle>
          <CardDescription className="mt-1">
            El repo tiene un <span className="font-mono">CHERRY_PICK_HEAD</span> activo. Debes
            continuarlo o abortarlo antes de iniciar uno nuevo.
          </CardDescription>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-fg-muted)]">
            {status.currentBranch ? (
              <span className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-0.5">
                <GitBranch size={10} aria-hidden="true" />
                <span className="font-mono">{status.currentBranch}</span>
              </span>
            ) : null}
            <span
              className={`rounded border px-2 py-0.5 ${
                hasUnresolved
                  ? 'border-[var(--color-danger)] text-[var(--color-danger)]'
                  : 'border-[var(--color-success)] text-[var(--color-success)]'
              }`}
            >
              {hasUnresolved
                ? `${status.unresolvedConflicts.length} archivo(s) sin resolver`
                : 'Sin conflictos pendientes'}
            </span>
          </div>

          {hasUnresolved ? (
            <section className="mt-3">
              <h3 className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
                Archivos en conflicto
              </h3>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-[var(--color-bg-muted)] p-2 font-mono text-xs text-[var(--color-fg)]">
                {status.unresolvedConflicts.join('\n')}
              </pre>
            </section>
          ) : (
            <p className="mt-3 text-xs text-[var(--color-fg-muted)]">
              Los archivos ya estan resueltos y stageados. Presiona <b>Continuar</b> para ejecutar
              <span className="mx-1 font-mono">git cherry-pick --continue</span>.
            </p>
          )}

          {repoPath ? (
            <p
              className="mt-3 break-all rounded bg-[var(--color-bg-muted)] px-2 py-1 font-mono text-xs text-[var(--color-fg-muted)]"
              title={repoPath}
            >
              {repoPath}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenTerminal}
              disabled={!repoPath || busy !== null}
            >
              <Terminal size={14} aria-hidden="true" />
              Abrir en terminal
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenEditor}
              disabled={!repoPath || busy !== null}
            >
              <Pencil size={14} aria-hidden="true" />
              Abrir en editor
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenFinder}
              disabled={busy !== null}
            >
              <FolderOpen size={14} aria-hidden="true" />
              Finder
            </Button>

            <div className="ml-auto flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirm('abort')}
                disabled={busy !== null}
                loading={busy === 'abort'}
              >
                <XCircle size={14} aria-hidden="true" />
                Abortar
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirm('continue')}
                disabled={busy !== null || hasUnresolved}
                loading={busy === 'continue'}
                title={
                  hasUnresolved
                    ? 'Resuelve y stagea los archivos antes de continuar'
                    : undefined
                }
              >
                <Play size={14} aria-hidden="true" />
                Continuar
              </Button>
            </div>
          </div>

          {confirm === 'continue' ? (
            <ConfirmBlock
              title="Continuar cherry-pick"
              message="Se ejecutara git cherry-pick --continue. Si hay un conflicto sin stagear la operacion fallara."
              confirmLabel="Continuar"
              onConfirm={handleContinue}
              onCancel={() => setConfirm(null)}
            />
          ) : null}

          {confirm === 'abort' ? (
            <ConfirmBlock
              title="Abortar cherry-pick"
              message="Se ejecutara git cherry-pick --abort y el repo volvera al estado previo. Los cambios locales sin commitear se perderan."
              confirmLabel="Abortar"
              danger
              onConfirm={handleAbort}
              onCancel={() => setConfirm(null)}
            />
          ) : null}
        </div>
      </div>
    </Card>
  );
}

interface ConfirmBlockProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

function ConfirmBlock({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger
}: ConfirmBlockProps): JSX.Element {
  return (
    <div
      className={`mt-4 rounded-md border p-3 ${
        danger ? 'border-[var(--color-danger)]' : 'border-[var(--color-primary)]'
      }`}
      role="alertdialog"
    >
      <p className="text-sm font-semibold text-[var(--color-fg)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{message}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          variant={danger ? 'secondary' : 'primary'}
          onClick={onConfirm}
          className={danger ? 'text-[var(--color-danger)]' : ''}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
