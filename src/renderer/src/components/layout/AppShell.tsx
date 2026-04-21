import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

/**
 * Layout principal: top bar + sidebar + contenido.
 */
export function AppShell(): JSX.Element {
  return (
    <div className="flex h-full flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-h-0 flex-1 overflow-auto" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
