import { PlusSquare } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@renderer/components/ui/Button';
import { api } from '@renderer/lib/api';
import { toastError } from '@renderer/components/feedback/Toast';

export function TopBar(): JSX.Element {
  const handleNewWindow = async (): Promise<void> => {
    try {
      await api.system.newWindow();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <header
      className="drag-region flex h-12 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] pl-20 pr-4"
      role="banner"
    >
      <div className="no-drag flex items-center gap-2">
        <span aria-hidden="true" className="text-lg" title="CherryGit">
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
      </div>
    </header>
  );
}
