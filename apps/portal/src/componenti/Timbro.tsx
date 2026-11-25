import { ETICHETTA, TONO, conOra, chiDaEmail } from '../lib/formato.ts';
import type { Esito } from '../lib/tipi.ts';

/** Il timbro dell'esito: l'unico elemento "inchiostrato" della bolla. Si anima solo quando è appena stato apposto. */
export function Timbro({ esito, quando, chi, nuovo = false }: { esito: Esito; quando: string | null; chi: string | null; nuovo?: boolean }) {
  return (
    <div className={`timbro timbro--${TONO[esito]}${nuovo ? ' timbro--nuovo' : ''}`} role="status">
      <span className="timbro__esito">{ETICHETTA[esito]}</span>
      {quando && (
        <span className="timbro__chi">
          {conOra(quando)}
          {chi ? ` da ${chiDaEmail(chi)}` : ''}
        </span>
      )}
    </div>
  );
}
