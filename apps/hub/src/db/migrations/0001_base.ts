import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`.execute(db);

  await db.schema
    .createTable('event_log')
    .addColumn('seq', 'bigserial', (c) => c.primaryKey())
    .addColumn('dedup_key', 'text', (c) => c.notNull().unique())
    .addColumn('event_id', 'text', (c) => c.notNull())
    .addColumn('event_type', 'text', (c) => c.notNull())
    .addColumn('version', 'integer', (c) => c.notNull())
    .addColumn('source', 'text', (c) => c.notNull())
    .addColumn('commessa_id', 'uuid')
    .addColumn('occurred_at', 'timestamptz', (c) => c.notNull())
    .addColumn('received_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('payload', 'jsonb', (c) => c.notNull())
    .addColumn('processed_at', 'timestamptz')
    .addColumn('process_error', 'text')
    .execute();
  await db.schema.createIndex('event_log_type_commessa').on('event_log').columns(['event_type', 'commessa_id']).execute();

  await db.schema
    .createTable('effect_outbox')
    .addColumn('id', 'uuid', (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('operation_key', 'text', (c) => c.notNull().unique())
    .addColumn('intent', 'text', (c) => c.notNull())
    .addColumn('commessa_id', 'uuid')
    .addColumn('payload', 'jsonb', (c) => c.notNull())
    .addColumn('status', 'text', (c) =>
      c.notNull().check(sql`status in ('pending','in_flight','done','failed','uncertain')`),
    )
    .addColumn('attempts', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('last_error', 'text')
    .addColumn('result', 'jsonb')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('portal_user')
    .addColumn('id', 'uuid', (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('email', 'text', (c) => c.notNull().unique())
    .addColumn('display_name', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('disabled_at', 'timestamptz')
    .execute();

  await db.schema
    .createTable('portal_membership')
    .addColumn('user_id', 'uuid', (c) => c.notNull().references('portal_user.id').onDelete('cascade'))
    .addColumn('commessa_id', 'uuid', (c) => c.notNull())
    .addColumn('commessa_nome', 'text', (c) => c.notNull())
    .addColumn('ruolo', 'text', (c) => c.notNull().check(sql`ruolo in ('referente','lettore')`))
    .addColumn('granted_by', 'text', (c) => c.notNull())
    .addColumn('granted_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('revoked_at', 'timestamptz')
    .addPrimaryKeyConstraint('portal_membership_pk', ['user_id', 'commessa_id'])
    .execute();

  await db.schema
    .createTable('portal_login_token')
    .addColumn('token_hash', 'text', (c) => c.primaryKey())
    .addColumn('user_id', 'uuid', (c) => c.notNull().references('portal_user.id').onDelete('cascade'))
    .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
    .addColumn('used_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('portal_session')
    .addColumn('id_hash', 'text', (c) => c.primaryKey())
    .addColumn('user_id', 'uuid', (c) => c.notNull().references('portal_user.id').onDelete('cascade'))
    .addColumn('commessa_id', 'uuid', (c) => c.notNull())
    .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('revoked_at', 'timestamptz')
    .execute();

  await db.schema
    .createTable('audit_log')
    .addColumn('seq', 'bigserial', (c) => c.primaryKey())
    .addColumn('at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('actor', 'text', (c) => c.notNull())
    .addColumn('action', 'text', (c) => c.notNull())
    .addColumn('commessa_id', 'uuid')
    .addColumn('target', 'text')
    .addColumn('outcome', 'text', (c) => c.notNull())
    .addColumn('details', 'jsonb')
    .execute();
  await db.schema.createIndex('audit_log_commessa_at').on('audit_log').columns(['commessa_id', 'at']).execute();

  await db.schema
    .createTable('import_batch')
    .addColumn('id', 'uuid', (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('idempotency_key', 'text', (c) => c.notNull().unique())
    .addColumn('commessa_id', 'uuid', (c) => c.notNull())
    .addColumn('campagna_id', 'uuid', (c) => c.notNull())
    .addColumn('file_name', 'text', (c) => c.notNull())
    .addColumn('file_sha256', 'text', (c) => c.notNull())
    .addColumn('mapping', 'jsonb', (c) => c.notNull())
    .addColumn('status', 'text', (c) => c.notNull())
    .addColumn('totals', 'jsonb')
    .addColumn('created_by', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('completed_at', 'timestamptz')
    .execute();

  await db.schema
    .createTable('import_row')
    .addColumn('batch_id', 'uuid', (c) => c.notNull().references('import_batch.id').onDelete('cascade'))
    .addColumn('row_number', 'integer', (c) => c.notNull())
    .addColumn('raw', 'jsonb', (c) => c.notNull())
    .addColumn('normalized', 'jsonb')
    .addColumn('outcome', 'text', (c) => c.notNull())
    .addColumn('errors', 'jsonb')
    .addColumn('twenty_person_id', 'uuid')
    .addColumn('twenty_appartenenza_id', 'uuid')
    .addPrimaryKeyConstraint('import_row_pk', ['batch_id', 'row_number'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const t of [
    'import_row',
    'import_batch',
    'audit_log',
    'portal_session',
    'portal_login_token',
    'portal_membership',
    'portal_user',
    'effect_outbox',
    'event_log',
  ]) {
    await db.schema.dropTable(t).ifExists().execute();
  }
}
