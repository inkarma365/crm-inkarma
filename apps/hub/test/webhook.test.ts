import { describe, expect, it } from 'vitest';
import { hmacHex } from '../src/lib/crypto.ts';
import { buildServer } from '../src/http/server.ts';
import { TwentyClient } from '../src/twenty/client.ts';
import { verifyTwentyWebhook } from '../src/twenty/webhook.ts';
import { FakeTwenty } from './fake-twenty.ts';
import { FakeMailer, makeTestDb, testConfig } from './helpers.ts';

const secret = testConfig.TWENTY_WEBHOOK_SECRET;

describe('firma dei webhook Twenty', () => {
  const body = JSON.stringify({ eventName: 'consegnaLead.created', record: { id: 'abc' } });
  const ts = String(Date.now());

  it('accetta una firma valida', () => {
    expect(verifyTwentyWebhook(secret, body, hmacHex(secret, `${ts}:${body}`), ts)).toEqual({ ok: true });
  });
  it('rifiuta corpo alterato', () => {
    expect(verifyTwentyWebhook(secret, body + ' ', hmacHex(secret, `${ts}:${body}`), ts).ok).toBe(false);
  });
  it('rifiuta timestamp vecchio (replay)', () => {
    const old = String(Date.now() - 3600_000);
    expect(verifyTwentyWebhook(secret, body, hmacHex(secret, `${old}:${body}`), old)).toEqual({ ok: false, reason: 'timestamp_scaduto' });
  });
});

describe('endpoint /webhooks/twenty', () => {
  it('registra una volta sola lo stesso evento e risponde 200 al duplicato', async () => {
    const db = await makeTestDb();
    const fake = new FakeTwenty();
    const app = await buildServer({ config: testConfig, db, twenty: new TwentyClient('http://t', 'k'.repeat(30), fake.fetch), mailer: new FakeMailer() });
    const payload = JSON.stringify({ eventName: 'commessa.updated', record: { id: '4f1f0c8e-2a6b-4c7d-9e1f-0a2b3c4d5e6f' } });
    const ts = String(Date.now());
    const headers = {
      'content-type': 'application/json',
      'x-twenty-webhook-timestamp': ts,
      'x-twenty-webhook-signature': hmacHex(secret, `${ts}:${payload}`),
    };
    const r1 = await app.inject({ method: 'POST', url: '/webhooks/twenty', headers, payload });
    const r2 = await app.inject({ method: 'POST', url: '/webhooks/twenty', headers, payload });
    expect(r1.json()).toEqual({ ricevuto: true, duplicato: false });
    expect(r2.json()).toEqual({ ricevuto: true, duplicato: true });
    const bad = await app.inject({ method: 'POST', url: '/webhooks/twenty', headers: { ...headers, 'x-twenty-webhook-signature': 'deadbeef' }, payload });
    expect(bad.statusCode).toBe(401);
    expect(await db.selectFrom('event_log').select('seq').execute()).toHaveLength(1);
  });
});
