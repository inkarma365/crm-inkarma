import { defineRole } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { CAMPI_ECONOMICI, lettura } from 'src/roles/permissions';

// Agente AI: legge per proporre, non scrive fatti verificati e non vede condizioni economiche libere.
// I prezzi utilizzabili arrivano solo dai servizi venduti della commessa.
export default defineRole({
  universalIdentifier: ID['role.agenteAi'],
  label: 'Agente AI',
  description: 'Sola lettura sui dati necessari alle proposte. Nessuna scrittura di fatti, nessun dato economico libero.',
  icon: 'IconRobot',
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  canBeAssignedToAgents: true,
  canUpdateAllSettings: false,
  canAccessAllTools: false,
  recordsPermissions: {
    canReadAllRecords: false,
    canUpdateAllRecords: false,
    canSoftDeleteAllRecords: false,
    canDestroyAllRecords: false,
    objects: [
      lettura(ID['commessa'], { unreadableFields: CAMPI_ECONOMICI.commessa }),
      lettura(ID['servizioCommessa']),
      lettura(ID['campagna']),
      lettura(ID['appartenenza']),
      lettura(ID['opposizione']),
    ],
  },
});
