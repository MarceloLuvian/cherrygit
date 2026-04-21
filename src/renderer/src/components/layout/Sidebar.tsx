import { NavLink } from 'react-router-dom';
import { FolderGit2, History, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/lib/utils';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
}

const items: NavItem[] = [
  { to: '/repos', label: 'Repositorios', Icon: FolderGit2 },
  { to: '/history', label: 'Historial', Icon: History },
  { to: '/preferences', label: 'Preferencias', Icon: Settings }
];

export function Sidebar(): JSX.Element {
  return (
    <aside
      className="flex w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-muted)] py-3"
      aria-label="Navegacion principal"
    >
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-[var(--color-bg-elevated)] font-medium text-[var(--color-fg)] shadow-sm'
                  : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]'
              )
            }
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
