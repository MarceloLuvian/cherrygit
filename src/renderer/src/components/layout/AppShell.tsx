import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

/**
 * Layout principal. En la ruta `/login` no se renderiza el shell,
 * solo el contenido de la pagina.
 */
export function AppShell(): JSX.Element {
  const location = useLocation();
  const isLogin = location.pathname === '/login' || location.pathname === '/';

  if (isLogin) {
    return <Outlet />;
  }

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
