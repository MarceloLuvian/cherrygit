import { useEffect } from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from './lib/query-client';
import { useThemeStore } from './stores/theme.store';

import { AppShell } from './components/layout/AppShell';

import { RepoListPage } from './routes/repos/RepoListPage';
import { RepoPage } from './routes/repo/RepoPage';
import { HistoryPage } from './routes/history/HistoryPage';
import { PreferencesPage } from './routes/preferences/PreferencesPage';

const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/repos" replace /> },
      { path: 'repos', element: <RepoListPage /> },
      { path: 'repo/:name', element: <RepoPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'preferences', element: <PreferencesPage /> },
      { path: '*', element: <Navigate to="/repos" replace /> }
    ]
  }
]);

export default function App(): JSX.Element {
  const loadTheme = useThemeStore((s) => s.load);

  useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
