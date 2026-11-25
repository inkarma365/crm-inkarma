import { loadConfig } from './config.ts';
import { createDb, migrateToLatest } from './db/index.ts';
import { markOrphanedEffectsUncertain } from './effects/outbox.ts';
import { processPending } from './events/store.ts';
import { buildHandlers, reconcileCommesse } from './handlers.ts';
import { buildServer } from './http/server.ts';
import { createSmtpMailer } from './notify/mailer.ts';
import { TwentyClient } from './twenty/client.ts';

const config = loadConfig();
const db = createDb(config.HUB_DATABASE_URL);
const applied = await migrateToLatest(db);
const twenty = new TwentyClient(config.TWENTY_URL, config.TWENTY_API_KEY);
const mailer = createSmtpMailer({ url: config.SERVICE_SMTP_URL, from: config.SERVICE_MAIL_FROM, redirectTo: config.SERVICE_MAIL_REDIRECT_TO });
const deps = { db, twenty, mailer, publicUrl: config.PUBLIC_URL };
const handlers = buildHandlers(deps);

// Processore eventi: un ciclo per volta, risvegliato dai webhook o dal timer.
let running = false;
let again = false;
const tick = async () => {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    do {
      again = false;
      await processPending(db, handlers, 50);
    } while (again);
  } catch (err) {
    app.log.error({ err }, 'processore eventi');
  } finally {
    running = false;
  }
};

const app = await buildServer({ config, db, twenty, mailer, wake: () => void tick() });
const orphaned = await markOrphanedEffectsUncertain(db);
app.log.info({ migrazioni: applied, effettiIncerti: orphaned }, 'avvio hub');

const timer = setInterval(() => void tick(), 5_000);
const reconcile = async () => {
  try {
    const n = await reconcileCommesse(deps);
    app.log.info({ commesse: n }, 'riallineamento accessi portale');
  } catch (err) {
    app.log.warn({ err }, 'riallineamento commesse non riuscito (Twenty non raggiungibile?): nuovo tentativo tra 30 s');
    setTimeout(() => void reconcile(), 30_000).unref();
  }
};
const reconcileTimer = setInterval(() => void reconcile(), 10 * 60_000);
void reconcile();

await app.listen({ host: '0.0.0.0', port: config.PORT });

const shutdown = async () => {
  clearInterval(timer);
  clearInterval(reconcileTimer);
  await app.close();
  await db.destroy();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
