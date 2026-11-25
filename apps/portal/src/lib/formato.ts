import type { Esito } from './tipi.ts';

const TZ = 'Europe/Rome';
const giornoMese = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: TZ });
const dataLunga = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
const dataOra = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ });

export const breve = (iso: string | null) => (iso ? giornoMese.format(new Date(iso)) : '');
export const lunga = (iso: string | null) => (iso ? dataLunga.format(new Date(iso)) : '');
export const conOra = (iso: string | null) => (iso ? dataOra.format(new Date(iso)) : '');

/** Come il cliente legge ciascun esito (punto di vista del committente, non del CRM). */
export const ETICHETTA: Record<Esito, string> = {
  IN_ATTESA: 'Aspetta il tuo esito',
  ACCETTATO: 'Accettato',
  RIFIUTATO: 'Non in target',
  INCONTRO_FISSATO: 'Incontro fissato',
  INCONTRO_SVOLTO: 'Incontro svolto',
  OPPORTUNITA: 'Trattativa aperta',
  VENDITA: 'Venduto',
  PERSO: 'Perso',
};

export type Tono = 'attesa' | 'si' | 'no' | 'avanzamento';
export const TONO: Record<Esito, Tono> = {
  IN_ATTESA: 'attesa',
  ACCETTATO: 'si',
  RIFIUTATO: 'no',
  INCONTRO_FISSATO: 'avanzamento',
  INCONTRO_SVOLTO: 'avanzamento',
  OPPORTUNITA: 'avanzamento',
  VENDITA: 'si',
  PERSO: 'no',
};

/** Passi successivi proponibili dopo l'accettazione, nell'ordine in cui avvengono. */
export const AVANZAMENTI: Esito[] = ['INCONTRO_FISSATO', 'INCONTRO_SVOLTO', 'OPPORTUNITA', 'VENDITA', 'PERSO'];

export const chiDaEmail = (email: string | null) => (email ? email.split('@')[0]!.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');
