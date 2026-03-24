import { Suspense, lazy } from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';

import { AuthGate } from './components/AuthGate';
import { NavBar } from './components/NavBar';

const BeveragePage = lazy(() => import('./pages/BeveragePage'));
const ChurchesPage = lazy(() => import('./pages/ChurchesPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
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
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGate />}>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="/pessoas" element={<PeoplePage />} />
            <Route path="/igrejas" element={<ChurchesPage />} />
            <Route path="/hinarios" element={<HymnsPage />} />
            <Route path="/bebida" element={<BeveragePage />} />
            <Route path="/trabalhos" element={<TrabalhosPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
