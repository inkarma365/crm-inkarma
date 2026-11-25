// Client REST minimo verso Twenty. Unico contratto d'integrazione: API documentate,
// mai le tabelle interne. Gestisce 429 con attesa e tentativi limitati.
type Json = Record<string, unknown>;

export class TwentyError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export type ListOpts = {
  filter?: string;
  orderBy?: string;
  limit?: number;
  depth?: 0 | 1 | 2;
  startingAfter?: string;
};

export class TwentyClient {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly fetchImpl: typeof fetch;

  constructor(baseUrl: string, apiKey: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  private async request<T>(method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}/rest/${path}`, {
      method,
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 429 && attempt < 4) {
      const wait = Number(res.headers.get('retry-after') ?? 0) * 1000 || 500 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, Math.min(wait, 10_000)));
      return this.request<T>(method, path, body, attempt + 1);
    }
    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) {
      throw new TwentyError(res.status, parsed, `Twenty ${method} ${path.split('?')[0]} → ${res.status}`);
    }
    return parsed as T;
  }

  async list<T = Json>(plural: string, opts: ListOpts = {}): Promise<{ items: T[]; total: number; endCursor: string | null; hasNext: boolean }> {
    const q = new URLSearchParams();
    if (opts.filter) q.set('filter', opts.filter);
    if (opts.orderBy) q.set('order_by', opts.orderBy);
    q.set('limit', String(opts.limit ?? 60));
    if (opts.depth !== undefined) q.set('depth', String(opts.depth));
    if (opts.startingAfter) q.set('starting_after', opts.startingAfter);
    const r = await this.request<{ data: Record<string, T[]>; totalCount: number; pageInfo: { endCursor: string | null; hasNextPage: boolean } }>(
      'GET',
      `${plural}?${q}`,
    );
    return { items: r.data[plural] ?? [], total: r.totalCount, endCursor: r.pageInfo?.endCursor ?? null, hasNext: !!r.pageInfo?.hasNextPage };
  }

  async listAll<T = Json>(plural: string, opts: Omit<ListOpts, 'startingAfter'> = {}, max = 5000): Promise<T[]> {
    const out: T[] = [];
    let after: string | undefined;
    for (;;) {
      const page = await this.list<T>(plural, { ...opts, limit: 60, ...(after ? { startingAfter: after } : {}) });
      out.push(...page.items);
      if (!page.hasNext || !page.endCursor || out.length >= max) return out;
      after = page.endCursor;
    }
  }

  async get<T = Json>(plural: string, singular: string, id: string, depth: 0 | 1 | 2 = 0): Promise<T | null> {
    try {
      const r = await this.request<{ data: Record<string, T> }>('GET', `${plural}/${encodeURIComponent(id)}?depth=${depth}`);
      return r.data[singular] ?? null;
    } catch (e) {
      if (e instanceof TwentyError && (e.status === 404 || e.status === 400)) return null;
      throw e;
    }
  }

  async create<T = Json>(plural: string, singular: string, data: Json): Promise<T> {
    const name = `create${singular[0]!.toUpperCase()}${singular.slice(1)}`;
    const r = await this.request<{ data: Record<string, T> }>('POST', plural, data);
    return (r.data[name] ?? Object.values(r.data)[0]) as T;
  }

  async update<T = Json>(plural: string, singular: string, id: string, data: Json): Promise<T> {
    const name = `update${singular[0]!.toUpperCase()}${singular.slice(1)}`;
    const r = await this.request<{ data: Record<string, T> }>('PATCH', `${plural}/${encodeURIComponent(id)}`, data);
    return (r.data[name] ?? Object.values(r.data)[0]) as T;
  }
}

/** Escape per i valori nei filtri REST di Twenty (es. filter=commessaId[eq]:"…"). */
export const fv = (v: string): string => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
