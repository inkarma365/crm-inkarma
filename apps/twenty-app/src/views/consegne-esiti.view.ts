import { defineView, ViewType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { columns, groups } from 'src/model/views';

const V = ID['view.consegneEsiti'];
export default defineView({
  universalIdentifier: V,
  name: 'Consegne per esito',
  objectUniversalIdentifier: ID['consegnaLead'],
  type: ViewType.KANBAN,
  icon: 'IconLayoutKanban',
  position: 2,
  mainGroupByFieldMetadataUniversalIdentifier: ID['consegnaLead.esito'],
  shouldHideEmptyGroups: false,
  groups: groups(V, ['IN_ATTESA', 'ACCETTATO', 'INCONTRO_FISSATO', 'INCONTRO_SVOLTO', 'OPPORTUNITA', 'VENDITA', 'RIFIUTATO', 'PERSO']),
  fields: columns(V, [ID['consegnaLead.titolo'], ID['consegnaLead.commessa'], ID['consegnaLead.consegnataIl'], ID['consegnaLead.valoreDichiarato']]),
});
