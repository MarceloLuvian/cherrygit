import { History } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@renderer/components/ui/Card';

/**
 * Placeholder del historial.
 * TODO (Sprint 3): tabla con filtros, exportar JSON/CSV.
 */
export function HistoryPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Historial</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Registro de operaciones de cherry-pick realizadas.
        </p>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <History size={20} className="mt-0.5 text-[var(--color-fg-muted)]" aria-hidden="true" />
          <div>
            <CardTitle>Proximamente</CardTitle>
            <CardDescription className="mt-1">
              Aqui veras todas las ejecuciones pasadas con sus commits originales y nuevos,
              estado final y duracion. Podras filtrar y exportar a JSON/CSV.
            </CardDescription>
          </div>
        </div>
      </Card>
    </div>
  );
}
