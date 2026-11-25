import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { columns, filter } from 'src/model/views';
import { deriveUuid } from 'src/model/derive';

const V = ID['view.consegneInAttesa'];
// Lead consegnati per cui il committente non ha ancora dato un esito: base dei solleciti.
export default defineView({
  universalIdentifier: V,
  name: 'Esito da ricevere',
  objectUniversalIdentifier: ID['consegnaLead'],
  type: ViewType.TABLE,
  icon: 'IconHourglass',
  position: 1,
  fields: columns(V, [[ID['consegnaLead.titolo'], 220], ID['consegnaLead.commessa'], ID['consegnaLead.consegnataIl'], ID['consegnaLead.commercialeNome'], ID['consegnaLead.notifica']]),
  filters: [filter(V, ID['consegnaLead.esito'], ViewFilterOperand.IS, ['IN_ATTESA'])],
  sorts: [{ universalIdentifier: deriveUuid(V, 'sort'), fieldMetadataUniversalIdentifier: ID['consegnaLead.consegnataIl'], direction: ViewSortDirection.ASC }],
});
