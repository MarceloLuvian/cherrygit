import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import type { ThemeMode } from '@shared/types';
import { useThemeStore } from '@renderer/stores/theme.store';
import { cn } from '@renderer/lib/utils';

interface ThemeToggleProps {
  variant?: 'icon' | 'inline';
}

function IconForMode({ mode, shouldUseDark }: { mode: ThemeMode; shouldUseDark: boolean }): JSX.Element {
  if (mode === 'system') return <Monitor size={16} aria-hidden="true" />;
  if (mode === 'dark') return <Moon size={16} aria-hidden="true" />;
  if (mode === 'light') return <Sun size={16} aria-hidden="true" />;
  return shouldUseDark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />;
}

const LABELS: Record<ThemeMode, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Oscuro'
};

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps): JSX.Element {
  const mode = useThemeStore((s) => s.mode);
  const shouldUseDark = useThemeStore((s) => s.shouldUseDark);
  const setMode = useThemeStore((s) => s.set);

  const options: ThemeMode[] = ['system', 'light', 'dark'];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Tema actual: ${LABELS[mode]}. Cambiar tema.`}
          className={cn(
            'no-drag inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2.5 text-sm text-[var(--color-fg)]',
            'hover:bg-[var(--color-bg-muted)]',
            variant === 'icon' ? 'h-8 w-8 justify-center px-0' : 'h-9'
          )}
        >
          <IconForMode mode={mode} shouldUseDark={shouldUseDark} />
          {variant === 'inline' ? <span>{LABELS[mode]}</span> : null}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="min-w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1 text-sm text-[var(--color-fg)] shadow-lg"
        >
          {options.map((opt) => (
            <DropdownMenu.Item
              key={opt}
              onSelect={() => void setMode(opt)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1.5 outline-none',
                'data-[highlighted]:bg-[var(--color-bg-muted)]'
              )}
            >
              <span className="inline-flex items-center gap-2">
                {opt === 'system' ? (
                  <Monitor size={14} aria-hidden="true" />
                ) : opt === 'light' ? (
                  <Sun size={14} aria-hidden="true" />
                ) : (
                  <Moon size={14} aria-hidden="true" />
                )}
                {LABELS[opt]}
              </span>
              {opt === mode ? <Check size={14} aria-hidden="true" /> : null}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
