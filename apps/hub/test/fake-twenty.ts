// Twenty finto, in memoria, per test deterministici dell'Hub.
// Implementa il sottoinsieme REST usato dal TwentyClient: list con filter (eq, in, and, or),
// order_by, depth 1 sulle relazioni note, get, create, update, unique su feedbackLead.eventId.
import { randomUUID } from 'node:crypto';

type Rec = Record<string, unknown> & { id: string };

const SINGULAR: Record<string, string> = {
  companies: 'company',
  people: 'person',
  commesse: 'commessa',
  campagne: 'campagna',
  appartenenze: 'appartenenza',
  consegneLead: 'consegnaLead',
  feedbackLeads: 'feedbackLead',
  opposizioni: 'opposizione',
};
const PLURAL_OF = Object.fromEntries(Object.entries(SINGULAR).map(([p, s]) => [s, p]));
// relazioni espandibili con depth >= 1: campo → collezione
const RELATIONS: Record<string, Record<string, string>> = {
  consegneLead: { persona: 'people', appartenenza: 'appartenenze', commessa: 'commesse' },
  appartenenze: { persona: 'people', campagna: 'campagne', commessa: 'commesse', aziendaProspect: 'companies' },
};

type Pred = (r: Rec) => boolean;

const splitTop = (s: string): string[] => {
  const out: string[] = [];
  let depth = 0, quote = false, cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === '"' && s[i - 1] !== '\\') quote = !quote;
    if (!quote && (ch === '(' || ch === '[')) depth++;
    if (!quote && (ch === ')' || ch === ']')) depth--;
    if (!quote && depth === 0 && ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};

const parseValue = (v: string): unknown => {
  v = v.trim();
  if (v.startsWith('"')) return JSON.parse(v);
  if (v.startsWith('[')) return splitTop(v.slice(1, -1)).map(parseValue);
  if (v === 'true' || v === 'false') return v === 'true';
  if (v === 'NULL') return null;
  return v;
};

export const parseFilter = (f: string): Pred => {
  f = f.trim();
  const m = /^(and|or|not)\((.*)\)$/s.exec(f);
  if (m) {
    const parts = splitTop(m[2]!).map(parseFilter);
    if (m[1] === 'and') return (r) => parts.every((p) => p(r));
    if (m[1] === 'or') return (r) => parts.some((p) => p(r));
    return (r) => !parts[0]!(r);
  }
  const c = /^([a-zA-Z0-9_.]+)\[(eq|neq|in|is)\]:(.*)$/s.exec(f);
  if (!c) throw new Error(`filtro non supportato dal fake: ${f}`);
  const [, field, op, raw] = c;
  const val = parseValue(raw!);
  const get = (r: Rec) => field!.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], r);
  if (op === 'eq') return (r) => get(r) === val;
  if (op === 'neq') return (r) => get(r) !== val;
  if (op === 'in') return (r) => (val as unknown[]).includes(get(r));
  return (r) => (val === null ? get(r) == null : get(r) != null);
};

export class FakeTwenty {
  db: Record<string, Map<string, Rec>> = Object.fromEntries(Object.keys(SINGULAR).map((k) => [k, new Map()]));
  calls: Array<{ method: string; path: string }> = [];
  /** Simula un server che ignora il filtro: serve a provare la difesa in profondità dell'Hub. */
  ignoreFilters = false;

  insert(plural: string, data: Record<string, unknown>): Rec {
    const r: Rec = { id: randomUUID(), createdAt: new Date().toISOString(), ...data } as Rec;
    this.db[plural]!.set(r.id, r);
    return r;
  }

  private expand(plural: string, r: Rec, depth: number): Rec {
    if (depth < 1) return { ...r };
    const out: Rec = { ...r };
    for (const [field, target] of Object.entries(RELATIONS[plural] ?? {})) {
      const id = r[`${field}Id`] as string | undefined;
      out[field] = id ? (this.db[target]!.get(id) ? { ...this.db[target]!.get(id)! } : null) : null;
    }
    return out;
  }

  fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = (init?.method ?? 'GET').toUpperCase();
    const [, , plural, id] = url.pathname.split('/');
    this.calls.push({ method, path: url.pathname + url.search });
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    const table = this.db[plural!];
    if (!table) return json(404, { error: 'oggetto sconosciuto' });
    const singular = SINGULAR[plural!]!;
    const depth = Number(url.searchParams.get('depth') ?? 0);

    if (method === 'GET' && !id) {
      const f = url.searchParams.get('filter');
      let rows = [...table.values()];
      if (f && !this.ignoreFilters) rows = rows.filter(parseFilter(f));
      const limit = Number(url.searchParams.get('limit') ?? 60);
      const after = url.searchParams.get('starting_after');
      let start = 0;
      if (after) start = rows.findIndex((r) => r.id === after) + 1;
      const page = rows.slice(start, start + limit);
      return json(200, {
        data: { [plural!]: page.map((r) => this.expand(plural!, r, depth)) },
        totalCount: rows.length,
        pageInfo: { endCursor: page.at(-1)?.id ?? null, hasNextPage: start + limit < rows.length },
      });
    }
    if (method === 'GET' && id) {
      const r = table.get(id);
      return r ? json(200, { data: { [singular]: this.expand(plural!, r, depth) } }) : json(404, { error: 'not found' });
    }
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    if (method === 'POST') {
      if (plural === 'feedbackLeads' && [...table.values()].some((r) => r.eventId === body.eventId)) {
        return json(400, { messages: ['duplicate key value violates unique constraint'] });
      }
      const r = this.insert(plural!, body);
      return json(201, { data: { [`create${singular[0]!.toUpperCase()}${singular.slice(1)}`]: r } });
    }
    if (method === 'PATCH' && id) {
      const r = table.get(id);
      if (!r) return json(404, { error: 'not found' });
      Object.assign(r, body);
      return json(200, { data: { [`update${singular[0]!.toUpperCase()}${singular.slice(1)}`]: r } });
    }
    return json(405, { error: 'metodo non supportato' });
  };
}

export { PLURAL_OF };
