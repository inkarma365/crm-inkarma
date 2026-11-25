import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { api, ApiError } from '../lib/api.ts';
import type { Io } from '../lib/tipi.ts';

/** Sezioni realmente disponibili. La barra di navigazione compare solo quando ce n'è più di una. */
export const SEZIONI: Array<{ to: string; etichetta: string }> = [{ to: '/lead', etichetta: 'Lead' }];

export type CorniceCtx = { io: Io; ricarica: () => void };

export function Cornice() {
  const navigate = useNavigate();
  const [io, setIo] = useState<Io | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(() => {
    api<Io>('/io')
      .then(setIo)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) navigate('/accesso', { replace: true });
        else setErrore(e instanceof Error ? e.message : 'Errore di caricamento');
      });
  }, [navigate]);

  useEffect(carica, [carica]);

  if (errore)
    return (
      <main className="pagina">
        <p className="errore-in-linea" role="alert">
          {errore}
        </p>
        <button className="bottone bottone--contorno" onClick={carica}>
          Riprova
        </button>
      </main>
    );
  if (!io) return <div className="caricamento" aria-busy="true" aria-label="Caricamento" />;

  return (
    <div className="app">
      <a className="salta" href="#contenuto">
        Vai al contenuto
      </a>
      <header className="testata">
        <p className="marchio">inKarma</p>
        <div className="testata__commessa">
          {io.commesse.length > 1 ? (
            <label>
              <span className="visivamente-nascosto">Commessa</span>
              <select
                className="selettore"
                value={io.commessa.id}
                onChange={async (e) => {
                  await api('/commessa', { method: 'POST', body: { commessaId: e.target.value } });
                  navigate('/lead');
                  carica();
                }}
              >
                {io.commesse.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="testata__nome-commessa">{io.commessa.nome}</span>
          )}
        </div>
        <button
          type="button"
          className="bottone bottone--testo testata__esci"
          onClick={async () => {
            await api('/esci', { method: 'POST' }).catch(() => undefined);
            navigate('/accesso', { replace: true });
          }}
        >
          Esci
        </button>
      </header>
      {SEZIONI.length > 1 && (
        <nav className="schede" aria-label="Sezioni">
          {SEZIONI.map((s) => (
            <NavLink key={s.to} to={s.to} className="schede__voce">
              {s.etichetta}
            </NavLink>
          ))}
        </nav>
      )}
      <div id="contenuto" className="app__contenuto">
        <Outlet context={{ io, ricarica: carica } satisfies CorniceCtx} />
      </div>
    </div>
  );
}
