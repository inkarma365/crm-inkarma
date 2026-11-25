import type { Db } from '../db/index.ts';

/** Registro di audit esportabile. Nessun contenuto di email o dati personali nei dettagli: solo ID ed esiti. */
export const audit = async (
  db: Db,
  e: { actor: string; action: string; commessaId: string | null; target: string | null; outcome: 'ok' | 'negato' | 'errore'; details?: unknown },
) =>
  db
    .insertInto('audit_log')
    .values({
      actor: e.actor,
      action: e.action,
      commessa_id: e.commessaId,
      target: e.target,
      outcome: e.outcome,
      details: JSON.stringify(e.details ?? null),
    })
    .execute();
