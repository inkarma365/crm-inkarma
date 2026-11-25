import { useState } from 'react';
import { api, ApiError } from '../lib/api.ts';

/** Accesso senza password: chiedi il link, aprilo dalla tua email. */
export function Accesso({ motivo }: { motivo?: string }) {
  const [email, setEmail] = useState('');
  const [stato, setStato] = useState<'modulo' | 'invio' | 'inviato'>('modulo');
  const [errore, setErrore] = useState<string | null>(null);

  return (
    <main className="accesso">
      <div className="accesso__foglio">
        <p className="marchio" aria-label="inKarma">
          inKarma
        </p>
        {stato === 'inviato' ? (
          <>
            <h1 className="accesso__titolo">Controlla la posta</h1>
            <p>
              Se <strong>{email}</strong> è abilitato all’area clienti, ti abbiamo mandato un link di accesso. Vale 20 minuti e funziona una
              sola volta.
            </p>
            <p className="testo-tenue">Non lo trovi? Guarda nello spam, poi richiedilo di nuovo.</p>
            <button type="button" className="bottone bottone--testo" onClick={() => setStato('modulo')}>
              Richiedi un nuovo link
            </button>
          </>
        ) : (
          <>
            <h1 className="accesso__titolo">Area clienti</h1>
            {motivo && (
              <p className="avviso-in-pagina" role="status">
                {motivo}
              </p>
            )}
            <p>Qui trovi i lead che ti abbiamo consegnato e indichi com’è andata. Ti mandiamo un link via email: nessuna password da ricordare.</p>
            <form
              className="accesso__modulo"
              onSubmit={async (e) => {
                e.preventDefault();
                setErrore(null);
                setStato('invio');
                try {
                  await api('/accesso', { method: 'POST', body: { email: email.trim() } });
                  setStato('inviato');
                } catch (err) {
                  setErrore(err instanceof ApiError ? err.message : 'Richiesta non inviata. Riprova.');
                  setStato('modulo');
                }
              }}
            >
              <label className="campo">
                <span className="campo__etichetta">La tua email di lavoro</span>
                <input
                  className="campo__input"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              {errore && (
                <p className="errore-in-linea" role="alert">
                  {errore}
                </p>
              )}
              <button type="submit" className="bottone bottone--pieno bottone--largo" disabled={stato === 'invio'}>
                {stato === 'invio' ? 'Invio…' : 'Mandami il link'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
