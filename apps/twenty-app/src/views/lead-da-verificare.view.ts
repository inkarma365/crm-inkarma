import { defineView, ViewFilterOperand, ViewType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { columns, filter } from 'src/model/views';

const V = ID['view.leadDaVerificare'];
// Contatti incerti (duplicati possibili, identità ambigua): entrano qui invece di sovrascrivere dati.
export default defineView({
  universalIdentifier: V,
  name: 'Da verificare',
  objectUniversalIdentifier: ID['appartenenza'],
  type: ViewType.TABLE,
  icon: 'IconEye',
  position: 4,
  fields: columns(V, [[ID['appartenenza.titolo'], 200], ID['appartenenza.motivoEsclusione'], ID['appartenenza.fonte'], ID['appartenenza.provenienza'], ID['appartenenza.commessa'], ID['appartenenza.chiaveImport']]),
  filters: [filter(V, ID['appartenenza.revisione'], ViewFilterOperand.IS, ['DA_VERIFICARE'])],
});
