import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, ApiError } from '../lib/api.ts';
import { Accesso } from './Accesso.tsx';

/** Apertura del link ricevuto via email. Il token sta nel frammento (#t=…): non finisce nei log dei server. */
export function Accedi() {
  const navigate = useNavigate();
  const [errore, setErrore] = useState<string | null>(null);
  const avviato = useRef(false);

  useEffect(() => {
    if (avviato.current) return;
    avviato.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('t');
    history.replaceState(null, '', window.location.pathname);
    if (!token) {
      setErrore('Il link è incompleto. Chiedine uno nuovo.');
      return;
    }
    api('/sessione', { method: 'POST', body: { token } })
      .then(() => navigate('/lead', { replace: true }))
      .catch((e) => setErrore(e instanceof ApiError ? e.message : 'Accesso non riuscito. Riprova.'));
  }, [navigate]);

  if (errore) return <Accesso motivo={errore} />;
  return (
    <main className="accesso">
      <div className="accesso__foglio" aria-busy="true">
        <p className="marchio">inKarma</p>
        <p>Ti stiamo facendo entrare…</p>
      </div>
    </main>
  );
}
