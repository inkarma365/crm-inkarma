import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { z } from 'zod';
import type { Config } from '../config.ts';
import type { Db } from '../db/index.ts';
import { recordEvent } from '../events/store.ts';
import { performEffect } from '../effects/outbox.ts';
import { audit } from '../lib/audit.ts';
import { sha256 } from '../lib/crypto.ts';
import type { ServiceMailer } from '../notify/mailer.ts';
import { accessoPortaleV1 } from '../notify/templates.ts';
import {
  activeMemberships,
  issueLoginToken,
  LOGIN_TOKEN_TTL_MIN,
  redeemLoginToken,
  resolveSession,
  revokeSession,
  SESSION_TTL_H,
  switchCommessa,
  type Session,
} from '../portal/auth.ts';
import { CommessaScope, ESITI_PORTALE, MOTIVI_RIFIUTO } from '../portal/scope.ts';
import { InputError, registraEsito } from '../domain/consegne.ts';
import type { TwentyClient } from '../twenty/client.ts';
import { parseTwentyWebhook, verifyTwentyWebhook } from '../twenty/webhook.ts';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string;
    session?: Session;
  }
}

export type Deps = { config: Config; db: Db; twenty: TwentyClient; mailer: ServiceMailer; wake?: () => void };

const COOKIE = 'ik_sessione';
const NOT_FOUND = { errore: 'Non trovato' } as const;

export const buildServer = async (deps: Deps) => {
  const { config, db, twenty, mailer } = deps;
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : { level: 'info', redact: ['req.headers.cookie', 'req.headers.authorization'] },
    trustProxy: true,
    bodyLimit: 256 * 1024,
  });

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    req.rawBody = body as string;
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch {
      done(Object.assign(new Error('JSON non valido'), { statusCode: 400 }), undefined);
    }
  });

  await app.register(cookie);
  await app.register(rateLimit, {
    global: false,
    // Risposta nello stesso formato degli altri errori del portale, in italiano e con l'azione da fare.
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      errore: `Troppe richieste in poco tempo. Riprova tra ${Math.max(1, Math.ceil(ctx.ttl / 60_000))} minuti.`,
    }),
  });

  app.get('/healthz', { logLevel: 'warn' }, async () => ({ ok: true }));

  // ---------- Webhook Twenty: verifica firma, registra in modo durevole, risponde subito ----------
  app.post('/webhooks/twenty', async (req, reply) => {
    const check = verifyTwentyWebhook(
      config.TWENTY_WEBHOOK_SECRET,
      req.rawBody ?? '',
      req.headers['x-twenty-webhook-signature'] as string | undefined,
      req.headers['x-twenty-webhook-timestamp'] as string | undefined,
    );
    if (!check.ok) {
      await audit(db, { actor: 'twenty-webhook', action: 'webhook.ricevuto', commessaId: null, target: null, outcome: 'negato', details: { motivo: check.reason } });
      return reply.code(401).send({ errore: check.reason });
    }
    const w = parseTwentyWebhook(req.body);
    const commessaId =
      w.objectName === 'commessa' ? w.recordId : typeof w.record.commessaId === 'string' ? (w.record.commessaId as string) : null;
    const { inserted } = await recordEvent(db, {
      // Riconsegne dello stesso evento: stesso eventId Twenty (o, in mancanza, stesso corpo).
      dedupKey: w.eventId ? `twenty:${w.eventId}` : `twenty:${w.eventName}:${w.recordId}:${sha256(req.rawBody ?? '')}`,
      eventId: `${w.eventName}:${w.recordId}`,
      type: 'twenty.webhook',
      version: 1,
      source: 'twenty',
      commessaId,
      occurredAt: w.eventDate,
      payload: {
        eventName: w.eventName,
        objectName: w.objectName,
        action: w.action,
        recordId: w.recordId,
        ...(w.eventName ? {} : { chiaviCorpo: w.keys }),
      },
    });
    if (inserted) deps.wake?.();
    return reply.code(200).send({ ricevuto: true, duplicato: !inserted });
  });

  // ---------- Portale: autenticazione ----------
  const requireSession = async (req: FastifyRequest, reply: FastifyReply) => {
    const s = await resolveSession(db, req.cookies[COOKIE]);
    if (!s) return reply.code(401).send({ errore: 'Sessione scaduta: accedi di nuovo' });
    // Protezione CSRF: le richieste che modificano dati devono arrivare dal nostro frontend.
    if (req.method !== 'GET' && req.headers['x-portale'] !== '1') return reply.code(403).send({ errore: 'Richiesta non consentita' });
    req.session = s;
  };

  const setSessionCookie = (reply: FastifyReply, token: string) =>
    reply.setCookie(COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.NODE_ENV === 'production',
      maxAge: SESSION_TTL_H * 3600,
    });

  app.post(
    '/api/portale/accesso',
    { config: { rateLimit: { max: config.PORTALE_ACCESSI_MAX_IP, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const body = z.object({ email: z.email() }).safeParse(req.body);
      if (!body.success) return reply.code(400).send({ errore: 'Inserisci un indirizzo email valido' });
      const email = body.data.email.toLowerCase();
      const recent = await db
        .selectFrom('portal_login_token as t')
        .innerJoin('portal_user as u', 'u.id', 't.user_id')
        .select((eb) => eb.fn.countAll<string>().as('n'))
        .where('u.email', '=', email)
        .where('t.created_at', '>', new Date(Date.now() - 15 * 60_000))
        .executeTakeFirst();
      if (Number(recent?.n ?? 0) < config.PORTALE_ACCESSI_MAX_EMAIL) {
        const issued = await issueLoginToken(db, email);
        if (issued) {
          const link = `${config.PUBLIC_URL}/portale/accedi#t=${issued.token}`;
          await performEffect(
            db,
            { operationKey: `email:accesso:${sha256(issued.token)}`, intent: 'email.accesso-portale', commessaId: null, payload: { userId: issued.user.id } },
            () =>
              mailer.send({
                to: issued.user.email,
                operationKey: `accesso.${sha256(issued.token).slice(0, 24)}`,
                rendered: accessoPortaleV1({ nome: issued.user.nome, link, scadenzaMinuti: LOGIN_TOKEN_TTL_MIN }),
              }),
          );
        }
        await audit(db, { actor: email, action: 'portale.accesso.richiesta', commessaId: null, target: null, outcome: issued ? 'ok' : 'negato' });
      }
      // Stessa risposta in ogni caso: il portale non rivela quali email sono registrate.
      return reply.code(202).send({ messaggio: 'Se l’indirizzo è abilitato, riceverai un link di accesso entro pochi minuti.' });
    },
  );

  app.post('/api/portale/sessione', { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const body = z.object({ token: z.string().min(20).max(200) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ errore: 'Link non valido' });
    const r = await redeemLoginToken(db, body.data.token);
    if (!r) return reply.code(401).send({ errore: 'Il link è scaduto o è già stato usato. Chiedine uno nuovo.' });
    setSessionCookie(reply, r.sessionToken);
    await audit(db, { actor: r.userId, action: 'portale.sessione.aperta', commessaId: r.commessaId, target: null, outcome: 'ok' });
    return { ok: true };
  });

  app.post('/api/portale/esci', { preHandler: requireSession }, async (req, reply) => {
    await revokeSession(db, req.session!.idHash);
    reply.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/api/portale/io', { preHandler: requireSession }, async (req) => {
    const s = req.session!;
    return {
      email: s.email,
      nome: s.nome,
      commessa: { id: s.commessaId, nome: s.commessaNome },
      commesse: (await activeMemberships(db, s.userId)).map((m) => ({ id: m.commessaId, nome: m.commessaNome })),
      motiviRifiuto: MOTIVI_RIFIUTO,
      esiti: ESITI_PORTALE,
    };
  });

  app.post('/api/portale/commessa', { preHandler: requireSession }, async (req, reply) => {
    const body = z.object({ commessaId: z.uuid() }).safeParse(req.body);
    if (!body.success || !(await switchCommessa(db, req.session!, body.data.commessaId))) return reply.code(404).send(NOT_FOUND);
    return { ok: true };
  });

  // ---------- Portale: lead consegnati (sempre dentro la commessa della sessione) ----------
  const scopeOf = (req: FastifyRequest) => new CommessaScope(twenty, req.session!.commessaId);

  app.get('/api/portale/lead', { preHandler: requireSession }, async (req) => {
    const q = z.object({ vista: z.enum(['da_valutare', 'tutti']).default('tutti') }).parse(req.query);
    return { lead: await scopeOf(req).listLead({ soloInAttesa: q.vista === 'da_valutare' }) };
  });

  app.get('/api/portale/lead/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const lead = await scopeOf(req).getLead(id);
    if (!lead) {
      await audit(db, { actor: req.session!.email, action: 'portale.lead.lettura', commessaId: req.session!.commessaId, target: id, outcome: 'negato' });
      return reply.code(404).send(NOT_FOUND);
    }
    return { lead };
  });

  app.post('/api/portale/lead/:id/esito', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({ esito: z.string(), motivo: z.string().max(80).nullish(), nota: z.string().max(300).nullish(), chiave: z.string() })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ errore: 'Dati mancanti' });
    if (req.session!.ruolo !== 'referente') return reply.code(403).send({ errore: 'Il tuo accesso è in sola lettura' });
    try {
      const r = await registraEsito({ db, twenty }, scopeOf(req), req.session!.email, id, body.data);
      if (!r) {
        await audit(db, { actor: req.session!.email, action: 'portale.esito', commessaId: req.session!.commessaId, target: id, outcome: 'negato' });
        return reply.code(404).send(NOT_FOUND);
      }
      return r;
    } catch (e) {
      if (e instanceof InputError) return reply.code(400).send({ errore: e.message });
      throw e;
    }
  });

  app.get('/api/portale/conteggi', { preHandler: requireSession }, async (req) => ({ conteggi: await scopeOf(req).conteggi() }));

  // ---------- SPA del portale ----------
  const dist = resolve(config.PORTAL_DIST_DIR);
  if (existsSync(dist)) {
    await app.register(fastifyStatic, { root: dist, prefix: '/portale/', wildcard: false, index: false, maxAge: '1h' });
    const sendIndex = (_req: FastifyRequest, reply: FastifyReply) =>
      reply.header('cache-control', 'no-store').sendFile('index.html', dist, { maxAge: 0 });
    app.get('/portale', sendIndex);
    app.get('/portale/*', (req, reply) => {
      // File con estensione non trovati → 404; tutto il resto è una rotta della SPA.
      if (/\.[a-z0-9]{2,5}$/i.test(req.url.split('?')[0]!)) return reply.code(404).send(NOT_FOUND);
      return sendIndex(req, reply);
    });
    app.get('/', (_req, reply) => reply.redirect('/portale'));
  }

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'errore non gestito');
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) return reply.code(status).send({ errore: err instanceof Error ? err.message : 'Richiesta non valida' });
    return reply.code(500).send({ errore: 'Errore interno: riprova tra qualche minuto' });
  });

  return app;
};
