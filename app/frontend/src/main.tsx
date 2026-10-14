import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Application } from './Application';
import { frontendEnvSchema } from './env';
import './styles.css';

const env = frontendEnvSchema.safeParse(import.meta.env);
const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {env.success ? <QueryClientProvider client={client}><Application apiBaseUrl={env.data.VITE_API_BASE_URL} /></QueryClientProvider>
      : <main className="configuration-error"><h1>Configuration needs attention</h1><p>Set VITE_API_BASE_URL to /api/v1 or an HTTP(S) API URL ending in /api/v1, then restart the frontend.</p></main>}
  </React.StrictMode>,
);
