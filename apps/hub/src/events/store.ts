import { sql } from 'kysely';
import type { Db } from '../db/index.ts';

/** Oltre questo numero di errori l'evento resta fermo e compare tra gli errori definitivi (rilancio manuale). */
export const MAX_ATTEMPTS = 8;

export type RecordedEvent = {
  dedupKey: string;
  eventId: string;
  type: string;
  version: number;
  source: string;
  commessaId: string | null;
  occurredAt: string | Date;
  payload: unknown;
};

/**
 * Registra un evento in modo durevole. Restituisce false se lo stesso fatto era già registrato
 * (duplicato o riconsegna del provider): il chiamante risponde comunque 200 e non rielabora.
 */
export const recordEvent = async (db: Db, e: RecordedEvent): Promise<{ inserted: boolean; seq: string | null }> => {
  const r = await db
    .insertInto('event_log')
    .values({
      dedup_key: e.dedupKey,
      event_id: e.eventId,
      event_type: e.type,
      version: e.version,
      source: e.source,
      commessa_id: e.commessaId,
      occurred_at: e.occurredAt,
      payload: JSON.stringify(e.payload),
      processed_at: null,
      process_error: null,
    })
    .onConflict((oc) => oc.column('dedup_key').doNothing())
    .returning('seq')
    .executeTakeFirst();
  return { inserted: !!r, seq: r?.seq ?? null };
};

export type EventHandler = (ev: {
  seq: string;
  type: string;
  version: number;
  source: string;
  commessaId: string | null;
  occurredAt: Date;
  payload: unknown;
}) => Promise<void>;

/** Durata della presa in carico: se il processo muore, l'evento torna disponibile dopo questo tempo. */
export const LEASE_MS = 5 * 60_000;

/**
 * Elabora gli eventi non ancora processati, uno per volta.
 * Presa in carico atomica (UPDATE … WHERE seq = (SELECT … FOR UPDATE SKIP LOCKED) RETURNING):
 * due istanze dell'Hub non prendono mai lo stesso evento. L'handler gira FUORI da transazioni
 * (nessun lock tenuto durante le chiamate di rete). Dopo un crash il lease scade e l'evento
 * viene ripreso: per questo gli handler sono idempotenti (outbox + rilettura dello stato).
 * Gli errori restano registrati; nuovo tentativo dopo 2^n secondi, fino a MAX_ATTEMPTS.
 */
export const processPending = async (db: Db, handlers: Record<string, EventHandler>, limit = 20): Promise<number> => {
  let done = 0;
  for (let i = 0; i < limit; i++) {
    const claimed = await sql<{
      seq: string;
      event_type: string;
      version: number;
      source: string;
      commessa_id: string | null;
      occurred_at: Date;
      payload: unknown;
      attempts: number;
    }>`
      UPDATE event_log SET next_attempt_at = now() + ${`${LEASE_MS} milliseconds`}::interval
      WHERE seq = (
        SELECT seq FROM event_log
        WHERE processed_at IS NULL AND next_attempt_at <= now() AND attempts < ${MAX_ATTEMPTS}
        ORDER BY seq
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING seq, event_type, version, source, commessa_id, occurred_at, payload, attempts`.execute(db);
    const row = claimed.rows[0];
    if (!row) break;
    const handler = handlers[`${row.event_type}@${row.version}`];
    try {
      if (handler) {
        await handler({
          seq: row.seq,
          type: row.event_type,
          version: row.version,
          source: row.source,
          commessaId: row.commessa_id,
          occurredAt: row.occurred_at,
          payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
        });
      }
      await db.updateTable('event_log').set({ processed_at: new Date(), process_error: null }).where('seq', '=', row.seq).execute();
    } catch (err) {
      const attempts = row.attempts + 1;
      const msg = err instanceof Error ? err.message : String(err);
      await db
        .updateTable('event_log')
        .set({
          attempts,
          process_error: msg.slice(0, 2000),
          next_attempt_at: new Date(Date.now() + Math.min(2 ** attempts, 3600) * 1000),
        })
        .where('seq', '=', row.seq)
        .execute();
    }
    done++;
  }
  return done;
};
