import { definePageLayoutTab, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { deriveUuid } from 'src/model/derive';
import { COMMESSA_PAGE } from 'src/page-layouts/commessa-tabs';

const T = ID['tab.commessa.risultati'];
export default definePageLayoutTab({
  universalIdentifier: T,
  pageLayoutUniversalIdentifier: COMMESSA_PAGE,
  title: 'Lead e consegne',
  position: 6,
  icon: 'IconTruckDelivery',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    { universalIdentifier: deriveUuid(T, 'consegne'), title: 'Consegne al cliente', type: 'FIELD',
      configuration: { configurationType: 'FIELD', fieldMetadataId: ID['commessa.consegne'], fieldDisplayMode: 'TABLE' } },
    { universalIdentifier: deriveUuid(T, 'lead'), title: 'Lead nelle campagne', type: 'FIELD',
      configuration: { configurationType: 'FIELD', fieldMetadataId: ID['commessa.leadCampagne'], fieldDisplayMode: 'TABLE' } },
    { universalIdentifier: deriveUuid(T, 'opposizioni'), title: 'Opposizioni', type: 'FIELD',
      configuration: { configurationType: 'FIELD', fieldMetadataId: ID['commessa.opposizioni'], fieldDisplayMode: 'TABLE' } },
  ],
});
