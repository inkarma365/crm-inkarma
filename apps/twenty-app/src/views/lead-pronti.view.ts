import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { columns, filter } from 'src/model/views';
import { deriveUuid } from 'src/model/derive';

const V = ID['view.leadPronti'];
// Lead qualificati che aspettano solo la consegna al committente.
export default defineView({
  universalIdentifier: V,
  name: 'Pronti per la consegna',
  objectUniversalIdentifier: ID['appartenenza'],
  type: ViewType.TABLE,
  icon: 'IconTruckDelivery',
  position: 2,
  fields: columns(V, [
    [ID['appartenenza.titolo'], 200], [ID['appartenenza.evidenza'], 320], ID['appartenenza.commessa'],
    ID['appartenenza.campagna'], ID['appartenenza.owner'], ID['appartenenza.terminePresaInCarico'],
  ]),
  filters: [filter(V, ID['appartenenza.prontoPerConsegna'], ViewFilterOperand.IS, 'true')],
  sorts: [{ universalIdentifier: deriveUuid(V, 'sort'), fieldMetadataUniversalIdentifier: ID['appartenenza.terminePresaInCarico'], direction: ViewSortDirection.ASC }],
});
