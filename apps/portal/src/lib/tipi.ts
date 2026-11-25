export type Esito =
  | 'IN_ATTESA'
  | 'ACCETTATO'
  | 'RIFIUTATO'
  | 'INCONTRO_FISSATO'
  | 'INCONTRO_SVOLTO'
  | 'OPPORTUNITA'
  | 'VENDITA'
  | 'PERSO';

export type Lead = {
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
  esito: Esito;
  motivoRifiuto: string | null;
  esitoAggiornatoIl: string | null;
  esitoDa: string | null;
};

export type LeadDettaglio = Lead & {
  storico: Array<{ esito: Esito; motivo: string | null; autore: string | null; canale: string | null; ricevutoIl: string | null; tardivo: boolean }>;
};

export type Io = {
  email: string;
  nome: string;
  commessa: { id: string; nome: string };
  commesse: Array<{ id: string; nome: string }>;
  motiviRifiuto: string[];
  esiti: Esito[];
};
