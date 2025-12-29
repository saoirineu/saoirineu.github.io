import React from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';

import { AuthGate } from './components/AuthGate';
import { NavBar } from './components/NavBar';
import BeveragePage from './pages/BeveragePage';
import ChurchesPage from './pages/ChurchesPage';
import DashboardPage from './pages/DashboardPage';
import HymnsPage from './pages/HymnsPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import PeoplePage from './pages/PeoplePage';
import PerfilPage from './pages/PerfilPage';
import TrabalhosPage from './pages/TrabalhosPage';

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
  );
}

export default App;
