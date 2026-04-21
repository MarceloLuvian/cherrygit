import { useState } from 'react';
import {
  AlertOctagon,
  Check,
  CircleAlert,
  FolderOpen,
  Pencil,
  Play,
  Terminal,
  XCircle
} from 'lucide-react';
import { api } from '@renderer/lib/api';
import type { CommitApplyResult, ExecuteResult } from '@shared/types';
import { Card, CardTitle, CardDescription } from '@renderer/components/ui/Card';
import { Button } from '@renderer/components/ui/Button';
import { toastError } from '@renderer/components/feedback/Toast';

interface ConflictPanelProps {
  repoName: string;
  repoPath: string | null;
  result: ExecuteResult;
  useX: boolean;
  onResolved: (next: ExecuteResult) => void;
}

export function ConflictPanel({
  repoName,
  repoPath,
  result,
  useX,
  onResolved
}: ConflictPanelProps): JSX.Element {
  const [busy, setBusy] = useState<'continue' | 'abort' | null>(null);
  const [confirm, setConfirm] = useState<'continue' | 'abort' | null>(null);

  const conflictAt = result.conflictAt ?? '';
  const pending = result.pendingShas ?? [];
  const applied = (result.results ?? []).filter((r) => r.ok);

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
      const next = await api.git.continueOp(repoName, pending, { useX });
      onResolved(next);
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
      onResolved({
        success: false,
        steps: result.steps,
        results: result.results,
        repo: repoName,
        sourceBranch: result.sourceBranch,
        targetBranch: result.targetBranch,
        note: 'Cherry-pick abortado. El repo volvio al estado previo.'
      });
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
          <CardTitle>Conflicto en cherry-pick</CardTitle>
          <CardDescription className="mt-1">
            {result.error ??
              `Conflicto al aplicar ${conflictAt}. Resuelve manualmente en el repo ${repoName} y continua.`}
          </CardDescription>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatBlock
              icon={<Check size={14} className="text-[var(--color-success)]" />}
              label="Aplicados"
              value={String(applied.length)}
            />
            <StatBlock
              icon={<CircleAlert size={14} className="text-[var(--color-danger)]" />}
              label="En conflicto"
              value={conflictAt ? conflictAt.slice(0, 7) : '-'}
              mono
            />
            <StatBlock
              icon={<Play size={14} className="text-[var(--color-fg-muted)]" />}
              label="Pendientes"
              value={String(pending.length)}
            />
          </div>

          {applied.length > 0 ? (
            <section className="mt-4">
              <h3 className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
                Aplicados antes del conflicto
              </h3>
              <ul className="mt-1 flex flex-col gap-1">
                {applied.map((r: CommitApplyResult) => (
                  <li
                    key={r.sha}
                    className="flex items-center gap-2 rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                  >
                    <span className="font-mono text-[var(--color-fg-muted)]">{r.sha.slice(0, 7)}</span>
                    <span className="text-[var(--color-fg-muted)]">-&gt;</span>
                    <span className="font-mono text-[var(--color-success)]">
                      {r.newSha?.slice(0, 7) ?? '?'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {pending.length > 0 ? (
            <section className="mt-4">
              <h3 className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
                Pendientes
              </h3>
              <ul className="mt-1 flex flex-wrap gap-1">
                {pending.map((sha) => (
                  <li
                    key={sha}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 font-mono text-xs text-[var(--color-fg-muted)]"
                  >
                    {sha.slice(0, 7)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {repoPath ? (
            <p
              className="mt-4 break-all rounded bg-[var(--color-bg-muted)] px-2 py-1 font-mono text-xs text-[var(--color-fg-muted)]"
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
                disabled={busy !== null}
                loading={busy === 'continue'}
              >
                <Play size={14} aria-hidden="true" />
                Continuar
              </Button>
            </div>
          </div>

          {confirm === 'continue' ? (
            <ConfirmBlock
              title="Continuar cherry-pick"
              message={`Asegurate de haber resuelto los conflictos y ejecutado git add en los archivos resueltos. Se ejecutara git cherry-pick --continue y se aplicaran ${pending.length} commit(s) pendiente(s).`}
              confirmLabel="Continuar"
              onConfirm={handleContinue}
              onCancel={() => setConfirm(null)}
            />
          ) : null}

          {confirm === 'abort' ? (
            <ConfirmBlock
              title="Abortar cherry-pick"
              message="Se ejecutara git cherry-pick --abort y el repo volvera al estado previo al cherry-pick. Se perderan los cambios aplicados hasta ahora."
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

interface StatBlockProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}

function StatBlock({ icon, label, value, mono }: StatBlockProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded border border-[var(--color-border)] px-3 py-2">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">{label}</p>
        <p
          className={`truncate text-sm text-[var(--color-fg)] ${mono ? 'font-mono' : 'font-semibold'}`}
        >
          {value}
        </p>
      </div>
    </div>
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
