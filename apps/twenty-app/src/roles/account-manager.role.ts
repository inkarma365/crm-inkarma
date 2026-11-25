import { defineRole } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { lettura, scrittura, soloAggiunta } from 'src/roles/permissions';

// Account manager: gestisce le commesse assegnate, qualifica e consegna i lead.
// Vede le condizioni economiche (servono per proposte coerenti), non cancella mai.
export default defineRole({
  universalIdentifier: ID['role.accountManager'],
  label: 'Account manager',
  description: 'Commesse, campagne, lead e consegne. Nessuna cancellazione definitiva.',
  icon: 'IconUserStar',
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
      scrittura(ID['commessa']),
      lettura(ID['mandato']),
      scrittura(ID['campagna']),
      scrittura(ID['appartenenza']),
      scrittura(ID['consegnaLead']),
      scrittura(ID['importLotto']),
      soloAggiunta(ID['feedbackLead']),
      soloAggiunta(ID['opposizione']),
      lettura(ID['servizio']),
      lettura(ID['servizioCommessa']),
    ],
  },
});
