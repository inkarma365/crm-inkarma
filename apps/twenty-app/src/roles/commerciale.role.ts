import { defineRole } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { lettura, nessuno, scrittura } from 'src/roles/permissions';

// Commerciale dell'agenzia: lavora la pipeline di vendita dei servizi inKarma.
// Non vede i lead generati per i committenti (sono dati dei clienti, non dell'agenzia).
export default defineRole({
  universalIdentifier: ID['role.commerciale'],
  label: 'Commerciale agenzia',
  description: "Pipeline di vendita dell'agenzia. Nessun accesso ai lead delle campagne dei committenti.",
  icon: 'IconUserDollar',
  canBeAssignedToUsers: true,
  canBeAssignedToApiKeys: false,
  canBeAssignedToAgents: false,
  canUpdateAllSettings: false,
  recordsPermissions: {
    canReadAllRecords: true,
    canUpdateAllRecords: true,
    canSoftDeleteAllRecords: true,
    canDestroyAllRecords: false,
    objects: [
      lettura(ID['commessa']),
      lettura(ID['servizio']),
      scrittura(ID['servizioCommessa']),
      nessuno(ID['mandato']),
      nessuno(ID['campagna']),
      nessuno(ID['appartenenza']),
      nessuno(ID['consegnaLead']),
      nessuno(ID['feedbackLead']),
      lettura(ID['opposizione']),
    ],
  },
});
