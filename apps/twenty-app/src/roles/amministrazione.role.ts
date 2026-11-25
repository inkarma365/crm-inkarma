import { defineRole } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { CAMPI_ECONOMICI, lettura, nessuno, scrittura, soloAggiunta } from 'src/roles/permissions';

// Amministrazione: servizi venduti, prezzi e (dall'incremento 4) incassi. Non lavora i lead.
export default defineRole({
  universalIdentifier: ID['role.amministrazione'],
  label: 'Amministrazione',
  description: 'Servizi venduti, condizioni economiche e incassi. Nessun accesso ai lead delle campagne.',
  icon: 'IconCashRegister',
  canBeAssignedToUsers: true,
  canBeAssignedToApiKeys: false,
  canBeAssignedToAgents: false,
  canUpdateAllSettings: false,
  recordsPermissions: {
    canReadAllRecords: true,
    canUpdateAllRecords: false,
    canSoftDeleteAllRecords: false,
    canDestroyAllRecords: false,
    objects: [
      scrittura(ID['commessa']),
      scrittura(ID['servizio']),
      scrittura(ID['servizioCommessa']),
      lettura(ID['mandato']),
      lettura(ID['campagna']),
      nessuno(ID['appartenenza']),
      lettura(ID['consegnaLead']),
      nessuno(ID['feedbackLead']),
      lettura(ID['opposizione']),
    ],
  },
});
