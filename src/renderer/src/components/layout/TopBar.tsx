import { LogOut, PlusSquare } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@renderer/components/ui/Button';
import { useSessionStore } from '@renderer/stores/session.store';
import { api } from '@renderer/lib/api';
import { toastError } from '@renderer/components/feedback/Toast';
import { useNavigate } from 'react-router-dom';

export function TopBar(): JSX.Element {
  const session = useSessionStore((s) => s.session);
  const logout = useSessionStore((s) => s.logout);
  const navigate = useNavigate();

  const handleNewWindow = async (): Promise<void> => {
    try {
      await api.system.newWindow();
    } catch (err) {
      toastError(err);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <header
      className="drag-region flex h-12 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4"
      role="banner"
    >
      <div className="no-drag flex items-center gap-2">
        <span
          aria-hidden="true"
          className="text-lg"
          title="CherryGit"
        >
          {/* Cereza simple */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 3c0 3 1 4 4 4" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="16" r="4.5" fill="var(--color-primary)" />
            <circle cx="16" cy="17" r="4" fill="var(--color-primary)" />
            <path d="M8 11.5c0-3 2-5 6-5.5" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M16 13c-1-2-0.5-5 2-7" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        </span>
        <span className="text-sm font-semibold tracking-tight">CherryGit</span>
      </div>

      <div className="no-drag flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewWindow}
          aria-label="Nueva ventana (Cmd+N)"
          title="Nueva ventana (Cmd+N)"
        >
          <PlusSquare size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Nueva ventana</span>
        </Button>

        <ThemeToggle />

        {session ? (
          <div className="flex items-center gap-2 pl-2">
            {session.user.avatarUrl ? (
              <img
                src={session.user.avatarUrl}
                alt={`Avatar de ${session.user.login}`}
                className="h-7 w-7 rounded-full border border-[var(--color-border)]"
              />
            ) : null}
            <span
              className="max-w-[140px] truncate text-xs text-[var(--color-fg-muted)]"
              title={session.user.login}
            >
              {session.user.name || session.user.login}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              aria-label="Cerrar sesion"
              title="Cerrar sesion"
            >
              <LogOut size={16} aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
