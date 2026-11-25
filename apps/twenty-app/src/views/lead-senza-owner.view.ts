import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { columns, filter } from 'src/model/views';
import { deriveUuid } from 'src/model/derive';

const V = ID['view.leadSenzaOwner'];
export default defineView({
  universalIdentifier: V,
  name: 'Lead senza owner',
  objectUniversalIdentifier: ID['appartenenza'],
  type: ViewType.TABLE,
  icon: 'IconUserQuestion',
  position: 3,
  fields: columns(V, [[ID['appartenenza.titolo'], 200], ID['appartenenza.statoFunnel'], ID['appartenenza.commessa'], ID['appartenenza.campagna'], ID['appartenenza.dataIngresso'], ID['appartenenza.terminePresaInCarico']]),
  filters: [filter(V, ID['appartenenza.owner'], ViewFilterOperand.IS_EMPTY, '')],
  sorts: [{ universalIdentifier: deriveUuid(V, 'sort'), fieldMetadataUniversalIdentifier: ID['appartenenza.dataIngresso'], direction: ViewSortDirection.ASC }],
});
