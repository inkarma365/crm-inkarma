import type { Db } from './db/index.ts';
import type { EventHandler } from './events/store.ts';
import type { ServiceMailer } from './notify/mailer.ts';
import { syncCommessaMembers } from './portal/auth.ts';
import { commessaEmails, notificaConsegna } from './domain/consegne.ts';
import type { TwentyClient } from './twenty/client.ts';
import { gestisciImport } from './import/handler.ts';

type Deps = { db: Db; twenty: TwentyClient; mailer: ServiceMailer; publicUrl: string; twentyUrl?: string };

export const syncCommessa = async (deps: Deps, commessaId: string) => {
  const c = await deps.twenty.get<{ id: string; nome: string; stato: string; referenteEmail: { primaryEmail?: string; additionalEmails?: string[] } }>(
    'commesse',
    'commessa',
    commessaId,
  );
  if (!c) return syncCommessaMembers(deps.db, { id: commessaId, nome: '(eliminata)', stato: 'CHIUSA', emails: [] }, 'twenty');
  return syncCommessaMembers(deps.db, { id: c.id, nome: c.nome, stato: c.stato, emails: commessaEmails(c) }, 'twenty');
};

/** Riallinea tutte le commesse (avvio e periodicamente): recupera webhook persi. */
export const reconcileCommesse = async (deps: Deps) => {
  const all = await deps.twenty.listAll<{ id: string }>('commesse', {}, 5000);
  for (const c of all) await syncCommessa(deps, c.id);
  return all.length;
};

export const buildHandlers = (deps: Deps): Record<string, EventHandler> => ({
  'twenty.webhook@1': async (ev) => {
    const p = ev.payload as { objectName: string; action: string; recordId: string };
    if (p.objectName === 'commessa') {
      await syncCommessa(deps, p.recordId);
    } else if (p.objectName === 'consegnaLead' && p.action === 'created') {
      const r = await notificaConsegna(deps, p.recordId);
      if (r === 'errore') throw new Error('invio notifica non riuscito per almeno un destinatario');
    } else if (p.objectName === 'importLotto') {
      await gestisciImport({ db: deps.db, twenty: deps.twenty, twentyUrl: deps.twentyUrl ?? 'http://server:3000' }, p.recordId);
    }
  },
});
