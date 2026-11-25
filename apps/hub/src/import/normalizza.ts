import { promises as dns } from 'node:dns';
import type { Campo, Mappatura } from './mappa.ts';

export type RigaNormalizzata = {
  email: string | null;
  nome: string;
  cognome: string;
  azienda: string | null;
  ruolo: string | null;
  telefono: string | null;
  sito: string | null;
  citta: string | null;
  settore: string | null;
  evidenza: string | null;
  errori: string[];
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export const normalizzaEmail = (v: string | null | undefined) => (v ? v.trim().toLowerCase().replace(/^mailto:/, '') : '') || null;

/** Telefono italiano in forma +39…; numeri esteri con prefisso restano come sono. */
export const normalizzaTelefono = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const s = v.replace(/[^\d+]/g, '');
  if (!s) return null;
  if (s.startsWith('+')) return s;
  if (s.startsWith('0039')) return `+39${s.slice(4)}`;
  if (/^(3\d{8,9}|0\d{5,10})$/.test(s)) return `+39${s}`;
  return s;
};

export const normalizza = (mappa: Mappatura, riga: string[]): RigaNormalizzata => {
  const val = (c: Campo) => {
    const i = mappa.findIndex((m) => m.campo === c);
    return i >= 0 ? (riga[i] ?? '').trim() : '';
  };
  let nome = val('nome');
  let cognome = val('cognome');
  const completo = val('nomeCompleto');
  if (!nome && !cognome && completo) {
    const parti = completo.split(/\s+/);
    nome = parti.shift() ?? '';
    cognome = parti.join(' ');
  }
  const emailRaw = normalizzaEmail(val('email'));
  const errori: string[] = [];
  const email = emailRaw && EMAIL.test(emailRaw) ? emailRaw : null;
  if (emailRaw && !email) errori.push(`Email non valida: "${val('email')}"`);
  const telefono = normalizzaTelefono(val('telefono'));
  if (!email && !telefono) errori.push('Manca un contatto: serve almeno email o telefono');
  if (!nome && !cognome && !val('azienda')) errori.push('Manca il nome della persona o dell’azienda');
  return {
    email,
    nome,
    cognome,
    azienda: val('azienda') || null,
    ruolo: val('ruolo') || null,
    telefono,
    sito: val('sito') || null,
    citta: val('citta') || null,
    settore: val('settore') || null,
    evidenza: val('evidenza') || null,
    errori,
  };
};

/** Segnale tecnico sul dominio (non una qualifica commerciale): ha record MX? Con cache e timeout. */
export const creaVerificaMx = (resolve: (d: string) => Promise<unknown[]> = (d) => dns.resolveMx(d)) => {
  const cache = new Map<string, Promise<'VALIDO' | 'ASSENTE' | 'NON_VERIFICATO'>>();
  return (email: string | null) => {
    const dominio = email?.split('@')[1];
    if (!dominio) return Promise.resolve('NON_VERIFICATO' as const);
    if (!cache.has(dominio)) {
      cache.set(
        dominio,
        Promise.race([
          resolve(dominio).then((r) => (r.length ? ('VALIDO' as const) : ('ASSENTE' as const))),
          new Promise<'NON_VERIFICATO'>((ok) => setTimeout(() => ok('NON_VERIFICATO'), 4000)),
        ]).catch((e: NodeJS.ErrnoException) => (e?.code === 'ENOTFOUND' || e?.code === 'ENODATA' ? ('ASSENTE' as const) : ('NON_VERIFICATO' as const))),
      );
    }
    return cache.get(dominio)!;
  };
};
