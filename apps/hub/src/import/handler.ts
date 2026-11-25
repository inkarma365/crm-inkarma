import type { Db } from '../db/index.ts';
import type { TwentyClient } from '../twenty/client.ts';
import { audit } from '../lib/audit.ts';
import { analizza, importa, riepilogo } from './pipeline.ts';
import type { Mappatura } from './mappa.ts';

type Lotto = {
  id: string;
  nome: string | null;
  stato: string;
  formato: 'AUTOMATICO' | 'LEADSPARK';
  messaggio: string | null;
  mappatura: Mappatura | null;
  campagnaId: string | null;
  file: Array<{ fileId: string; label: string; url?: string }> | null;
  createdBy?: { name?: string } | null;
};

/** L'URL firmato punta al dominio pubblico; dall'interno della rete Docker si usa l'indirizzo interno. */
export const urlInterno = (url: string, twentyUrl: string) => {
  const u = new URL(url);
  const base = new URL(twentyUrl);
  u.protocol = base.protocol;
  u.host = base.host;
  return u.toString();
};

/**
 * Macchina a stati dell'import (comandi dell'operatore: file allegato, RICALCOLA, CONFERMATO).
 * Rilegge sempre il record: i webhook possono arrivare duplicati o in ordine diverso.
 */
export const gestisciImport = async (deps: { db: Db; twenty: TwentyClient; twentyUrl: string; fetchImpl?: typeof fetch }, lottoId: string) => {
  const { twenty, db } = deps;
  const l = await twenty.get<Lotto>('importLotti', 'importLotto', lottoId);
  if (!l) return;
  const aggiorna = (data: Record<string, unknown>) => twenty.update('importLotti', 'importLotto', l.id, data);
  const file = l.file?.[0];

  if (l.stato === 'IN_ATTESA_FILE' && (!file || !l.campagnaId)) {
    const msg = !l.campagnaId && !file ? 'Scegli la campagna e allega il file CSV o Excel.' : !l.campagnaId ? 'Scegli la campagna di destinazione.' : 'Allega il file CSV o Excel.';
    if (l.messaggio !== msg) await aggiorna({ messaggio: msg });
    return;
  }
  if (!['IN_ATTESA_FILE', 'RICALCOLA', 'CONFERMATO'].includes(l.stato) || !file || !l.campagnaId) return;

  const campagna = await twenty.get<{ id: string; commessaId: string | null; nome: string }>('campagne', 'campagna', l.campagnaId);
  if (!campagna?.commessaId) {
    await aggiorna({ stato: 'ERRORE', messaggio: 'La campagna non è collegata a una commessa: collegala e richiedi il ricalcolo.' });
    return;
  }
  const conferma = l.stato === 'CONFERMATO';
  if (!conferma) await aggiorna({ stato: 'ANALISI', messaggio: 'Analisi del file in corso…' });

  try {
    if (!file.url) throw new Error('URL del file non disponibile');
    const res = await (deps.fetchImpl ?? fetch)(urlInterno(file.url, deps.twentyUrl), { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Download del file non riuscito (${res.status})`);
    const contenuto = Buffer.from(await res.arrayBuffer());
    const analisi = await analizza(twenty, {
      nomeFile: file.label,
      contenuto,
      formato: l.formato ?? 'AUTOMATICO',
      campagnaId: campagna.id,
      commessaId: campagna.commessaId,
      mappatura: l.mappatura,
    });
    if (!conferma) {
      await aggiorna({
        stato: 'ANTEPRIMA_PRONTA',
        riepilogo: riepilogo(analisi, file.label, 'anteprima'),
        mappatura: analisi.colonne.map((c) => ({ intestazione: c.intestazione, campo: c.campo })),
        messaggio: `Anteprima pronta: ${analisi.totali.righe} righe lette.`,
      });
      return;
    }
    const fonte = l.formato === 'LEADSPARK' ? 'LEADSPARK' : file.label.toLowerCase().endsWith('.xlsx') ? 'EXCEL' : 'CSV';
    await importa({ db, twenty }, { lottoId: l.id, nomeFile: file.label, campagnaId: campagna.id, commessaId: campagna.commessaId, fonte, autore: l.createdBy?.name ?? 'operatore' }, analisi);
    const t = analisi.totali;
    await aggiorna({
      stato: 'COMPLETATO',
      riepilogo: riepilogo(analisi, file.label, 'esito'),
      messaggio: `Import completato: ${t.NUOVO + t.PERSONA_ESISTENTE} nuovi in campagna, ${t.DA_VERIFICARE} da verificare, ${t.GIA_IN_CAMPAGNA} già presenti, ${t.ESCLUSO_OPPOSIZIONE} esclusi per opposizione, ${t.ERRORE} righe con errori.`,
    });
    await audit(db, { actor: l.createdBy?.name ?? 'operatore', action: 'import.completato', commessaId: campagna.commessaId, target: l.id, outcome: 'ok', details: t });
  } catch (e) {
    await aggiorna({ stato: 'ERRORE', messaggio: e instanceof Error ? e.message : 'Errore durante l’analisi del file' });
  }
};
