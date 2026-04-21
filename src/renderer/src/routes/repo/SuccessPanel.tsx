import { useMemo, useState } from 'react';
import { CheckCircle2, Copy, Info } from 'lucide-react';
import type { Commit, ExecuteResult } from '@shared/types';
import { Card, CardTitle, CardDescription } from '@renderer/components/ui/Card';
import { Button } from '@renderer/components/ui/Button';
import { toast, toastError } from '@renderer/components/feedback/Toast';

interface SuccessPanelProps {
  repoName: string;
  result: ExecuteResult;
  commits: Commit[];
}

export function SuccessPanel({ repoName, result, commits }: SuccessPanelProps): JSX.Element {
  const subjectBySha = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of commits) m.set(c.fullSha, c.subject);
    return m;
  }, [commits]);
  const [copied, setCopied] = useState(false);
  const applied = useMemo(
    () => (result.results ?? []).filter((r) => r.ok && r.newSha),
    [result.results]
  );

  const markdown = useMemo(
    () => buildMarkdown(repoName, result, applied, subjectBySha),
    [repoName, result, applied, subjectBySha]
  );

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast('Resumen copiado al portapapeles');
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Card className="border-[var(--color-success)]">
      <div className="flex items-start gap-3">
        <CheckCircle2
          size={20}
          className="mt-0.5 shrink-0 text-[var(--color-success)]"
          aria-hidden="true"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Cherry-pick completado</CardTitle>
              <CardDescription className="mt-1">
                Se aplicaron {applied.length} commit(s) sobre{' '}
                <span className="font-mono">{result.targetBranch}</span> en{' '}
                <span className="font-mono">{repoName}</span>.
              </CardDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={copy}>
              <Copy size={14} aria-hidden="true" />
              {copied ? 'Copiado' : 'Copiar resumen'}
            </Button>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-2 text-xs text-[var(--color-fg-muted)]">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Los commits quedaron aplicados en el clon local. No se hizo{' '}
              <code className="rounded bg-[var(--color-bg)] px-1 font-mono">git push</code>{' '}
              automatico: valida antes de publicar.
            </span>
          </div>

          {applied.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-fg-muted)]">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Original</th>
                    <th className="py-2 pr-3 font-medium">Nuevo</th>
                    <th className="py-2 font-medium">Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {applied.map((r, i) => (
                    <tr
                      key={r.sha}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="py-2 pr-3 text-[var(--color-fg-muted)]">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td
                        className="py-2 pr-3 font-mono text-[var(--color-fg)]"
                        title={r.sha}
                      >
                        {r.sha.slice(0, 7)}
                      </td>
                      <td
                        className="py-2 pr-3 font-mono text-[var(--color-success)]"
                        title={r.newSha}
                      >
                        {r.newSha?.slice(0, 7) ?? '-'}
                      </td>
                      <td className="py-2 text-[var(--color-fg)]">
                        {subjectBySha.get(r.sha) ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {result.note ? (
            <p className="mt-3 text-xs text-[var(--color-fg-muted)]">{result.note}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function buildMarkdown(
  repoName: string,
  result: ExecuteResult,
  applied: ReadonlyArray<{ sha: string; newSha?: string }>,
  subjectBySha: Map<string, string>
): string {
  const lines: string[] = [];
  lines.push(`# Cherry-pick en ${repoName}`);
  lines.push('');
  lines.push(`- Rama origen: \`${result.sourceBranch ?? '-'}\``);
  lines.push(`- Rama destino: \`${result.targetBranch ?? '-'}\``);
  lines.push(`- Commits aplicados: ${applied.length}`);
  lines.push('');
  lines.push('| # | Original | Nuevo | Subject |');
  lines.push('|---|----------|-------|---------|');
  applied.forEach((r, i) => {
    const subj = (subjectBySha.get(r.sha) ?? '-').replace(/\|/g, '\\|');
    lines.push(
      `| ${String(i + 1).padStart(2, '0')} | \`${r.sha.slice(0, 7)}\` | \`${
        r.newSha?.slice(0, 7) ?? '-'
      }\` | ${subj} |`
    );
  });
  lines.push('');
  lines.push('> No se ejecuto push automatico.');
  return lines.join('\n');
}
