import React, { Suspense, lazy } from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import LoadingScreen from './components/LoadingScreen';

const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TeamLogin = lazy(() => import('./pages/TeamLogin'));
const TeamRegister = lazy(() => import('./pages/TeamRegister'));
const TeamDashboard = lazy(() => import('./pages/TeamDashboard'));
const WatchPage = lazy(() => import('./pages/WatchPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));

function RootLayout() {
  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'oklch(0.16 0.03 255)',
            border: '1px solid oklch(0.28 0.04 255)',
            color: 'oklch(0.95 0.01 240)',
          },
        }}
      />
    </>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => { throw redirect({ to: '/watch' }); },
  component: () => null,
});

const watchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/watch',
  component: () => <WatchPage />,
});

const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/results',
  component: () => <ResultsPage />,
});

const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/login',
  component: () => <AdminLogin />,
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/dashboard',
  component: () => <AdminDashboard />,
});

const teamLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/team/login',
  component: () => <TeamLogin />,
});

const teamRegisterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/team/register',
  component: () => <TeamRegister />,
});

const teamDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/team/dashboard',
  component: () => <TeamDashboard />,
});

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  beforeLoad: () => { throw redirect({ to: '/watch' }); },
  component: () => null,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  watchRoute,
  resultsRoute,
  adminLoginRoute,
  adminDashboardRoute,
  teamLoginRoute,
  teamRegisterRoute,
  teamDashboardRoute,
  catchAllRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
