import { createHash } from 'node:crypto';
import type { Db } from '../db/index.ts';
import { fv, type TwentyClient } from '../twenty/client.ts';
import { leggiTabella } from './parse.ts';
import { ETICHETTE, riconosciColonne, type Mappatura } from './mappa.ts';
import { creaVerificaMx, normalizza, type RigaNormalizzata } from './normalizza.ts';

export type EsitoRiga = 'NUOVO' | 'PERSONA_ESISTENTE' | 'GIA_IN_CAMPAGNA' | 'DA_VERIFICARE' | 'ESCLUSO_OPPOSIZIONE' | 'DUPLICATO_NEL_FILE' | 'ERRORE';

export const ETICHETTA_ESITO: Record<EsitoRiga, string> = {
  NUOVO: 'Nuovo contatto',
  PERSONA_ESISTENTE: 'Persona già nel CRM, nuova in questa campagna',
  GIA_IN_CAMPAGNA: 'Già in questa campagna: nessuna modifica',
  DA_VERIFICARE: 'Possibile duplicato: entra in revisione',
  ESCLUSO_OPPOSIZIONE: 'Escluso: opposizione registrata',
  DUPLICATO_NEL_FILE: 'Ripetuto nel file: considerato una volta',
  ERRORE: 'Errore: riga scartata',
};

export type RigaAnalizzata = RigaNormalizzata & {
  n: number;
  esito: EsitoRiga;
  messaggi: string[];
  personaId: string | null;
  appartenenzaId: string | null;
  mx: 'VALIDO' | 'ASSENTE' | 'NON_VERIFICATO';
};

export type Analisi = {
  colonne: Array<{ intestazione: string; campo: string | null; etichetta: string | null }>;
  totali: Record<EsitoRiga | 'righe', number>;
  righe: RigaAnalizzata[];
  sha256: string;
};

const chunk = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
export const chiaveImport = (campagnaId: string, r: Pick<RigaNormalizzata, 'email' | 'telefono'>) => `${campagnaId}:${r.email ?? r.telefono}`;

/**
 * Analizza il file senza scrivere nulla in Twenty: per ogni riga calcola esito e motivi.
 * È la stessa funzione che l'import riusa, così ciò che si conferma è ciò che si è visto.
 */
export const analizza = async (
  twenty: TwentyClient,
  args: { nomeFile: string; contenuto: Buffer; formato: 'AUTOMATICO' | 'LEADSPARK'; campagnaId: string; commessaId: string; mappatura?: Mappatura | null },
  verificaMx = creaVerificaMx(),
): Promise<Analisi> => {
  const tab = await leggiTabella(args.nomeFile, args.contenuto);
  const mappa = args.mappatura?.length === tab.intestazioni.length ? args.mappatura : riconosciColonne(tab.intestazioni, args.formato);
  if (!mappa.some((m) => m.campo === 'email') && !mappa.some((m) => m.campo === 'telefono')) {
    throw new Error('Nessuna colonna riconosciuta come email o telefono: rinomina l’intestazione (es. "Email") e ricarica il file.');
  }
  const righe: RigaAnalizzata[] = tab.righe.map((r, i) => ({
    ...normalizza(mappa, r),
    n: i + 2, // numero di riga come nel foglio (riga 1 = intestazioni)
    esito: 'NUOVO',
    messaggi: [],
    personaId: null,
    appartenenzaId: null,
    mx: 'NON_VERIFICATO',
  }));

  // Opposizioni: email o dominio, globali o di questa commessa.
  const emails = [...new Set(righe.map((r) => r.email).filter((e): e is string => !!e))];
  const domini = [...new Set(emails.map((e) => e.split('@')[1]!))];
  const opposti = new Set<string>();
  for (const parte of chunk([...emails, ...domini], 50)) {
    const r = await twenty.list<{ valore: string; ambito: string; commessaId: string | null }>('opposizioni', {
      filter: `valore[in]:[${parte.map(fv).join(',')}]`,
      limit: 60,
    });
    for (const o of r.items) if (o.ambito === 'GLOBALE' || o.commessaId === args.commessaId) opposti.add(o.valore.toLowerCase());
  }

  // Già presenti in questa campagna (stessa chiave di import) e persone già nel CRM.
  const chiavi = righe.filter((r) => r.email || r.telefono).map((r) => chiaveImport(args.campagnaId, r));
  const inCampagna = new Map<string, string>();
  for (const parte of chunk(chiavi, 50)) {
    const r = await twenty.list<{ id: string; chiaveImport: string }>('appartenenze', { filter: `chiaveImport[in]:[${parte.map(fv).join(',')}]`, limit: 60 });
    for (const a of r.items) inCampagna.set(a.chiaveImport, a.id);
  }
  const persone = new Map<string, { id: string; nome: string }>();
  for (const parte of chunk(emails, 50)) {
    const r = await twenty.list<{ id: string; emails: { primaryEmail: string }; name: { firstName: string; lastName: string } }>('people', {
      filter: `emails.primaryEmail[in]:[${parte.map(fv).join(',')}]`,
      limit: 60,
    });
    for (const p of r.items) persone.set(p.emails.primaryEmail.toLowerCase(), { id: p.id, nome: `${p.name.firstName} ${p.name.lastName}`.trim() });
  }
  // Persone già presenti in questa campagna per altre vie (manuale, API, altri import): stessa campagna = stesso lead.
  const personaInCampagna = new Map<string, string>();
  for (const parte of chunk([...persone.values()].map((p) => p.id), 50)) {
    const r = await twenty.list<{ id: string; personaId: string }>('appartenenze', {
      filter: `and(campagnaId[eq]:${fv(args.campagnaId)},personaId[in]:[${parte.map(fv).join(',')}])`,
      limit: 60,
    });
    for (const a of r.items) personaInCampagna.set(a.personaId, a.id);
  }
  // Omonimi con email diversa (nel CRM): possibile stessa persona → revisione, mai fusione automatica.
  const cognomi = [...new Set(righe.map((r) => r.cognome).filter(Boolean))];
  const omonimi = new Map<string, string>();
  for (const parte of chunk(cognomi, 40)) {
    const r = await twenty.list<{ id: string; emails: { primaryEmail: string | null }; name: { firstName: string; lastName: string } }>('people', {
      filter: `name.lastName[in]:[${parte.map(fv).join(',')}]`,
      limit: 60,
    });
    for (const p of r.items) omonimi.set(`${p.name.firstName} ${p.name.lastName}`.toLowerCase(), p.emails?.primaryEmail ?? '');
  }

  const visti = new Set<string>();
  for (const r of righe) {
    if (r.errori.length) {
      r.esito = 'ERRORE';
      r.messaggi = r.errori;
      continue;
    }
    const chiave = chiaveImport(args.campagnaId, r);
    if (visti.has(chiave)) {
      r.esito = 'DUPLICATO_NEL_FILE';
      continue;
    }
    visti.add(chiave);
    if (r.email && (opposti.has(r.email) || opposti.has(r.email.split('@')[1]!))) {
      r.esito = 'ESCLUSO_OPPOSIZIONE';
      continue;
    }
    r.mx = await verificaMx(r.email);
    if (r.mx === 'ASSENTE') r.messaggi.push('Il dominio dell’email non riceve posta (nessun record MX)');
    const giaInCampagna = inCampagna.get(chiave);
    if (giaInCampagna) {
      r.esito = 'GIA_IN_CAMPAGNA';
      r.appartenenzaId = giaInCampagna;
      continue;
    }
    const esistente = r.email ? persone.get(r.email) : undefined;
    if (esistente && personaInCampagna.has(esistente.id)) {
      r.esito = 'GIA_IN_CAMPAGNA';
      r.personaId = esistente.id;
      r.appartenenzaId = personaInCampagna.get(esistente.id)!;
      continue;
    }
    if (esistente) {
      r.esito = 'PERSONA_ESISTENTE';
      r.personaId = esistente.id;
      continue;
    }
    const omonimo = omonimi.get(`${r.nome} ${r.cognome}`.toLowerCase());
    if (omonimo !== undefined && omonimo !== r.email) {
      r.esito = 'DA_VERIFICARE';
      r.messaggi.push(`Nel CRM esiste già ${r.nome} ${r.cognome}${omonimo ? ` con email ${omonimo}` : ''}`);
    }
  }

  const totali = { righe: righe.length } as Analisi['totali'];
  for (const k of Object.keys(ETICHETTA_ESITO) as EsitoRiga[]) totali[k] = righe.filter((r) => r.esito === k).length;
  return {
    colonne: mappa.map((m) => ({ intestazione: m.intestazione, campo: m.campo, etichetta: m.campo ? ETICHETTE[m.campo] : null })),
    totali,
    righe,
    sha256: createHash('sha256').update(args.contenuto).digest('hex'),
  };
};

/** Riepilogo compatto da salvare sul record Twenty (le righe complete restano nell'Hub). */
export const riepilogo = (a: Analisi, nomeFile: string, fase: 'anteprima' | 'esito') => ({
  fase,
  file: nomeFile,
  generatoIl: new Date().toISOString(),
  colonne: a.colonne,
  totali: a.totali,
  righe: a.righe
    .filter((r) => fase === 'esito' || r.esito !== 'NUOVO' || r.messaggi.length)
    .concat(a.righe.filter((r) => r.esito === 'NUOVO' && !r.messaggi.length))
    .slice(0, 60)
    .map((r) => ({
      n: r.n,
      nome: `${r.nome} ${r.cognome}`.trim() || r.azienda || '',
      email: r.email,
      azienda: r.azienda,
      esito: r.esito,
      esitoTesto: ETICHETTA_ESITO[r.esito],
      messaggi: r.messaggi,
    })),
});

/**
 * Esegue l'import. Idempotente: la chiave campagna+email impedisce doppioni anche se lo stesso
 * file viene confermato due volte o reimportato; le opposizioni restano escluse anche al reimport.
 */
export const importa = async (
  deps: { db: Db; twenty: TwentyClient },
  args: { lottoId: string; nomeFile: string; campagnaId: string; commessaId: string; fonte: 'CSV' | 'EXCEL' | 'LEADSPARK' | 'API'; autore: string },
  analisi: Analisi,
) => {
  const { db, twenty } = deps;
  const batch = await db
    .insertInto('import_batch')
    .values({
      idempotency_key: `${args.lottoId}:${analisi.sha256}`,
      commessa_id: args.commessaId,
      campagna_id: args.campagnaId,
      file_name: args.nomeFile,
      file_sha256: analisi.sha256,
      mapping: JSON.stringify(analisi.colonne),
      status: 'confermato',
      totals: JSON.stringify(analisi.totali),
      created_by: args.autore,
      completed_at: null,
    })
    .onConflict((oc) => oc.column('idempotency_key').doUpdateSet({ status: 'confermato' }))
    .returning('id')
    .executeTakeFirstOrThrow();

  const aziende = new Map<string, string>();
  const azienda = async (nome: string | null, sito: string | null): Promise<string | null> => {
    if (!nome) return null;
    const k = nome.toLowerCase();
    if (aziende.has(k)) return aziende.get(k)!;
    const found = await twenty.list<{ id: string }>('companies', { filter: `name[eq]:${fv(nome)}`, limit: 1 });
    const id =
      found.items[0]?.id ??
      (
        await twenty.create<{ id: string }>('companies', 'company', {
          name: nome,
          ...(sito ? { domainName: { primaryLinkUrl: sito.startsWith('http') ? sito : `https://${sito}` } } : {}),
        })
      ).id;
    aziende.set(k, id);
    return id;
  };

  const oggi = new Date().toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });
  for (const r of analisi.righe) {
    let personaId = r.personaId;
    let appartenenzaId = r.appartenenzaId;
    if (r.esito === 'NUOVO' || r.esito === 'PERSONA_ESISTENTE' || r.esito === 'DA_VERIFICARE') {
      const aziendaId = await azienda(r.azienda, r.sito);
      if (!personaId) {
        personaId = (
          await twenty.create<{ id: string }>('people', 'person', {
            name: { firstName: r.nome, lastName: r.cognome },
            ...(r.email ? { emails: { primaryEmail: r.email } } : {}),
            ...(r.telefono ? { phones: { primaryPhoneNumber: r.telefono.replace(/^\+39/, ''), primaryPhoneCallingCode: r.telefono.startsWith('+39') ? '+39' : '' } } : {}),
            ...(r.ruolo ? { jobTitle: r.ruolo } : {}),
            ...(r.citta ? { city: r.citta } : {}),
            ...(aziendaId ? { companyId: aziendaId } : {}),
          })
        ).id;
      }
      // Ricontrollo subito prima della scrittura: un import concorrente può aver già creato il lead.
      const chiave = chiaveImport(args.campagnaId, r);
      const ora = await twenty.list<{ id: string }>('appartenenze', { filter: `chiaveImport[eq]:${fv(chiave)}`, limit: 1 });
      appartenenzaId =
        ora.items[0]?.id ??
        (
          await twenty.create<{ id: string }>('appartenenze', 'appartenenza', {
            titolo: `${r.nome} ${r.cognome}`.trim() || r.azienda || r.email,
            campagnaId: args.campagnaId,
            commessaId: args.commessaId,
            personaId,
            ...(aziendaId ? { aziendaProspectId: aziendaId } : {}),
            fonte: args.fonte,
            provenienza: `Import "${args.nomeFile}" del ${oggi}, riga ${r.n}`,
            dataIngresso: new Date().toISOString(),
            statoFunnel: 'NUOVO',
            revisione: r.esito === 'DA_VERIFICARE' ? 'DA_VERIFICARE' : 'NESSUNA',
            ...(r.esito === 'DA_VERIFICARE' ? { motivoEsclusione: r.messaggi.join('; ') } : {}),
            segnaleMx: r.mx,
            chiaveImport: chiave,
            criteri: { soddisfatti: [], mancanti: [], ...(r.evidenza ? { notaImport: r.evidenza } : {}), ...(r.settore ? { settore: r.settore } : {}) },
          })
        ).id;
    }
    await db
      .insertInto('import_row')
      .values({
        batch_id: batch.id,
        row_number: r.n,
        raw: JSON.stringify({ email: r.email, nome: r.nome, cognome: r.cognome, azienda: r.azienda }),
        normalized: JSON.stringify({ mx: r.mx }),
        outcome: r.esito,
        errors: JSON.stringify(r.messaggi),
        twenty_person_id: personaId,
        twenty_appartenenza_id: appartenenzaId,
      })
      .onConflict((oc) =>
        oc.columns(['batch_id', 'row_number']).doUpdateSet({ outcome: r.esito, twenty_person_id: personaId, twenty_appartenenza_id: appartenenzaId }),
      )
      .execute();
  }
  await db.updateTable('import_batch').set({ status: 'completato', completed_at: new Date() }).where('id', '=', batch.id).execute();
  return batch.id;
};
