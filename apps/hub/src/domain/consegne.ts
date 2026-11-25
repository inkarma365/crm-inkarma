import type { Db } from '../db/index.ts';
import { performEffect } from '../effects/outbox.ts';
import { recordEvent } from '../events/store.ts';
import type { ServiceMailer } from '../notify/mailer.ts';
import { leadProntoV1 } from '../notify/templates.ts';
import { fv, TwentyError, type TwentyClient } from '../twenty/client.ts';
import { CommessaScope, ESITI_PORTALE, MOTIVI_RIFIUTO, type EsitoPortale } from '../portal/scope.ts';
import { audit } from '../lib/audit.ts';

type Commessa = { id: string; nome: string; stato: string | null; referenteEmail?: { primaryEmail?: string | null; additionalEmails?: string[] | null } | null };

export const commessaEmails = (c: Commessa): string[] =>
  [c.referenteEmail?.primaryEmail, ...(c.referenteEmail?.additionalEmails ?? [])].filter((e): e is string => !!e);

/** Un'opposizione globale o della stessa commessa su email o dominio blocca ogni comunicazione sul contatto. */
export const isOpposto = async (twenty: TwentyClient, commessaId: string, email: string | null | undefined): Promise<boolean> => {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  const dominio = e.split('@')[1] ?? '';
  const r = await twenty.list<{ id: string; tipo: string; ambito: string; commessaId: string | null; valore: string }>('opposizioni', {
    filter: `or(valore[eq]:${fv(e)},valore[eq]:${fv(dominio)})`,
    limit: 60,
  });
  return r.items.some(
    (o) =>
      ((o.tipo === 'EMAIL' && o.valore.toLowerCase() === e) || (o.tipo === 'DOMINIO' && o.valore.toLowerCase() === dominio)) &&
      (o.ambito === 'GLOBALE' || o.commessaId === commessaId),
  );
};

/**
 * Notifica "lead pronto" ai referenti della commessa per una consegna appena creata.
 * Rilegge lo stato corrente da Twenty (mai fidarsi del payload del webhook), verifica coerenza
 * dell'ambito, stato commessa e opposizioni, poi invia al più una volta per destinatario.
 */
export const notificaConsegna = async (
  deps: { db: Db; twenty: TwentyClient; mailer: ServiceMailer; publicUrl: string },
  consegnaId: string,
): Promise<'inviata' | 'bloccata' | 'gia_gestita' | 'non_trovata' | 'errore'> => {
  const { db, twenty, mailer } = deps;
  const c = await twenty.get<{
    id: string;
    commessaId: string | null;
    appartenenzaId: string | null;
    notifica: string;
    evidenza: string | null;
    persona?: { name?: { firstName?: string; lastName?: string }; emails?: { primaryEmail?: string | null } } | null;
    appartenenza?: { commessaId: string | null; aziendaProspectId: string | null } | null;
  }>('consegneLead', 'consegnaLead', consegnaId, 1);
  if (!c || !c.commessaId) return 'non_trovata';
  if (c.notifica === 'INVIATA') return 'gia_gestita';

  const blocca = async (motivo: string) => {
    await twenty.update('consegneLead', 'consegnaLead', c.id, { notifica: 'BLOCCATA' });
    await audit(db, { actor: 'hub', action: 'consegna.notifica', commessaId: c.commessaId, target: c.id, outcome: 'negato', details: { motivo } });
    return 'bloccata' as const;
  };

  // Ambito coerente: la consegna deve appartenere alla stessa commessa del lead in campagna.
  if (!c.appartenenza || c.appartenenza.commessaId !== c.commessaId) return blocca('commessa della consegna diversa da quella del lead');
  const commessa = await twenty.get<Commessa>('commesse', 'commessa', c.commessaId);
  if (!commessa) return blocca('commessa inesistente');
  if (commessa.stato !== 'ATTIVA') return blocca(`commessa ${commessa.stato}`);
  if (await isOpposto(twenty, c.commessaId, c.persona?.emails?.primaryEmail)) return blocca('opposizione registrata sul contatto');

  const destinatari = commessaEmails(commessa);
  if (destinatari.length === 0) return blocca('nessun referente cliente configurato');

  let azienda: string | null = null;
  if (c.appartenenza.aziendaProspectId) {
    azienda = (await twenty.get<{ name: string }>('companies', 'company', c.appartenenza.aziendaProspectId))?.name ?? null;
  }
  const lead = [c.persona?.name?.firstName, c.persona?.name?.lastName].filter(Boolean).join(' ') || 'Nuovo contatto';

  let errori = 0;
  for (const to of destinatari) {
    const out = await performEffect(
      db,
      { operationKey: `email:lead-pronto:${c.id}:${to.toLowerCase()}`, intent: 'email.lead-pronto', commessaId: c.commessaId, payload: { consegnaId: c.id, to } },
      () =>
        mailer.send({
          to,
          operationKey: `lead-pronto.${c.id}.${to}`,
          rendered: leadProntoV1({
            nomeReferente: to.split('@')[0]!,
            commessa: commessa.nome,
            lead,
            azienda,
            evidenza: c.evidenza,
            link: `${deps.publicUrl}/portale/lead/${c.id}`,
          }),
        }),
    );
    if (out.status !== 'done') errori++;
  }
  await twenty.update('consegneLead', 'consegnaLead', c.id, { notifica: errori ? 'ERRORE' : 'INVIATA' });
  await recordEvent(db, {
    dedupKey: `hub:lead.delivered:${c.id}`,
    eventId: c.id,
    type: 'lead.delivered',
    version: 1,
    source: 'hub',
    commessaId: c.commessaId,
    occurredAt: new Date(),
    payload: { consegnaId: c.id, appartenenzaId: c.appartenenzaId, destinatari: destinatari.length, errori },
  });
  return errori ? 'errore' : 'inviata';
};

export class InputError extends Error {}

/**
 * Esito dal portale. Idempotente sulla chiave del client: lo stesso invio ripetuto (doppio tap,
 * rete instabile) produce un solo record di storico. Un esito più vecchio di quello già
 * registrato entra nello storico ma non sovrascrive l'esito corrente (ordine invertito).
 */
export const registraEsito = async (
  deps: { db: Db; twenty: TwentyClient },
  scope: CommessaScope,
  autore: string,
  consegnaId: string,
  input: { esito: string; motivo?: string | null; nota?: string | null; chiave: string },
): Promise<{ stato: 'registrato' | 'gia_registrato'; esito: EsitoPortale } | null> => {
  const { db, twenty } = deps;
  if (!(ESITI_PORTALE as readonly string[]).includes(input.esito)) throw new InputError('Esito non valido');
  const esito = input.esito as EsitoPortale;
  if (!/^[A-Za-z0-9-]{8,64}$/.test(input.chiave)) throw new InputError('Chiave di invio non valida');
  let motivo: string | null = null;
  if (esito === 'RIFIUTATO') {
    if (!input.motivo || !(MOTIVI_RIFIUTO as readonly string[]).includes(input.motivo)) throw new InputError('Indica il motivo del rifiuto');
    motivo = input.motivo === 'Altro' ? `Altro: ${(input.nota ?? '').trim().slice(0, 300) || 'non specificato'}` : input.motivo;
  }

  const c = await scope.getConsegnaRaw(consegnaId);
  if (!c) return null;

  const eventId = `portale:${input.chiave}`;
  const esistente = await twenty.list<{ id: string; esito: string }>('feedbackLeads', { filter: `eventId[eq]:${fv(eventId)}`, limit: 1 });
  if (esistente.items[0]) return { stato: 'gia_registrato', esito: esistente.items[0].esito as EsitoPortale };

  const ricevutoIl = new Date().toISOString();
  try {
    await twenty.create('feedbackLeads', 'feedbackLead', {
      titolo: `${esito.replace(/_/g, ' ').toLowerCase()} — ${autore}`,
      esito,
      motivo,
      autore,
      canale: 'PORTALE',
      ricevutoIl,
      tardivo: false,
      eventId,
      consegnaId: c.id,
      commessaId: scope.commessaId,
    });
  } catch (e) {
    // Due richieste identiche in parallelo: l'indice unico su eventId ne lascia passare una.
    if (e instanceof TwentyError && (e.status === 400 || e.status === 409)) {
      const again = await twenty.list<{ esito: string }>('feedbackLeads', { filter: `eventId[eq]:${fv(eventId)}`, limit: 1 });
      if (again.items[0]) return { stato: 'gia_registrato', esito: again.items[0].esito as EsitoPortale };
    }
    throw e;
  }

  if (!c.esitoAggiornatoIl || c.esitoAggiornatoIl <= ricevutoIl) {
    await twenty.update('consegneLead', 'consegnaLead', c.id, {
      esito,
      motivoRifiuto: motivo,
      esitoAggiornatoIl: ricevutoIl,
      esitoDa: autore,
    });
  }
  await recordEvent(db, {
    dedupKey: `portale:lead.feedback:${eventId}`,
    eventId,
    type: 'lead.feedback',
    version: 1,
    source: 'portale',
    commessaId: scope.commessaId,
    occurredAt: ricevutoIl,
    payload: { consegnaId: c.id, esito, motivo, autore, tardivo: false },
  });
  await audit(db, { actor: autore, action: 'portale.esito', commessaId: scope.commessaId, target: c.id, outcome: 'ok', details: { esito } });
  return { stato: 'registrato', esito };
};
