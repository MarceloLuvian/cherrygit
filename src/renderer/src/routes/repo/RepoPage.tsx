import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@renderer/components/ui/Card';
import { Button } from '@renderer/components/ui/Button';

/**
 * Placeholder del detalle de repositorio.
 *
 * TODO (siguiente epica):
 *   - BranchSelector (source + target)
 *   - DateRangeFilter
 *   - CommitList con checkboxes
 *   - CommitDetailPanel
 *   - ExecuteButton + ConfirmModal
 *   - ExecuteProgress + ConflictPanel
 *   - ResultSummary
 */
export function RepoPage(): JSX.Element {
  const params = useParams<{ name: string }>();
  const navigate = useNavigate();
  const name = params.name ?? '';

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
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <Construction size={20} className="mt-0.5 text-[var(--color-warning)]" aria-hidden="true" />
          <div>
            <CardTitle>Pantalla en construccion</CardTitle>
            <CardDescription className="mt-1">
              El flujo de cherry-pick (seleccion de ramas, filtrado por fecha, ejecucion y
              resolucion de conflictos) se implementara en la siguiente epica.
            </CardDescription>
          </div>
        </div>
      </Card>
    </div>
  );
}
