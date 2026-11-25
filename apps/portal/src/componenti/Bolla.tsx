import { Link, useLocation } from 'react-router';
import { breve } from '../lib/formato.ts';
import type { Lead } from '../lib/tipi.ts';
import { Timbro } from './Timbro.tsx';
import { Matrice } from './Matrice.tsx';

/**
 * La bolla di consegna: in alto il lead e la frase che lo giustifica, poi la perforazione,
 * sotto la matrice da "firmare" con l'esito. Una volta firmata, la matrice porta il timbro.
 */
export function Bolla({
  lead,
  selezionata,
  appenaTimbrata,
  onEsito,
}: {
  lead: Lead;
  selezionata?: boolean;
  appenaTimbrata?: boolean;
  onEsito: (lead: Lead) => void;
}) {
  const inAttesa = lead.esito === 'IN_ATTESA';
  // La vista corrente (?vista=tutti) segue il dettaglio: l'elenco a fianco non cambia sotto gli occhi.
  const { search } = useLocation();
  return (
    <article className={`bolla${inAttesa ? ' bolla--attesa' : ''}${selezionata ? ' bolla--selezionata' : ''}`} aria-labelledby={`b-${lead.id}`}>
      <div className="bolla__corpo">
        <header className="bolla__testa">
          <h2 id={`b-${lead.id}`} className="bolla__nome">
            <Link to={`/lead/${lead.id}${search}`} className="bolla__link">
              {lead.nome}
            </Link>
          </h2>
          <time className="bolla__data" dateTime={lead.consegnatoIl ?? undefined}>
            {breve(lead.consegnatoIl)}
          </time>
        </header>
        {(lead.ruolo || lead.azienda) && <p className="bolla__ruolo">{[lead.ruolo, lead.azienda].filter(Boolean).join(', ')}</p>}
        {lead.evidenza && (
          <blockquote className="evidenza">
            <p>{lead.evidenza}</p>
          </blockquote>
        )}
        {inAttesa && (
          <p className="bolla__richiamo">
            <span className="scintilla" aria-hidden="true" />
            Aspetta il tuo esito
          </p>
        )}
      </div>
      <div className="perforazione" aria-hidden="true" />
      <div className="bolla__matrice">
        {inAttesa ? (
          <Matrice lead={lead} onEsito={onEsito} />
        ) : (
          <Timbro esito={lead.esito} quando={lead.esitoAggiornatoIl} chi={lead.esitoDa} nuovo={appenaTimbrata} />
        )}
      </div>
    </article>
  );
}
