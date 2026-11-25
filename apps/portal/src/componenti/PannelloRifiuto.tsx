import { useEffect, useId, useRef, useState } from 'react';
import { useEsito } from '../lib/esito.tsx';
import type { Lead } from '../lib/tipi.ts';

/**
 * Scelta del motivo di rifiuto. Su telefono sale dal basso come un foglio; su schermo largo è
 * una finestra centrata. Il motivo è obbligatorio: è ciò che ci permette di qualificare meglio.
 */
export function PannelloRifiuto({ motivi, onFatto }: { motivi: string[]; onFatto: (lead: Lead) => void }) {
  const { rifiuto, chiudiRifiuto, invia, inCorso, errore } = useEsito();
  const [motivo, setMotivo] = useState<string>('');
  const [nota, setNota] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titolo = useId();

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (rifiuto && !d.open) {
      setMotivo('');
      setNota('');
      d.showModal();
    }
    if (!rifiuto && d.open) d.close();
  }, [rifiuto]);

  const occupato = !!rifiuto && inCorso === rifiuto.id;
  const serveNota = motivo === 'Altro';
  const pronto = motivo && (!serveNota || nota.trim().length >= 3);

  return (
    <dialog ref={dialogRef} className="foglio-modale" aria-labelledby={titolo} onClose={chiudiRifiuto} onCancel={chiudiRifiuto}>
      {rifiuto && (
        <form
          method="dialog"
          className="foglio-modale__corpo"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!pronto) return;
            const ok = await invia(rifiuto, { esito: 'RIFIUTATO', motivo, ...(serveNota ? { nota: nota.trim() } : {}) });
            if (ok) {
              onFatto({ ...rifiuto, esito: 'RIFIUTATO' });
              chiudiRifiuto();
            }
          }}
        >
          <h2 id={titolo} className="foglio-modale__titolo">
            Perché {rifiuto.nome} non è in target?
          </h2>
          <p className="testo-tenue">Il motivo arriva al team che seleziona i lead: serve a mandarti contatti più adatti.</p>
          <fieldset className="scelte">
            <legend className="visivamente-nascosto">Motivo</legend>
            {motivi.map((m) => (
              <label key={m} className={`scelta${motivo === m ? ' scelta--attiva' : ''}`}>
                <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} />
                <span>{m}</span>
              </label>
            ))}
          </fieldset>
          {serveNota && (
            <label className="campo">
              <span className="campo__etichetta">Spiega in poche parole</span>
              <textarea className="campo__input" rows={3} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} required />
            </label>
          )}
          {errore && (
            <p className="errore-in-linea" role="alert">
              {errore}
            </p>
          )}
          <div className="foglio-modale__azioni">
            <button type="button" className="bottone bottone--testo" onClick={chiudiRifiuto}>
              Annulla
            </button>
            <button type="submit" className="bottone bottone--pieno" disabled={!pronto || occupato}>
              {occupato ? 'Invio…' : 'Invia esito'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
