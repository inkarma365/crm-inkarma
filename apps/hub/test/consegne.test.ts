import { describe, expect, it } from 'vitest';
import { notificaConsegna, registraEsito } from '../src/domain/consegne.ts';
import { performEffect, markOrphanedEffectsUncertain } from '../src/effects/outbox.ts';
import { processPending, recordEvent } from '../src/events/store.ts';
import { buildHandlers } from '../src/handlers.ts';
import { CommessaScope } from '../src/portal/scope.ts';
import { TwentyClient } from '../src/twenty/client.ts';
import { FakeTwenty } from './fake-twenty.ts';
import { seedDueCommesse } from './fixture.ts';
import { FakeMailer, makeTestDb, testConfig } from './helpers.ts';

const setup = async () => {
  const db = await makeTestDb();
  const fake = new FakeTwenty();
  const seed = seedDueCommesse(fake);
  const twenty = new TwentyClient(testConfig.TWENTY_URL, testConfig.TWENTY_API_KEY, fake.fetch);
  const mailer = new FakeMailer();
  return { db, fake, seed, twenty, mailer, deps: { db, twenty, mailer, publicUrl: 'http://portale.test' } };
};

describe('notifica di consegna al committente', () => {
  it('invia una volta per referente e segna la consegna come notificata', async () => {
    const { seed, mailer, fake, deps } = await setup();
    expect(await notificaConsegna(deps, seed.cB.id)).toBe('inviata');
    expect(mailer.sent.map((m) => m.to).sort()).toEqual(['marco@alfa-impianti.test', 'ufficio@alfa-impianti.test']);
    expect(mailer.sent[0]!.rendered.text).toContain('Sara Conti');
    expect(fake.db.consegneLead!.get(seed.cB.id)!.notifica).toBe('INVIATA');
  });

  it('un webhook duplicato produce una sola notifica', async () => {
    const { db, seed, mailer, deps } = await setup();
    const handlers = buildHandlers(deps);
    const evt = (n: number) => ({
      dedupKey: `twenty:consegnaLead.created:${seed.cA.id}:${n}`,
      eventId: `consegnaLead.created:${seed.cA.id}`,
      type: 'twenty.webhook',
      version: 1,
      source: 'twenty',
      commessaId: seed.A.id,
      occurredAt: new Date(),
      payload: { objectName: 'consegnaLead', action: 'created', recordId: seed.cA.id },
    });
    expect((await recordEvent(db, evt(1))).inserted).toBe(true);
    expect((await recordEvent(db, evt(1))).inserted).toBe(false); // stesso corpo: scartato all'ingresso
    await recordEvent(db, evt(2)); // riconsegna con corpo diverso: arriva al processore
    await processPending(db, handlers);
    expect(mailer.sent).toHaveLength(1);
  });

  it('un’opposizione sul contatto blocca la notifica', async () => {
    const { seed, fake, mailer, deps } = await setup();
    fake.insert('opposizioni', { valore: 'ferri-arredi.test', tipo: 'DOMINIO', ambito: 'GLOBALE' });
    expect(await notificaConsegna(deps, seed.cA.id)).toBe('bloccata');
    expect(mailer.sent).toHaveLength(0);
    expect(fake.db.consegneLead!.get(seed.cA.id)!.notifica).toBe('BLOCCATA');
  });

  it('un’opposizione limitata a un’altra commessa non blocca', async () => {
    const { seed, fake, deps } = await setup();
    fake.insert('opposizioni', { valore: 'paolo@ferri-arredi.test', tipo: 'EMAIL', ambito: 'COMMESSA', commessaId: seed.B.id });
    expect(await notificaConsegna(deps, seed.cA.id)).toBe('inviata');
  });

  it('commessa in pausa: nessuna notifica', async () => {
    const { seed, fake, mailer, deps } = await setup();
    fake.db.commesse!.get(seed.A.id)!.stato = 'IN_PAUSA';
    expect(await notificaConsegna(deps, seed.cA.id)).toBe('bloccata');
    expect(mailer.sent).toHaveLength(0);
  });

  it('consegna con commessa incoerente rispetto al lead: bloccata', async () => {
    const { seed, fake, deps } = await setup();
    fake.db.consegneLead!.get(seed.cA.id)!.commessaId = seed.B.id; // consegna "dirottata" verso un altro committente
    expect(await notificaConsegna(deps, seed.cA.id)).toBe('bloccata');
  });

  it('errore SMTP: l’evento viene ritentato e l’email parte una volta sola', async () => {
    const { db, seed, mailer, deps } = await setup();
    mailer.failNext = 1;
    const handlers = buildHandlers(deps);
    await recordEvent(db, {
      dedupKey: 'x1', eventId: 'x1', type: 'twenty.webhook', version: 1, source: 'twenty', commessaId: seed.A.id,
      occurredAt: new Date(), payload: { objectName: 'consegnaLead', action: 'created', recordId: seed.cA.id },
    });
    await processPending(db, handlers);
    expect(mailer.sent).toHaveLength(0);
    await db.updateTable('event_log').set({ next_attempt_at: new Date(0) }).execute(); // salta l'attesa
    await processPending(db, handlers);
    await processPending(db, handlers);
    expect(mailer.sent).toHaveLength(1);
  });
});

describe('esito dal portale', () => {
  it('lo stesso invio ripetuto produce un solo record di storico', async () => {
    const { db, twenty, seed, fake } = await setup();
    const scope = new CommessaScope(twenty, seed.A.id);
    const input = { esito: 'ACCETTATO', chiave: '0f6c9a1e-1111' };
    const [a, b] = await Promise.all([
      registraEsito({ db, twenty }, scope, 'giulia@rossi-serramenti.test', seed.cA.id, input),
      registraEsito({ db, twenty }, scope, 'giulia@rossi-serramenti.test', seed.cA.id, input),
    ]);
    expect([a!.stato, b!.stato].sort()).toEqual(['gia_registrato', 'registrato']);
    expect(fake.db.feedbackLeads!.size).toBe(1);
    expect(fake.db.consegneLead!.get(seed.cA.id)!.esito).toBe('ACCETTATO');
  });

  it('il rifiuto richiede un motivo della lista', async () => {
    const { db, twenty, seed } = await setup();
    const scope = new CommessaScope(twenty, seed.A.id);
    await expect(registraEsito({ db, twenty }, scope, 'g', seed.cA.id, { esito: 'RIFIUTATO', chiave: 'k-12345678' })).rejects.toThrow(/motivo/);
    const ok = await registraEsito({ db, twenty }, scope, 'g', seed.cA.id, { esito: 'RIFIUTATO', motivo: 'Fuori target', chiave: 'k-12345679' });
    expect(ok!.esito).toBe('RIFIUTATO');
  });

  it('un esito arrivato in ritardo entra nello storico senza sovrascrivere quello più recente', async () => {
    const { db, twenty, seed, fake } = await setup();
    const scope = new CommessaScope(twenty, seed.A.id);
    fake.db.consegneLead!.get(seed.cA.id)!.esitoAggiornatoIl = '2999-01-01T00:00:00.000Z';
    fake.db.consegneLead!.get(seed.cA.id)!.esito = 'VENDITA';
    await registraEsito({ db, twenty }, scope, 'g', seed.cA.id, { esito: 'ACCETTATO', chiave: 'k-ritardo-1' });
    expect(fake.db.feedbackLeads!.size).toBe(1);
    expect(fake.db.consegneLead!.get(seed.cA.id)!.esito).toBe('VENDITA');
  });
});

describe('outbox degli effetti esterni', () => {
  it('esegue l’effetto una sola volta per chiave operativa, anche in parallelo', async () => {
    const { db } = await setup();
    let calls = 0;
    const run = () =>
      performEffect(db, { operationKey: 'op-1', intent: 't', commessaId: null, payload: {} }, async () => {
        calls++;
        await new Promise((r) => setTimeout(r, 20));
        return { ok: true };
      });
    const results = await Promise.all([run(), run(), run()]);
    expect(calls).toBe(1);
    expect(results.filter((r) => r.status === 'done')).toHaveLength(1);
    expect((await run()).status).toBe('done'); // dopo: restituisce il risultato salvato
    expect(calls).toBe(1);
  });

  it('crash durante l’effetto: lo stato diventa incerto e l’effetto NON viene ripetuto', async () => {
    const { db } = await setup();
    await db
      .insertInto('effect_outbox')
      .values({ operation_key: 'op-crash', intent: 't', commessa_id: null, payload: '{}', status: 'in_flight', last_error: null, result: null, updated_at: new Date(Date.now() - 120_000) })
      .execute();
    expect(await markOrphanedEffectsUncertain(db)).toBe(1);
    let calls = 0;
    const r = await performEffect(db, { operationKey: 'op-crash', intent: 't', commessaId: null, payload: {} }, async () => {
      calls++;
    });
    expect(r.status).toBe('uncertain');
    expect(calls).toBe(0);
  });
});
