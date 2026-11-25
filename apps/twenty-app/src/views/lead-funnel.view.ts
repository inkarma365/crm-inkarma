import { defineView, ViewType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { columns, groups } from 'src/model/views';

const V = ID['view.leadFunnel'];
// Dove si perdono i lead: una colonna per stato del funnel, dal primo contatto alla vendita del cliente.
export default defineView({
  universalIdentifier: V,
  name: 'Funnel lead',
  objectUniversalIdentifier: ID['appartenenza'],
  type: ViewType.KANBAN,
  icon: 'IconLayoutKanban',
  position: 1,
  mainGroupByFieldMetadataUniversalIdentifier: ID['appartenenza.statoFunnel'],
  shouldHideEmptyGroups: false,
  groups: groups(V, ['NUOVO', 'CONTATTATO', 'RISPOSTA', 'INTERESSATO', 'INCONTRO_FISSATO', 'INCONTRO_SVOLTO', 'OPPORTUNITA_CLIENTE', 'VENDITA_CLIENTE', 'NON_INTERESSATO', 'ESCLUSO']),
  fields: columns(V, [ID['appartenenza.titolo'], ID['appartenenza.commessa'], ID['appartenenza.campagna'], ID['appartenenza.owner'], ID['appartenenza.terminePresaInCarico']]),
});
