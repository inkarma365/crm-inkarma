import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { api, ApiError } from '../lib/api.ts';
import { useEsito } from '../lib/esito.tsx';
import { AVANZAMENTI, ETICHETTA, TONO, conOra, chiDaEmail, lunga } from '../lib/formato.ts';
import type { Lead, LeadDettaglio as Dettaglio } from '../lib/tipi.ts';
import { Matrice } from '../componenti/Matrice.tsx';
import { Timbro } from '../componenti/Timbro.tsx';

/** Scheda completa: contatti, perché te lo abbiamo mandato, storico degli esiti e passi successivi. */
export function LeadDettaglio({ id, versione, onEsito }: { id: string; versione: number; onEsito: (l: Lead) => void }) {
  const [lead, setLead] = useState<Dettaglio | null>(null);
  const [errore, setErrore] = useState<{ status: number; msg: string } | null>(null);
  const { invia, inCorso, errore: erroreInvio } = useEsito();
  const { search } = useLocation();

  useEffect(() => {
    let vivo = true;
    setErrore(null);
    api<{ lead: Dettaglio }>(`/lead/${id}`)
      .then((r) => vivo && setLead(r.lead))
      .catch((e) => vivo && setErrore({ status: e instanceof ApiError ? e.status : 0, msg: e instanceof Error ? e.message : '' }));
    return () => {
      vivo = false;
    };
  }, [id, versione]);

  if (errore)
    return (
      <div className="scheda">
        <Link to={`/lead${search}`} className="indietro">
          Torna ai lead
        </Link>
        <p className="vuoto">
          {errore.status === 404 ? 'Questo lead non esiste o non fa parte della tua commessa.' : errore.msg || 'Lead non caricato. Riprova.'}
        </p>
      </div>
    );
  if (!lead || lead.id !== id) return <div className="caricamento caricamento--in-linea" aria-busy="true" aria-label="Caricamento del lead" />;

  const avanzabili = lead.esito !== 'IN_ATTESA' && lead.esito !== 'RIFIUTATO' && lead.esito !== 'PERSO' && lead.esito !== 'VENDITA';
  const prossimi = AVANZAMENTI.slice(Math.max(0, AVANZAMENTI.indexOf(lead.esito) + 1));

  return (
    <article className="scheda" aria-labelledby="scheda-nome">
      <Link to={`/lead${search}`} className="indietro">
        Torna ai lead
      </Link>
      <h2 id="scheda-nome" className="scheda__nome">
        {lead.nome}
      </h2>
      {(lead.ruolo || lead.azienda) && <p className="scheda__ruolo">{[lead.ruolo, lead.azienda].filter(Boolean).join(', ')}</p>}

      <dl className="contatti">
        {lead.email && (
          <div>
            <dt>Email</dt>
            <dd>
              <a className="link" href={`mailto:${lead.email}`}>
                {lead.email}
              </a>
            </dd>
          </div>
        )}
        {lead.telefono && (
          <div>
            <dt>Telefono</dt>
            <dd>
              <a className="link" href={`tel:${lead.telefono.replace(/\s/g, '')}`}>
                {lead.telefono}
              </a>
            </dd>
          </div>
        )}
        {lead.commerciale && (
          <div>
            <dt>Affidato a</dt>
            <dd>{lead.commerciale}</dd>
          </div>
        )}
        {lead.campagna && (
          <div>
            <dt>Campagna</dt>
            <dd>{lead.campagna}</dd>
          </div>
        )}
        <div>
          <dt>Consegnato</dt>
          <dd>{lunga(lead.consegnatoIl)}</dd>
        </div>
      </dl>

      {lead.evidenza && (
        <figure className="scheda__perche">
          <figcaption>Perché te lo abbiamo mandato</figcaption>
          <blockquote className="evidenza evidenza--grande">
            <p>{lead.evidenza}</p>
          </blockquote>
        </figure>
      )}

      <div className="perforazione" aria-hidden="true" />

      <div className="scheda__esito">
        {lead.esito === 'IN_ATTESA' ? (
          <>
            <p className="bolla__richiamo">
              <span className="scintilla" aria-hidden="true" />
              Com’è andata con {lead.nome.split(' ')[0]}?
            </p>
            <Matrice lead={lead} onEsito={onEsito} />
          </>
        ) : (
          <Timbro esito={lead.esito} quando={lead.esitoAggiornatoIl} chi={lead.esitoDa} />
        )}
        {lead.motivoRifiuto && <p className="testo-tenue">Motivo: {lead.motivoRifiuto}</p>}
      </div>

      {avanzabili && prossimi.length > 0 && (
        <section className="avanzamento" aria-labelledby="titolo-avanzamento">
          <h3 id="titolo-avanzamento" className="sottotitolo">
            Aggiorna com’è andata
          </h3>
          <div className="avanzamento__scelte">
            {prossimi.map((e) => (
              <button
                key={e}
                type="button"
                className={`bottone bottone--contorno bottone--${TONO[e]}`}
                disabled={inCorso === lead.id}
                onClick={async () => {
                  if (await invia(lead, { esito: e })) onEsito({ ...lead, esito: e });
                }}
              >
                {ETICHETTA[e]}
              </button>
            ))}
          </div>
          {erroreInvio && inCorso === null && (
            <p className="errore-in-linea" role="alert">
              {erroreInvio}
            </p>
          )}
        </section>
      )}

      {lead.storico.length > 0 && (
        <section aria-labelledby="titolo-storico">
          <h3 id="titolo-storico" className="sottotitolo">
            Storico
          </h3>
          <ol className="storico">
            {lead.storico.map((s, i) => (
              <li key={i} className={`storico__voce storico__voce--${TONO[s.esito]}`}>
                <span className="storico__esito">{ETICHETTA[s.esito]}</span>
                <span className="storico__quando">
                  {conOra(s.ricevutoIl)}
                  {s.autore ? `, ${s.autore.includes('@') ? chiDaEmail(s.autore) : s.autore}` : ''}
                </span>
                {s.motivo && <span className="storico__motivo">{s.motivo}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
