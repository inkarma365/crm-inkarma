import { defineRole } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { CAMPI_ECONOMICI, lettura, nessuno, scrittura, soloAggiunta } from 'src/roles/permissions';

// Servizio Hub (solo API key): orchestrazione, import, portale clienti.
// Scrive ma non cancella definitivamente; non tocca impostazioni, ruoli o modello dati.
export default defineRole({
  universalIdentifier: ID['role.hub'],
  label: 'Servizio Hub',
  description: 'Identità tecnica del servizio Hub. Assegnabile solo a API key.',
  icon: 'IconPlugConnected',
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: true,
  canBeAssignedToAgents: false,
  canUpdateAllSettings: false,
  recordsPermissions: {
    canReadAllRecords: true,
    canUpdateAllRecords: true,
    canSoftDeleteAllRecords: true,
    canDestroyAllRecords: false,
    objects: [
      scrittura(ID['commessa']),
      scrittura(ID['campagna']),
      scrittura(ID['appartenenza']),
      scrittura(ID['consegnaLead']),
      soloAggiunta(ID['feedbackLead']),
      soloAggiunta(ID['opposizione']),
      lettura(ID['mandato']),
      lettura(ID['servizio']),
      lettura(ID['servizioCommessa']),
    ],
  },
});
