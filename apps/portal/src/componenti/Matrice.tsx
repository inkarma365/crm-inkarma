import { useState } from 'react';
import type { Lead } from '../lib/tipi.ts';
import { useEsito } from '../lib/esito.tsx';

/** Le due risposte possibili alla consegna. Il rifiuto apre la scelta del motivo. */
export function Matrice({ lead, onEsito }: { lead: Lead; onEsito: (lead: Lead) => void }) {
  const { invia, apriRifiuto, inCorso, errore } = useEsito();
  const [locale, setLocale] = useState<string | null>(null);
  const occupato = inCorso === lead.id;

  return (
    <div className="matrice">
      <div className="matrice__azioni">
        <button
          type="button"
          className="bottone bottone--pieno"
          disabled={occupato}
          onClick={async () => {
            setLocale(null);
            const ok = await invia(lead, { esito: 'ACCETTATO' });
            if (ok) onEsito({ ...lead, esito: 'ACCETTATO' });
            else setLocale(lead.id);
          }}
        >
          {occupato ? 'Invio…' : 'Accetto'}
        </button>
        <button type="button" className="bottone bottone--contorno" disabled={occupato} onClick={() => apriRifiuto(lead)}>
          Non è in target
        </button>
      </div>
      {locale === lead.id && errore && (
        <p className="errore-in-linea" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}
