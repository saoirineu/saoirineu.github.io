import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { AuthGate } from './components/AuthGate';
import { NavBar } from './components/NavBar';
import { RoleGate } from './components/RoleGate';
import { useAuth } from './providers/useAuth';
import { useDevMode } from './providers/useDevMode';

const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const BeveragePage = lazy(() => import('./pages/BeveragePage'));
const ChurchesPage = lazy(() => import('./pages/ChurchesPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EncontroEuropeuAdminPage = lazy(() => import('./pages/EncontroEuropeuAdminPage'));
const EncontroEuropeuPage = lazy(() => import('./pages/EncontroEuropeuPage'));
const HymnsPage = lazy(() => import('./pages/HymnsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PeoplePage = lazy(() => import('./pages/PeoplePage'));
const PerfilPage = lazy(() => import('./pages/PerfilPage'));
const TrabalhosPage = lazy(() => import('./pages/TrabalhosPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">
      Carregando pagina...
    </div>
  );
}

function Shell() {
  return (
    <ShellFrame>
      <Outlet />
    </ShellFrame>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}

function EncontroEuropeuRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (user) {
    return (
      <ShellFrame>
        <EncontroEuropeuPage showPublicHero={false} />
      </ShellFrame>
    );
  }

  return <EncontroEuropeuPage showPublicHero />;
}

function DevOnlyRoute() {
  const { devModeEnabled } = useDevMode();

  if (!devModeEnabled) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/encontro-europeu" element={<EncontroEuropeuRoute />} />
        <Route element={<AuthGate />}>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route element={<DevOnlyRoute />}>
              <Route path="/igrejas" element={<ChurchesPage />} />
              <Route path="/perfil" element={<PerfilPage />} />
              <Route path="/pessoas" element={<PeoplePage />} />
              <Route path="/hinarios" element={<HymnsPage />} />
              <Route path="/bebida" element={<BeveragePage />} />
              <Route path="/trabalhos" element={<TrabalhosPage />} />
            </Route>
            <Route element={<RoleGate requiredRole="admin" />}>
              <Route path="/admin/inscricoes-encontro" element={<EncontroEuropeuAdminPage />} />
            </Route>
            <Route element={<RoleGate requiredRole="superadmin" />}>
              <Route element={<DevOnlyRoute />}>
                <Route path="/admin/usuarios" element={<AdminUsersPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
