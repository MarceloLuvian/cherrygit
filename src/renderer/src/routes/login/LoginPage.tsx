import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, KeyRound } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Card } from '@renderer/components/ui/Card';
import { ThemeToggle } from '@renderer/components/layout/ThemeToggle';
import { useSessionStore } from '@renderer/stores/session.store';
import { openExternal } from '@renderer/lib/utils';

const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=repo&description=CherryGit';

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const login = useSessionStore((s) => s.login);
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    const trimmed = token.trim();
    if (!trimmed) {
      setError('Ingresa tu Personal Access Token.');
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmed);
      navigate('/repos', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/scope/i.test(msg)) {
        setError('El token no tiene el scope necesario "repo". Genera uno nuevo con ese scope.');
      } else if (/401|unauthorized|invalid|bad credentials/i.test(msg)) {
        setError('Token invalido. Verifica que sea correcto y no haya expirado.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full items-center justify-center bg-[var(--color-bg)] p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <div className="mb-5 flex flex-col items-center gap-2">
          {/* Logo: cereza */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M28 6c0 6 2 8 8 8"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M16 22c0-6 4-10 12-11"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M32 25c-2-4-1-10 4-14"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="16" cy="33" r="9" fill="#e63946" />
            <circle cx="32" cy="34" r="8" fill="#e63946" />
            <circle cx="14" cy="30" r="2" fill="#ff7b86" opacity="0.7" />
            <circle cx="30" cy="31" r="1.8" fill="#ff7b86" opacity="0.7" />
          </svg>

          <h1 className="text-xl font-semibold tracking-tight">CherryGit</h1>
          <p className="text-center text-sm text-[var(--color-fg-muted)]">
            Cherry-pick masivo entre ramas de GitHub desde una interfaz nativa macOS.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="token" className="flex items-center gap-1.5 text-sm font-medium">
              <KeyRound size={14} aria-hidden="true" />
              Personal Access Token
            </label>
            <Input
              id="token"
              type="password"
              placeholder="ghp_..."
              autoComplete="off"
              autoFocus
              value={token}
              onChange={(e) => setToken(e.target.value)}
              invalid={Boolean(error)}
              aria-describedby="token-help"
              disabled={submitting}
            />
            <p id="token-help" className="text-xs text-[var(--color-fg-muted)]">
              Necesitas un token clasico con scope <code className="font-mono text-[var(--color-fg)]">repo</code>.
              No se guarda en disco; se almacena en el Llavero (Keychain) de macOS.
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-md border border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-2.5 text-sm text-[var(--color-danger)]"
            >
              {error}
            </div>
          ) : null}

          <Button type="submit" loading={submitting} disabled={submitting}>
            {submitting ? 'Validando...' : 'Iniciar sesion'}
          </Button>

          <button
            type="button"
            onClick={() => openExternal(TOKEN_URL)}
            className="inline-flex items-center justify-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
          >
            Crear token en GitHub
            <ExternalLink size={13} aria-hidden="true" />
          </button>
        </form>
      </Card>
    </div>
  );
}
