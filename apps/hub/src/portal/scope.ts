// Repository con ambito commessa: l'UNICO accesso del portale ai dati Twenty.
// Regole:
// 1. la commessa viene dalla sessione, mai dalla richiesta;
// 2. ogni lettura filtra per commessa SUL SERVER (filtro REST) e poi ricontrolla ogni record;
// 3. un record di un'altra commessa è indistinguibile da uno inesistente (stesso 404);
// 4. al portale arrivano solo campi elencati qui (proiezione esplicita), mai il record grezzo.
import { fv, type TwentyClient } from '../twenty/client.ts';

export const ESITI_PORTALE = [
  'ACCETTATO',
  'RIFIUTATO',
  'INCONTRO_FISSATO',
  'INCONTRO_SVOLTO',
  'OPPORTUNITA',
  'VENDITA',
  'PERSO',
] as const;
export type EsitoPortale = (typeof ESITI_PORTALE)[number];

export const MOTIVI_RIFIUTO = [
  'Fuori target',
  'Già nostro cliente',
  'Non raggiungibile',
  'Dati di contatto errati',
  'Duplicato di un lead già ricevuto',
  'Altro',
] as const;

type Emails = { primaryEmail?: string | null; additionalEmails?: string[] | null } | null;
type Phones = { primaryPhoneNumber?: string | null; primaryPhoneCallingCode?: string | null } | null;

type RawPersona = {
  id: string;
  name?: { firstName?: string; lastName?: string } | null;
  emails?: Emails;
  phones?: Phones;
  jobTitle?: string | null;
};

type RawConsegna = {
  id: string;
  commessaId: string | null;
  titolo?: string | null;
  consegnataIl?: string | null;
  esito?: string | null;
  motivoRifiuto?: string | null;
  esitoAggiornatoIl?: string | null;
  esitoDa?: string | null;
  evidenza?: string | null;
  commercialeNome?: string | null;
  personaId?: string | null;
  appartenenzaId?: string | null;
  persona?: RawPersona | null;
  appartenenza?: { id: string; aziendaProspectId?: string | null; campagnaId?: string | null } | null;
};

type RawFeedback = {
  id: string;
  esito?: string | null;
  motivo?: string | null;
  autore?: string | null;
  canale?: string | null;
  ricevutoIl?: string | null;
  tardivo?: boolean | null;
  consegnaId?: string | null;
  commessaId?: string | null;
};

export type PortalLead = {
  id: string;
  nome: string;
  ruolo: string | null;
  azienda: string | null;
  email: string | null;
  telefono: string | null;
  evidenza: string | null;
  campagna: string | null;
  commerciale: string | null;
  consegnatoIl: string | null;
  esito: string;
  motivoRifiuto: string | null;
  esitoAggiornatoIl: string | null;
  esitoDa: string | null;
};

export type PortalLeadDetail = PortalLead & {
  storico: Array<{ esito: string; motivo: string | null; autore: string | null; canale: string | null; ricevutoIl: string | null; tardivo: boolean }>;
};

const fullName = (p?: RawPersona | null) =>
  [p?.name?.firstName, p?.name?.lastName].filter(Boolean).join(' ').trim() || 'Contatto senza nome';

const phone = (p?: Phones) =>
  p?.primaryPhoneNumber ? `${p.primaryPhoneCallingCode ?? ''} ${p.primaryPhoneNumber}`.trim() : null;

export class CommessaScope {
  readonly twenty: TwentyClient;
  readonly commessaId: string;

  constructor(twenty: TwentyClient, commessaId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(commessaId)) throw new Error('ambito commessa non valido');
    this.twenty = twenty;
    this.commessaId = commessaId;
  }

  private belongs(r: { commessaId?: string | null } | null | undefined): boolean {
    return !!r && r.commessaId === this.commessaId;
  }

  private async lookups(items: RawConsegna[]) {
    const aziendaIds = [...new Set(items.map((c) => c.appartenenza?.aziendaProspectId).filter((x): x is string => !!x))];
    const campagnaIds = [...new Set(items.map((c) => c.appartenenza?.campagnaId).filter((x): x is string => !!x))];
    const aziende = new Map<string, string>();
    const campagne = new Map<string, string>();
    for (let i = 0; i < aziendaIds.length; i += 50) {
      const chunk = aziendaIds.slice(i, i + 50);
      const r = await this.twenty.list<{ id: string; name: string }>('companies', {
        filter: `id[in]:[${chunk.map(fv).join(',')}]`,
        limit: 60,
      });
      for (const c of r.items) aziende.set(c.id, c.name);
    }
    if (campagnaIds.length) {
      // Le campagne si leggono SOLO dentro la commessa della sessione.
      const r = await this.twenty.list<{ id: string; nome: string; commessaId: string }>('campagne', {
        filter: `and(commessaId[eq]:${fv(this.commessaId)},id[in]:[${campagnaIds.map(fv).join(',')}])`,
        limit: 60,
      });
      for (const c of r.items) if (this.belongs(c)) campagne.set(c.id, c.nome);
    }
    return { aziende, campagne };
  }

  private project(c: RawConsegna, l: { aziende: Map<string, string>; campagne: Map<string, string> }): PortalLead {
    const aziendaId = c.appartenenza?.aziendaProspectId;
    const campagnaId = c.appartenenza?.campagnaId;
    return {
      id: c.id,
      nome: fullName(c.persona),
      ruolo: c.persona?.jobTitle || null,
      azienda: aziendaId ? (l.aziende.get(aziendaId) ?? null) : null,
      email: c.persona?.emails?.primaryEmail || null,
      telefono: phone(c.persona?.phones),
      evidenza: c.evidenza || null,
      campagna: campagnaId ? (l.campagne.get(campagnaId) ?? null) : null,
      commerciale: c.commercialeNome || null,
      consegnatoIl: c.consegnataIl ?? null,
      esito: c.esito ?? 'IN_ATTESA',
      motivoRifiuto: c.motivoRifiuto ?? null,
      esitoAggiornatoIl: c.esitoAggiornatoIl ?? null,
      esitoDa: c.esitoDa ?? null,
    };
  }

  async listLead(opts: { soloInAttesa?: boolean } = {}): Promise<PortalLead[]> {
    const conds = [`commessaId[eq]:${fv(this.commessaId)}`];
    if (opts.soloInAttesa) conds.push(`esito[eq]:"IN_ATTESA"`);
    const filter = conds.length > 1 ? `and(${conds.join(',')})` : conds[0]!;
    const items = (await this.twenty.listAll<RawConsegna>('consegneLead', { filter, depth: 1, orderBy: 'consegnataIl[DescNullsLast]' }, 2000)).filter(
      (c) => this.belongs(c),
    );
    const l = await this.lookups(items);
    return items.map((c) => this.project(c, l));
  }

  /** null se inesistente O di un'altra commessa: il chiamante risponde 404 in entrambi i casi. */
  async getConsegnaRaw(id: string): Promise<RawConsegna | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const c = await this.twenty.get<RawConsegna>('consegneLead', 'consegnaLead', id, 1);
    return this.belongs(c) ? c : null;
  }

  async getLead(id: string): Promise<PortalLeadDetail | null> {
    const c = await this.getConsegnaRaw(id);
    if (!c) return null;
    const l = await this.lookups([c]);
    const storico = await this.twenty.list<RawFeedback>('feedbackLeads', {
      filter: `and(consegnaId[eq]:${fv(c.id)},commessaId[eq]:${fv(this.commessaId)})`,
      orderBy: 'ricevutoIl[DescNullsLast]',
      limit: 60,
    });
    return {
      ...this.project(c, l),
      storico: storico.items
        .filter((f) => f.commessaId === this.commessaId)
        .map((f) => ({
          esito: f.esito ?? 'IN_ATTESA',
          motivo: f.motivo ?? null,
          autore: f.autore ?? null,
          canale: f.canale ?? null,
          ricevutoIl: f.ricevutoIl ?? null,
          tardivo: !!f.tardivo,
        })),
    };
  }

  /** Contatori calcolati sul server sugli stessi record autorizzati della lista. */
  async conteggi(): Promise<Record<string, number>> {
    const items = await this.twenty.listAll<{ esito: string; commessaId: string }>(
      'consegneLead',
      { filter: `commessaId[eq]:${fv(this.commessaId)}` },
      5000,
    );
    const out: Record<string, number> = { totale: 0 };
    for (const c of items) {
      if (!this.belongs(c)) continue;
      out.totale!++;
      out[c.esito] = (out[c.esito] ?? 0) + 1;
    }
    return out;
  }
}
