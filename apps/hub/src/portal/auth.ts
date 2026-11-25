// Accesso al portale con link monouso via email e sessioni lato server.
// Le appartenenze utente↔commessa derivano solo dal campo esplicito "Email referente cliente"
// della commessa in Twenty (gestito dall'agenzia), mai dal dominio dell'email.
import type { Db } from '../db/index.ts';
import { newToken, sha256 } from '../lib/crypto.ts';

export const LOGIN_TOKEN_TTL_MIN = 20;
export const SESSION_TTL_H = 12;

export const normEmail = (e: string) => e.trim().toLowerCase();

export type Membership = { commessaId: string; commessaNome: string; ruolo: 'referente' | 'lettore' };

export const activeMemberships = async (db: Db, userId: string): Promise<Membership[]> =>
  (
    await db
      .selectFrom('portal_membership')
      .select(['commessa_id', 'commessa_nome', 'ruolo'])
      .where('user_id', '=', userId)
      .where('revoked_at', 'is', null)
      .orderBy('commessa_nome')
      .execute()
  ).map((m) => ({ commessaId: m.commessa_id, commessaNome: m.commessa_nome, ruolo: m.ruolo }));

/** Crea un token di accesso se l'utente esiste ed è attivo con almeno una commessa. */
export const issueLoginToken = async (db: Db, email: string): Promise<{ token: string; user: { id: string; nome: string; email: string } } | null> => {
  const user = await db
    .selectFrom('portal_user')
    .select(['id', 'display_name', 'email'])
    .where('email', '=', normEmail(email))
    .where('disabled_at', 'is', null)
    .executeTakeFirst();
  if (!user) return null;
  if ((await activeMemberships(db, user.id)).length === 0) return null;
  const token = newToken();
  await db
    .insertInto('portal_login_token')
    .values({ token_hash: sha256(token), user_id: user.id, expires_at: new Date(Date.now() + LOGIN_TOKEN_TTL_MIN * 60_000), used_at: null })
    .execute();
  return { token, user: { id: user.id, nome: user.display_name, email: user.email } };
};

/** Consuma il token (una sola volta) e apre una sessione sulla prima commessa attiva. */
export const redeemLoginToken = async (db: Db, token: string): Promise<{ sessionToken: string; userId: string; commessaId: string } | null> => {
  return db.transaction().execute(async (trx) => {
    const row = await trx
      .updateTable('portal_login_token')
      .set({ used_at: new Date() })
      .where('token_hash', '=', sha256(token))
      .where('used_at', 'is', null)
      .where('expires_at', '>', new Date())
      .returning(['user_id'])
      .executeTakeFirst();
    if (!row) return null;
    const m = await trx
      .selectFrom('portal_membership')
      .select('commessa_id')
      .where('user_id', '=', row.user_id)
      .where('revoked_at', 'is', null)
      .orderBy('commessa_nome')
      .executeTakeFirst();
    if (!m) return null;
    const sessionToken = newToken();
    await trx
      .insertInto('portal_session')
      .values({
        id_hash: sha256(sessionToken),
        user_id: row.user_id,
        commessa_id: m.commessa_id,
        expires_at: new Date(Date.now() + SESSION_TTL_H * 3600_000),
        revoked_at: null,
      })
      .execute();
    return { sessionToken, userId: row.user_id, commessaId: m.commessa_id };
  });
};

export type Session = {
  idHash: string;
  userId: string;
  email: string;
  nome: string;
  commessaId: string;
  commessaNome: string;
  ruolo: 'referente' | 'lettore';
};

/**
 * Risolve la sessione E ricontrolla ad ogni richiesta che l'appartenenza alla commessa sia
 * ancora attiva: una revoca in Twenty ha effetto immediato, senza attendere la scadenza.
 */
export const resolveSession = async (db: Db, sessionToken: string | undefined): Promise<Session | null> => {
  if (!sessionToken) return null;
  const r = await db
    .selectFrom('portal_session as s')
    .innerJoin('portal_user as u', 'u.id', 's.user_id')
    .innerJoin('portal_membership as m', (j) => j.onRef('m.user_id', '=', 's.user_id').onRef('m.commessa_id', '=', 's.commessa_id'))
    .select(['s.id_hash', 's.user_id', 'u.email', 'u.display_name', 's.commessa_id', 'm.commessa_nome', 'm.ruolo'])
    .where('s.id_hash', '=', sha256(sessionToken))
    .where('s.revoked_at', 'is', null)
    .where('s.expires_at', '>', new Date())
    .where('u.disabled_at', 'is', null)
    .where('m.revoked_at', 'is', null)
    .executeTakeFirst();
  if (!r) return null;
  return {
    idHash: r.id_hash,
    userId: r.user_id,
    email: r.email,
    nome: r.display_name,
    commessaId: r.commessa_id,
    commessaNome: r.commessa_nome,
    ruolo: r.ruolo,
  };
};

export const switchCommessa = async (db: Db, s: Session, commessaId: string): Promise<boolean> => {
  const m = await db
    .selectFrom('portal_membership')
    .select('commessa_id')
    .where('user_id', '=', s.userId)
    .where('commessa_id', '=', commessaId)
    .where('revoked_at', 'is', null)
    .executeTakeFirst();
  if (!m) return false;
  await db.updateTable('portal_session').set({ commessa_id: commessaId }).where('id_hash', '=', s.idHash).execute();
  return true;
};

export const revokeSession = async (db: Db, idHash: string) =>
  db.updateTable('portal_session').set({ revoked_at: new Date() }).where('id_hash', '=', idHash).execute();

/**
 * Allinea utenti e appartenenze del portale a una commessa Twenty.
 * Chi non compare più tra le email referente perde l'accesso subito (revoked_at).
 */
export const syncCommessaMembers = async (
  db: Db,
  commessa: { id: string; nome: string; stato: string | null; emails: string[] },
  actor: string,
): Promise<{ added: string[]; revoked: number }> => {
  const wanted = commessa.stato === 'CHIUSA' ? [] : [...new Set(commessa.emails.map(normEmail).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))];
  const added: string[] = [];
  let revoked = 0;
  await db.transaction().execute(async (trx) => {
    for (const email of wanted) {
      const u = await trx
        .insertInto('portal_user')
        .values({ email, display_name: email.split('@')[0]!, disabled_at: null })
        .onConflict((oc) => oc.column('email').doUpdateSet({ email }))
        .returning('id')
        .executeTakeFirstOrThrow();
      const m = await trx
        .insertInto('portal_membership')
        .values({ user_id: u.id, commessa_id: commessa.id, commessa_nome: commessa.nome, ruolo: 'referente', granted_by: actor, revoked_at: null })
        .onConflict((oc) =>
          oc.columns(['user_id', 'commessa_id']).doUpdateSet({ commessa_nome: commessa.nome, revoked_at: null, granted_by: actor }),
        )
        .returning('granted_at')
        .executeTakeFirst();
      if (m) added.push(email);
    }
    const keepIds = wanted.length
      ? (await trx.selectFrom('portal_user').select('id').where('email', 'in', wanted).execute()).map((r) => r.id)
      : [];
    let q = trx
      .updateTable('portal_membership')
      .set({ revoked_at: new Date() })
      .where('commessa_id', '=', commessa.id)
      .where('revoked_at', 'is', null);
    if (keepIds.length) q = q.where('user_id', 'not in', keepIds);
    const res = await q.executeTakeFirst();
    revoked = Number(res.numUpdatedRows);
  });
  return { added, revoked };
};
