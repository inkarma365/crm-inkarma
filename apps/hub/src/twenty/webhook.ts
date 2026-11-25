import { hmacHex, safeEqual } from '../lib/crypto.ts';

export type TwentyWebhookCheck =
  | { ok: true }
  | { ok: false; reason: 'firma_mancante' | 'firma_errata' | 'timestamp_scaduto' };

/**
 * Verifica la firma dei webhook Twenty: HMAC-SHA256 esadecimale di `${timestamp}:${corpo grezzo}`.
 * Il corpo va verificato byte per byte come ricevuto, prima di qualsiasi parsing.
 */
export const verifyTwentyWebhook = (
  secret: string,
  rawBody: string,
  signature: string | undefined,
  timestamp: string | undefined,
  now = Date.now(),
  toleranceMs = 5 * 60 * 1000,
): TwentyWebhookCheck => {
  if (!signature || !timestamp) return { ok: false, reason: 'firma_mancante' };
  const expected = hmacHex(secret, `${timestamp}:${rawBody}`);
  if (!safeEqual(signature.toLowerCase(), expected)) return { ok: false, reason: 'firma_errata' };
  const ts = Number(timestamp);
  const tsMs = ts < 1e12 ? ts * 1000 : ts;
  if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > toleranceMs) return { ok: false, reason: 'timestamp_scaduto' };
  return { ok: true };
};

/** Normalizza il payload Twenty (le versioni hanno usato chiavi diverse). */
export const parseTwentyWebhook = (body: unknown) => {
  const b = (body ?? {}) as Record<string, unknown>;
  const eventName = String(b.eventName ?? b.event ?? b.name ?? '');
  const [objectName, action] = eventName.split('.');
  const record = (b.record ?? (b.data as Record<string, unknown> | undefined)?.record ?? b.data ?? {}) as Record<
    string,
    unknown
  >;
  const recordId = String(record.id ?? b.recordId ?? '');
  const eventDate = String(b.eventDate ?? b.timestamp ?? new Date().toISOString());
  /** Identificatore stabile dell'evento assegnato da Twenty: base della deduplica delle riconsegne. */
  const eventId = typeof b.eventId === 'string' && b.eventId ? b.eventId : null;
  /** Solo nomi delle chiavi (nessun valore): diagnostica per payload di forma inattesa. */
  const keys = Object.keys(b).sort();
  return { eventName, objectName: objectName ?? '', action: action ?? '', record, recordId, eventDate, eventId, keys };
};
