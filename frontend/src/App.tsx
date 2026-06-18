import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { AuthGate } from './components/AuthGate';
import { NavBar } from './components/NavBar';
import { RoleGate } from './components/RoleGate';
import { useAuth } from './providers/useAuth';
import { useDevMode } from './providers/useDevMode';

const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const SacramentPage = lazy(() => import('./pages/SacramentPage'));
const ChurchesPage = lazy(() => import('./pages/ChurchesPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EuropeanGatheringAdminPage = lazy(() => import('./pages/EuropeanGatheringAdminPage'));
const EuropeanGatheringPage = lazy(() => import('./pages/EuropeanGatheringPage'));
const EventsAdminPage = lazy(() => import('./pages/EventsAdminPage'));
const EventRegistrationPage = lazy(() => import('./pages/EventRegistrationPage'));
const LeaderReviewPage = lazy(() => import('./pages/LeaderReviewPage'));
const HymnsPage = lazy(() => import('./pages/HymnsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const MembersPage = lazy(() => import('./pages/MembersPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PeoplePage = lazy(() => import('./pages/PeoplePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const WorksPage = lazy(() => import('./pages/WorksPage'));

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

function EuropeanGatheringRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteFallback />;
  }

  if (user) {
    return (
      <ShellFrame>
        <EuropeanGatheringPage showPublicHero={false} />
      </ShellFrame>
    );
  }

  return <Navigate to="/login" replace state={{ from: location }} />;
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
        <Route path="/european-gathering" element={<EuropeanGatheringRoute />} />
        <Route path="/european-gathering/leader-review/:id" element={<LeaderReviewPage />} />
        <Route element={<AuthGate />}>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/events/:slug" element={<EventRegistrationPage />} />
            <Route element={<DevOnlyRoute />}>
              <Route path="/churches" element={<ChurchesPage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/hymnals" element={<HymnsPage />} />
              <Route path="/works" element={<WorksPage />} />
            </Route>
            <Route element={<RoleGate requiredRole="custodian" />}>
              <Route path="/sacrament" element={<SacramentPage />} />
            </Route>
            <Route element={<RoleGate requiredRole="admin" />}>
              <Route path="/admin/european-gathering" element={<EuropeanGatheringAdminPage />} />
              <Route path="/admin/members" element={<MembersPage />} />
            </Route>
            <Route element={<RoleGate requiredRole="eventadmin" />}>
              <Route path="/admin/events" element={<EventsAdminPage />} />
            </Route>
            <Route element={<RoleGate requiredRole="useradmin" />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
