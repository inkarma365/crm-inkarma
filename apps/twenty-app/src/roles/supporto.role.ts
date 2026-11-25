import { defineRole } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { CAMPI_ECONOMICI, lettura, soloAggiunta } from 'src/roles/permissions';

// Supporto: gestisce l'assistenza. Vede il contesto della commessa ma non i dati economici.
export default defineRole({
  universalIdentifier: ID['role.supporto'],
  label: 'Supporto',
  description: 'Assistenza clienti. Contesto delle commesse senza dati economici.',
  icon: 'IconLifebuoy',
  canBeAssignedToUsers: true,
  canBeAssignedToApiKeys: false,
  canBeAssignedToAgents: false,
  canUpdateAllSettings: false,
  recordsPermissions: {
    canReadAllRecords: true,
    canUpdateAllRecords: true,
    canSoftDeleteAllRecords: false,
    canDestroyAllRecords: false,
    objects: [
      lettura(ID['commessa'], { unreadableFields: CAMPI_ECONOMICI.commessa }),
      lettura(ID['servizio'], { unreadableFields: CAMPI_ECONOMICI.servizio }),
      lettura(ID['servizioCommessa'], { unreadableFields: CAMPI_ECONOMICI.servizioCommessa }),
      lettura(ID['mandato']),
      lettura(ID['campagna']),
      lettura(ID['appartenenza']),
      lettura(ID['consegnaLead'], { unreadableFields: CAMPI_ECONOMICI.consegnaLead }),
      lettura(ID['feedbackLead']),
      soloAggiunta(ID['opposizione']),
    ],
  },
});
