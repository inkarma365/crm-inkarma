import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import '@fontsource/schibsted-grotesk/latin-500.css';
import '@fontsource/schibsted-grotesk/latin-600.css';
import '@fontsource/schibsted-grotesk/latin-700.css';
import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-400-italic.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import '@inkarma/ui-tokens/tokens.css';
import './app.css';
import { Cornice } from './componenti/Cornice.tsx';
import { Accedi } from './pagine/Accedi.tsx';
import { Accesso } from './pagine/Accesso.tsx';
import { LeadPagina } from './pagine/LeadPagina.tsx';

const router = createBrowserRouter(
  [
    { path: '/accesso', element: <Accesso /> },
    { path: '/accedi', element: <Accedi /> },
    {
      element: <Cornice />,
      children: [
        { index: true, element: <Navigate to="/lead" replace /> },
        { path: '/lead', element: <LeadPagina /> },
        { path: '/lead/:id', element: <LeadPagina /> },
        { path: '*', element: <Navigate to="/lead" replace /> },
      ],
    },
  ],
  { basename: '/portale' },
);

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
