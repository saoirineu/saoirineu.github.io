import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { AuthProvider } from './providers/AuthProvider';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

const basePath = import.meta.env.DEV ? '/' : import.meta.env.VITE_BASE_PATH ?? '/';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Elemento root não encontrado');
}

const rootElement = root;

async function clearLegacyServiceWorkers() {
  if (import.meta.env.DEV || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  const resetFlag = 'saoirineu-sw-reset-v1';
  if (window.localStorage.getItem(resetFlag) === 'done') {
    return false;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) {
    window.localStorage.setItem(resetFlag, 'done');
    return false;
  }

  await Promise.all(registrations.map(registration => registration.unregister()));

  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map(cacheKey => caches.delete(cacheKey)));
  }

  window.localStorage.setItem(resetFlag, 'done');
  window.location.reload();
  return true;
}

async function bootstrap() {
  const reloading = await clearLegacyServiceWorkers();
  if (reloading) {
    return;
  }

  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter basename={basePath} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}

void bootstrap();
