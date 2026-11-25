import { ID } from 'src/constants/ids';

// Mattoncini per i permessi per oggetto. "nessuno" = l'oggetto non esiste per quel ruolo
// (sparisce da ricerca, viste, export, contatori e API: il controllo è lato server).
export const nessuno = (objectUniversalIdentifier: string) => ({
  objectUniversalIdentifier,
  canReadAllRecords: false,
  canCreateAllRecords: false,
  canUpdateAllRecords: false,
  canSoftDeleteAllRecords: false,
  canDestroyAllRecords: false,
});

export const lettura = (objectUniversalIdentifier: string, extra: Record<string, unknown> = {}) => ({
  objectUniversalIdentifier,
  canReadAllRecords: true,
  canCreateAllRecords: false,
  canUpdateAllRecords: false,
  canSoftDeleteAllRecords: false,
  canDestroyAllRecords: false,
  ...extra,
});

export const scrittura = (objectUniversalIdentifier: string, extra: Record<string, unknown> = {}) => ({
  objectUniversalIdentifier,
  canReadAllRecords: true,
  canCreateAllRecords: true,
  canUpdateAllRecords: true,
  canSoftDeleteAllRecords: false,
  canDestroyAllRecords: false,
  ...extra,
});

/** Solo inserimento + lettura: per registri che non si riscrivono (opposizioni, storico esiti). */
export const soloAggiunta = (objectUniversalIdentifier: string) => ({
  objectUniversalIdentifier,
  canReadAllRecords: true,
  canCreateAllRecords: true,
  canUpdateAllRecords: false,
  canSoftDeleteAllRecords: false,
  canDestroyAllRecords: false,
});

/** Campi economici: visibili solo ad amministrazione, account manager e commerciale. */
export const CAMPI_ECONOMICI = {
  commessa: [ID['commessa.condizioniEconomiche']],
  servizio: [ID['servizio.prezzoListino']],
  servizioCommessa: [ID['servizioCommessa.prezzo']],
  consegnaLead: [ID['consegnaLead.valoreDichiarato']],
};
