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

/**
 * Registri che non si riscrivono (opposizioni, storico esiti): lettura e inserimento, mai cancellazione.
 * Limite verificato su Twenty v2.63: creare un record richiede anche il permesso di modifica
 * (canCreate senza canUpdate → 403). L'immutabilità è quindi garantita dal processo (l'Hub non
 * aggiorna mai questi record) e dall'audit, non dal permesso. Vedi docs/CAPACITA-TWENTY-v2.63.md.
 */
export const soloAggiunta = (objectUniversalIdentifier: string) => ({
  objectUniversalIdentifier,
  canReadAllRecords: true,
  canCreateAllRecords: true,
  canUpdateAllRecords: true,
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
