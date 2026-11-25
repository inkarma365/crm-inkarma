import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, nuovaChiave } from './api.ts';
import type { Esito, Lead } from './tipi.ts';

type Invio = { esito: Esito; motivo?: string; nota?: string };

type Ctx = {
  invia: (lead: Lead, invio: Invio) => Promise<boolean>;
  inCorso: string | null;
  errore: string | null;
  rifiuto: Lead | null;
  apriRifiuto: (lead: Lead) => void;
  chiudiRifiuto: () => void;
  avviso: string | null;
  chiudiAvviso: () => void;
};

const EsitoCtx = createContext<Ctx | null>(null);

/**
 * Invio degli esiti. Ogni intenzione (lead + esito + motivo) ha una chiave stabile:
 * se la rete cade e l'utente riprova, il server riconosce la stessa richiesta e non duplica.
 */
export function EsitoProvider({ children, onCambio }: { children: ReactNode; onCambio: () => void }) {
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [rifiuto, setRifiuto] = useState<Lead | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const chiavi = useRef(new Map<string, string>());

  const invia = useCallback(
    async (lead: Lead, invio: Invio) => {
      const intento = `${lead.id}|${invio.esito}|${invio.motivo ?? ''}|${invio.nota ?? ''}`;
      if (!chiavi.current.has(intento)) chiavi.current.set(intento, nuovaChiave());
      setInCorso(lead.id);
      setErrore(null);
      try {
        await api(`/lead/${lead.id}/esito`, { method: 'POST', body: { ...invio, chiave: chiavi.current.get(intento) } });
        chiavi.current.delete(intento);
        setAvviso(`Esito inviato per ${lead.nome}`);
        onCambio();
        return true;
      } catch (e) {
        setErrore(e instanceof ApiError ? e.message : 'Esito non inviato. Riprova.');
        return false;
      } finally {
        setInCorso(null);
      }
    },
    [onCambio],
  );

  return (
    <EsitoCtx.Provider
      value={{
        invia,
        inCorso,
        errore,
        rifiuto,
        apriRifiuto: (l) => {
          setErrore(null);
          setRifiuto(l);
        },
        chiudiRifiuto: () => setRifiuto(null),
        avviso,
        chiudiAvviso: () => setAvviso(null),
      }}
    >
      {children}
    </EsitoCtx.Provider>
  );
}

export const useEsito = () => {
  const c = useContext(EsitoCtx);
  if (!c) throw new Error('EsitoProvider mancante');
  return c;
};
