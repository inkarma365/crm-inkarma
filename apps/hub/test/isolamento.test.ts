// TEST BLOCCANTE (incremento 1): un utente esterno non può consultare l'altra commessa
// usando un ID noto. Se uno di questi test fallisce, il rilascio è bloccato.
import { beforeEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/http/server.ts';
import { TwentyClient } from '../src/twenty/client.ts';
import { syncCommessa } from '../src/handlers.ts';
import { FakeTwenty } from './fake-twenty.ts';
import { seedDueCommesse } from './fixture.ts';
import { FakeMailer, makeTestDb, testConfig, tokenFromMail } from './helpers.ts';

const setup = async () => {
  const db = await makeTestDb();
  const fake = new FakeTwenty();
  const seed = seedDueCommesse(fake);
  const twenty = new TwentyClient(testConfig.TWENTY_URL, testConfig.TWENTY_API_KEY, fake.fetch);
  const mailer = new FakeMailer();
  const deps = { db, twenty, mailer, publicUrl: testConfig.PUBLIC_URL };
  await syncCommessa(deps, seed.A.id);
  await syncCommessa(deps, seed.B.id);
  const app = await buildServer({ config: testConfig, db, twenty, mailer });

  const login = async (email: string) => {
    await app.inject({ method: 'POST', url: '/api/portale/accesso', payload: { email } });
    const mail = mailer.sent.filter((m) => m.to === email).at(-1);
    if (!mail) throw new Error(`nessuna email di accesso per ${email}`);
    const r = await app.inject({ method: 'POST', url: '/api/portale/sessione', payload: { token: tokenFromMail(mail) } });
    expect(r.statusCode).toBe(200);
    const cookie = r.cookies.find((c) => c.name === 'ik_sessione')!;
    return { cookie: `ik_sessione=${cookie.value}` };
  };
  return { db, fake, seed, app, mailer, deps, login };
};

describe('isolamento tra commesse nel portale', () => {
  let ctx: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    ctx = await setup();
  });

  it('la lista mostra solo i lead della propria commessa', async () => {
    const { cookie } = await ctx.login('giulia@rossi-serramenti.test');
    const r = await ctx.app.inject({ method: 'GET', url: '/api/portale/lead', headers: { cookie } });
    expect(r.statusCode).toBe(200);
    const ids = r.json().lead.map((l: { id: string }) => l.id);
    expect(ids).toEqual([ctx.seed.cA.id]);
    expect(JSON.stringify(r.json())).not.toContain('Sara');
  });

  it('un ID noto di un’altra commessa risponde 404, come un ID inesistente', async () => {
    const { cookie } = await ctx.login('giulia@rossi-serramenti.test');
    const altrui = await ctx.app.inject({ method: 'GET', url: `/api/portale/lead/${ctx.seed.cB.id}`, headers: { cookie } });
    const inesistente = await ctx.app.inject({ method: 'GET', url: '/api/portale/lead/7d2c5b1e-0000-4000-8000-000000000000', headers: { cookie } });
    expect(altrui.statusCode).toBe(404);
    expect(inesistente.statusCode).toBe(404);
    expect(altrui.body).toBe(inesistente.body);
  });

  it('non si può registrare un esito su un lead di un’altra commessa', async () => {
    const { cookie } = await ctx.login('giulia@rossi-serramenti.test');
    const r = await ctx.app.inject({
      method: 'POST',
      url: `/api/portale/lead/${ctx.seed.cB.id}/esito`,
      headers: { cookie, 'x-portale': '1' },
      payload: { esito: 'ACCETTATO', chiave: 'abcdef12-3456' },
    });
    expect(r.statusCode).toBe(404);
    expect(ctx.fake.db.feedbackLeads!.size).toBe(0);
    expect(ctx.fake.db.consegneLead!.get(ctx.seed.cB.id)!.esito).toBe('IN_ATTESA');
  });

  it('i contatori sono calcolati solo sui record autorizzati', async () => {
    const { cookie } = await ctx.login('marco@alfa-impianti.test');
    const r = await ctx.app.inject({ method: 'GET', url: '/api/portale/conteggi', headers: { cookie } });
    expect(r.json().conteggi).toEqual({ totale: 1, IN_ATTESA: 1 });
  });

  it('difesa in profondità: anche se il filtro lato Twenty fallisse, i record altrui non escono', async () => {
    const { cookie } = await ctx.login('giulia@rossi-serramenti.test');
    ctx.fake.ignoreFilters = true;
    const lista = await ctx.app.inject({ method: 'GET', url: '/api/portale/lead', headers: { cookie } });
    expect(lista.json().lead.map((l: { id: string }) => l.id)).toEqual([ctx.seed.cA.id]);
    const cont = await ctx.app.inject({ method: 'GET', url: '/api/portale/conteggi', headers: { cookie } });
    expect(cont.json().conteggi.totale).toBe(1);
  });

  it('non si può passare a una commessa di cui non si è referenti', async () => {
    const { cookie } = await ctx.login('giulia@rossi-serramenti.test');
    const r = await ctx.app.inject({
      method: 'POST',
      url: '/api/portale/commessa',
      headers: { cookie, 'x-portale': '1' },
      payload: { commessaId: ctx.seed.B.id },
    });
    expect(r.statusCode).toBe(404);
  });

  it('il dominio email non dà accesso: serve essere referente esplicito della commessa', async () => {
    ctx.mailer.sent = [];
    await ctx.app.inject({ method: 'POST', url: '/api/portale/accesso', payload: { email: 'altro@rossi-serramenti.test' } });
    expect(ctx.mailer.sent).toHaveLength(0);
  });

  it('togliere il referente in Twenty revoca subito la sessione aperta', async () => {
    const { cookie } = await ctx.login('giulia@rossi-serramenti.test');
    ctx.fake.db.commesse!.get(ctx.seed.A.id)!.referenteEmail = { primaryEmail: 'nuovo@rossi-serramenti.test', additionalEmails: [] };
    await syncCommessa(ctx.deps, ctx.seed.A.id);
    const r = await ctx.app.inject({ method: 'GET', url: '/api/portale/lead', headers: { cookie } });
    expect(r.statusCode).toBe(401);
  });

  it('senza sessione nessun dato, e le modifiche richiedono l’header del frontend', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: '/api/portale/lead' })).statusCode).toBe(401);
    const { cookie } = await ctx.login('giulia@rossi-serramenti.test');
    const r = await ctx.app.inject({
      method: 'POST',
      url: `/api/portale/lead/${ctx.seed.cA.id}/esito`,
      headers: { cookie },
      payload: { esito: 'ACCETTATO', chiave: 'abcdef12-3456' },
    });
    expect(r.statusCode).toBe(403);
  });

  it('il link di accesso funziona una sola volta', async () => {
    await ctx.app.inject({ method: 'POST', url: '/api/portale/accesso', payload: { email: 'giulia@rossi-serramenti.test' } });
    const token = tokenFromMail(ctx.mailer.sent.at(-1)!);
    expect((await ctx.app.inject({ method: 'POST', url: '/api/portale/sessione', payload: { token } })).statusCode).toBe(200);
    expect((await ctx.app.inject({ method: 'POST', url: '/api/portale/sessione', payload: { token } })).statusCode).toBe(401);
  });
});
