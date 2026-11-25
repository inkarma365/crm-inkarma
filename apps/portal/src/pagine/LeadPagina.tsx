import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router';
import { api, ApiError } from '../lib/api.ts';
import { EsitoProvider, useEsito } from '../lib/esito.tsx';
import type { Lead } from '../lib/tipi.ts';
import { Bolla } from '../componenti/Bolla.tsx';
import type { CorniceCtx } from '../componenti/Cornice.tsx';
import { PannelloRifiuto } from '../componenti/PannelloRifiuto.tsx';
import { LeadDettaglio } from './LeadDettaglio.tsx';

type Vista = 'da_valutare' | 'tutti';

export function LeadPagina() {
  const [versione, setVersione] = useState(0);
  const aggiorna = useCallback(() => setVersione((v) => v + 1), []);
  return (
    <EsitoProvider onCambio={aggiorna}>
      <LeadElenco versione={versione} />
    </EsitoProvider>
  );
}

function LeadElenco({ versione }: { versione: number }) {
  const { io } = useOutletContext<CorniceCtx>();
  const { id: selezionato } = useParams();
  const [params, setParams] = useSearchParams();
  const vista: Vista = params.get('vista') === 'tutti' ? 'tutti' : 'da_valutare';
  const [tutti, setTutti] = useState<Lead[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [timbrato, setTimbrato] = useState<string | null>(null);
  const { avviso, chiudiAvviso } = useEsito();

  useEffect(() => {
    let vivo = true;
    api<{ lead: Lead[] }>('/lead?vista=tutti')
      .then((r) => vivo && (setTutti(r.lead), setErrore(null)))
      .catch((e) => vivo && setErrore(e instanceof ApiError ? e.message : 'Lead non caricati'));
    return () => {
      vivo = false;
    };
  }, [versione, io.commessa.id]);

  useEffect(() => {
    if (!avviso) return;
    const t = setTimeout(chiudiAvviso, 4000);
    return () => clearTimeout(t);
  }, [avviso, chiudiAvviso]);

  const daValutare = tutti?.filter((l) => l.esito === 'IN_ATTESA') ?? [];
  const elenco = vista === 'tutti' ? (tutti ?? []) : daValutare;
  const segnaTimbrato = (l: Lead) => setTimbrato(l.id);

  return (
    <div className={`lead${selezionato ? ' lead--con-dettaglio' : ''}`}>
      <section className="lead__elenco" aria-labelledby="titolo-lead">
        <h1 id="titolo-lead" className="titolo-pagina">
          Lead consegnati
        </h1>
        {tutti && (
          <p className="sommario">
            {daValutare.length === 0
              ? 'Hai dato un esito a tutti i lead consegnati.'
              : daValutare.length === 1
                ? 'Un lead aspetta il tuo esito.'
                : `${daValutare.length} lead aspettano il tuo esito.`}
          </p>
        )}
        <div className="interruttore" role="group" aria-label="Quali lead mostrare">
          <button
            type="button"
            aria-pressed={vista === 'da_valutare'}
            onClick={() => setParams(vista === 'da_valutare' ? params : {}, { replace: true })}
          >
            Da valutare <span className="conteggio">{daValutare.length}</span>
          </button>
          <button type="button" aria-pressed={vista === 'tutti'} onClick={() => setParams({ vista: 'tutti' }, { replace: true })}>
            Tutti <span className="conteggio">{tutti?.length ?? 0}</span>
          </button>
        </div>

        {errore && (
          <p className="errore-in-linea" role="alert">
            {errore}
          </p>
        )}
        {!tutti && !errore && <div className="caricamento caricamento--in-linea" aria-busy="true" aria-label="Caricamento dei lead" />}
        {tutti && elenco.length === 0 && (
          <div className="vuoto">
            {vista === 'da_valutare' ? (
              <>
                <p>Nessun lead da valutare.</p>
                <p className="testo-tenue">Quando ne consegniamo uno nuovo ti avvisiamo via email.</p>
                {tutti.length > 0 && (
                  <Link to="/lead?vista=tutti" className="link">
                    Rivedi i {tutti.length} lead già valutati
                  </Link>
                )}
              </>
            ) : (
              <p>Non ti abbiamo ancora consegnato lead per {io.commessa.nome}.</p>
            )}
          </div>
        )}
        <ol className="lead__lista">
          {elenco.map((l) => (
            <li key={l.id}>
              <Bolla lead={l} selezionata={l.id === selezionato} appenaTimbrata={l.id === timbrato} onEsito={segnaTimbrato} />
            </li>
          ))}
        </ol>
      </section>

      {selezionato && (
        <section className="lead__dettaglio" aria-label="Dettaglio del lead">
          <LeadDettaglio id={selezionato} versione={versione} onEsito={segnaTimbrato} />
        </section>
      )}

      <PannelloRifiuto motivi={io.motiviRifiuto} onFatto={segnaTimbrato} />
      <div className="avviso" role="status" aria-live="polite">
        {avviso && <p className="avviso__testo">{avviso}</p>}
      </div>
    </div>
  );
}
