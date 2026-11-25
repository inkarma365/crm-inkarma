import type { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

/** Registro durevole e deduplicato di tutti gli eventi ricevuti o emessi. */
export interface EventLogTable {
  seq: Generated<string>;
  dedup_key: string;
  event_id: string;
  event_type: string;
  version: number;
  source: string;
  commessa_id: string | null;
  occurred_at: Timestamp;
  received_at: Generated<Date>;
  payload: unknown;
  processed_at: Date | null;
  process_error: string | null;
}

export type EffectStatus = 'pending' | 'in_flight' | 'done' | 'failed' | 'uncertain';

/** Ogni effetto esterno (invio email, scrittura su provider) passa da qui. */
export interface EffectOutboxTable {
  id: Generated<string>;
  operation_key: string;
  intent: string;
  commessa_id: string | null;
  payload: unknown;
  status: EffectStatus;
  attempts: Generated<number>;
  last_error: string | null;
  result: unknown;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PortalUserTable {
  id: Generated<string>;
  email: string;
  display_name: string;
  created_at: Generated<Date>;
  disabled_at: Date | null;
}

/** Appartenenza esplicita utente ↔ commessa. Mai dedotta dal dominio email. */
export interface PortalMembershipTable {
  user_id: string;
  commessa_id: string;
  commessa_nome: string;
  ruolo: 'referente' | 'lettore';
  granted_by: string;
  granted_at: Generated<Date>;
  revoked_at: Date | null;
}

export interface PortalLoginTokenTable {
  token_hash: string;
  user_id: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Generated<Date>;
}

export interface PortalSessionTable {
  id_hash: string;
  user_id: string;
  commessa_id: string;
  expires_at: Date;
  created_at: Generated<Date>;
  revoked_at: Date | null;
}

export interface AuditLogTable {
  seq: Generated<string>;
  at: Generated<Date>;
  actor: string;
  action: string;
  commessa_id: string | null;
  target: string | null;
  outcome: 'ok' | 'negato' | 'errore';
  details: unknown;
}

export interface ImportBatchTable {
  id: Generated<string>;
  idempotency_key: string;
  commessa_id: string;
  campagna_id: string;
  file_name: string;
  file_sha256: string;
  mapping: unknown;
  status: 'anteprima' | 'confermato' | 'completato' | 'errore';
  totals: unknown;
  created_by: string;
  created_at: Generated<Date>;
  completed_at: Date | null;
}

export interface ImportRowTable {
  batch_id: string;
  row_number: number;
  raw: unknown;
  normalized: unknown;
  outcome: string;
  errors: unknown;
  twenty_person_id: string | null;
  twenty_appartenenza_id: string | null;
}

export interface DB {
  event_log: EventLogTable;
  effect_outbox: EffectOutboxTable;
  portal_user: PortalUserTable;
  portal_membership: PortalMembershipTable;
  portal_login_token: PortalLoginTokenTable;
  portal_session: PortalSessionTable;
  audit_log: AuditLogTable;
  import_batch: ImportBatchTable;
  import_row: ImportRowTable;
}
