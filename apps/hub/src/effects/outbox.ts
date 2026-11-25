import type { Db } from '../db/index.ts';
import type { EffectStatus } from '../db/schema.ts';

export type EffectOutcome<T> =
  | { status: 'done'; result: T; repeated: boolean }
  | { status: 'uncertain'; reason: string }
  | { status: 'failed'; error: string; attempts: number };

/** Errore che non va ritentato (es. destinatario rifiutato in modo definitivo). */
export class PermanentEffectError extends Error {}

/**
 * Esegue un effetto esterno al più una volta per `operationKey`.
 *
 * Stati: pending → in_flight → done | failed | uncertain.
 * - done: l'effetto è avvenuto; ogni richiamata restituisce il risultato salvato, senza ripeterlo.
 * - in_flight trovato all'avvio: un processo è morto durante l'effetto. Non sappiamo se il
 *   provider l'abbia eseguito, quindi si passa a `uncertain` e si chiede una riconciliazione o
 *   una revisione umana. Non si ripete mai alla cieca.
 * - failed: errore registrato; si ritenta solo se l'errore non è definitivo.
 */
export const performEffect = async <T>(
  db: Db,
  args: { operationKey: string; intent: string; commessaId: string | null; payload: unknown; maxAttempts?: number },
  effect: () => Promise<T>,
): Promise<EffectOutcome<T>> => {
  const maxAttempts = args.maxAttempts ?? 5;

  await db
    .insertInto('effect_outbox')
    .values({
      operation_key: args.operationKey,
      intent: args.intent,
      commessa_id: args.commessaId,
      payload: JSON.stringify(args.payload),
      status: 'pending',
      last_error: null,
      result: null,
    })
    .onConflict((oc) => oc.column('operation_key').doNothing())
    .execute();

  // Presa in carico atomica: solo chi porta la riga da pending/failed a in_flight esegue l'effetto.
  const claimed = await db
    .updateTable('effect_outbox')
    .set((eb) => ({ status: 'in_flight' as EffectStatus, attempts: eb('attempts', '+', 1), updated_at: new Date() }))
    .where('operation_key', '=', args.operationKey)
    .where('status', 'in', ['pending', 'failed'])
    .where('attempts', '<', maxAttempts)
    .returning(['attempts'])
    .executeTakeFirst();

  if (!claimed) {
    const row = await db
      .selectFrom('effect_outbox')
      .select(['status', 'result', 'last_error', 'attempts'])
      .where('operation_key', '=', args.operationKey)
      .executeTakeFirstOrThrow();
    if (row.status === 'done') return { status: 'done', result: row.result as T, repeated: true };
    if (row.status === 'uncertain') return { status: 'uncertain', reason: row.last_error ?? 'esito incerto' };
    if (row.status === 'in_flight') return { status: 'uncertain', reason: 'effetto in corso in un altro processo' };
    return { status: 'failed', error: row.last_error ?? 'tentativi esauriti', attempts: row.attempts };
  }

  try {
    const result = await effect();
    await db
      .updateTable('effect_outbox')
      .set({ status: 'done', result: JSON.stringify(result ?? null), last_error: null, updated_at: new Date() })
      .where('operation_key', '=', args.operationKey)
      .execute();
    return { status: 'done', result, repeated: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const permanent = err instanceof PermanentEffectError;
    await db
      .updateTable('effect_outbox')
      .set({
        status: 'failed',
        last_error: msg.slice(0, 2000),
        updated_at: new Date(),
        ...(permanent ? { attempts: maxAttempts } : {}),
      })
      .where('operation_key', '=', args.operationKey)
      .execute();
    return { status: 'failed', error: msg, attempts: permanent ? maxAttempts : claimed.attempts };
  }
};

/** All'avvio: gli effetti rimasti in_flight appartengono a un processo morto → incerti. */
export const markOrphanedEffectsUncertain = async (db: Db, olderThanMs = 60_000): Promise<number> => {
  const r = await db
    .updateTable('effect_outbox')
    .set({ status: 'uncertain', last_error: 'processo interrotto durante l\'effetto: verificare presso il provider', updated_at: new Date() })
    .where('status', '=', 'in_flight')
    .where('updated_at', '<', new Date(Date.now() - olderThanMs))
    .executeTakeFirst();
  return Number(r.numUpdatedRows);
};
