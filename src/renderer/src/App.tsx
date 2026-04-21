import { useEffect } from 'react';
import {
  createHashRouter,
  RouterProvider,
  Navigate,
  Outlet
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from './lib/query-client';
import { useSessionStore } from './stores/session.store';
import { useThemeStore } from './stores/theme.store';

import { AppShell } from './components/layout/AppShell';
import { Spinner } from './components/ui/Spinner';

import { LoginPage } from './routes/login/LoginPage';
import { RepoListPage } from './routes/repos/RepoListPage';
import { RepoPage } from './routes/repo/RepoPage';
import { HistoryPage } from './routes/history/HistoryPage';
import { PreferencesPage } from './routes/preferences/PreferencesPage';

/**
 * Gate de autenticacion para rutas protegidas.
 * Mientras carga la sesion muestra un spinner; si no hay sesion redirige a /login.
 */
function RequireAuth(): JSX.Element {
  const session = useSessionStore((s) => s.session);
  const initialized = useSessionStore((s) => s.initialized);

  if (!initialized) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={20} />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * Redirige a /repos si ya hay sesion, util para la ruta /login.
 */
function RedirectIfAuth({ children }: { children: JSX.Element }): JSX.Element {
  const session = useSessionStore((s) => s.session);
  const initialized = useSessionStore((s) => s.initialized);

  if (!initialized) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={20} />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/repos" replace />;
  }

  return children;
}

const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/repos" replace />
      },
      {
        path: 'login',
        element: (
          <RedirectIfAuth>
            <LoginPage />
          </RedirectIfAuth>
        )
      },
      {
        element: <RequireAuth />,
        children: [
          { path: 'repos', element: <RepoListPage /> },
          { path: 'repo/:owner/:name', element: <RepoPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'preferences', element: <PreferencesPage /> }
        ]
      },
      {
        path: '*',
        element: <Navigate to="/repos" replace />
      }
    ]
  }
]);

export default function App(): JSX.Element {
  const loadSession = useSessionStore((s) => s.loadSession);
  const loadTheme = useThemeStore((s) => s.load);

  useEffect(() => {
    void loadSession();
    void loadTheme();
  }, [loadSession, loadTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
