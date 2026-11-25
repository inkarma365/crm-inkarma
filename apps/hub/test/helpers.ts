import { PGlite } from '@electric-sql/pglite';
import { Kysely, sql } from 'kysely';
import { PGliteDialect } from 'kysely-pglite-dialect';
import type { DB } from '../src/db/schema.ts';
import { migrateToLatest, type Db } from '../src/db/index.ts';
import type { ServiceMail, ServiceMailer, SentMail } from '../src/notify/mailer.ts';
import type { Config } from '../src/config.ts';

// Un'istanza PGlite per worker (l'avvio WASM costa secondi); tra un test e l'altro si svuotano le tabelle.
let shared: Db | null = null;
export const makeTestDb = async (): Promise<Db> => {
  if (!shared) {
    shared = new Kysely<DB>({ dialect: new PGliteDialect(new PGlite()) });
    await migrateToLatest(shared);
  }
  await sql`TRUNCATE event_log, effect_outbox, portal_session, portal_login_token, portal_membership, portal_user, audit_log, import_row, import_batch RESTART IDENTITY CASCADE`.execute(shared);
  return shared;
};

export class FakeMailer implements ServiceMailer {
  sent: ServiceMail[] = [];
  failNext = 0;
  async send(mail: ServiceMail): Promise<SentMail> {
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error('SMTP non raggiungibile (simulato)');
    }
    this.sent.push(mail);
    return { messageId: `<${mail.operationKey}@test>`, accepted: [mail.to], redirectedFrom: null };
  }
}

export const testConfig: Config = {
  NODE_ENV: 'test',
  PORT: 0,
  PUBLIC_URL: 'http://portale.test',
  HUB_DATABASE_URL: 'pglite://memoria',
  TWENTY_URL: 'http://twenty.test',
  TWENTY_API_KEY: 'chiave-di-test-lunga-abbastanza',
  TWENTY_WEBHOOK_SECRET: 'segreto-webhook-di-test',
  SESSION_SECRET: 'x'.repeat(40),
  SERVICE_SMTP_URL: 'smtp://nessuno',
  SERVICE_MAIL_FROM: 'test@inkarma.test',
  SERVICE_MAIL_REDIRECT_TO: undefined,
  PORTAL_DIST_DIR: '/inesistente',
};

/** Estrae il token dal link nell'ultima email di accesso. */
export const tokenFromMail = (m: ServiceMail): string => {
  const t = /#t=([A-Za-z0-9_-]+)/.exec(m.rendered.text)?.[1];
  if (!t) throw new Error('token non trovato nella email');
  return t;
};
