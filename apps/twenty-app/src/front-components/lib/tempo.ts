// Tempo relativo in italiano, nel fuso di Roma. Niente librerie: il bundle gira in un worker.
const fmtData = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' });
const fmtOra = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

export const data = (iso?: string | null) => (iso ? fmtData.format(new Date(iso)) : '');
export const dataOra = (iso?: string | null) => (iso ? fmtOra.format(new Date(iso)) : '');

/** "tra 3 ore", "scaduto da 2 giorni", "oggi". */
export const relativo = (iso?: string | null, ora = Date.now()): { testo: string; scaduto: boolean } => {
  if (!iso) return { testo: '', scaduto: false };
  const diff = new Date(iso).getTime() - ora;
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60_000);
  const ore = Math.round(abs / 3_600_000);
  const giorni = Math.round(abs / 86_400_000);
  const quanto = min < 60 ? `${min} min` : ore < 36 ? `${ore} ${ore === 1 ? 'ora' : 'ore'}` : `${giorni} giorni`;
  return diff >= 0 ? { testo: `tra ${quanto}`, scaduto: false } : { testo: `scaduto da ${quanto}`, scaduto: true };
};

export const giorniFa = (iso?: string | null, ora = Date.now()) => (iso ? Math.floor((ora - new Date(iso).getTime()) / 86_400_000) : 0);
