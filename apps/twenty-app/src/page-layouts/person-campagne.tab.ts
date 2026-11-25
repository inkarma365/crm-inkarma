import { definePageLayoutTab, PageLayoutTabLayoutMode, STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS as L } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { deriveUuid } from 'src/model/derive';

const T = ID['tab.person.campagne'];
export default definePageLayoutTab({
  universalIdentifier: T,
  pageLayoutUniversalIdentifier: L.personRecordPage.universalIdentifier,
  title: 'Campagne e consegne',
  position: 1000,
  icon: 'IconUserSearch',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: deriveUuid(T, 'appartenenze'),
      title: 'Campagne',
      type: 'FIELD',
      configuration: { configurationType: 'FIELD', fieldMetadataId: ID['person.appartenenzeCampagne'], fieldDisplayMode: 'TABLE' },
    },
    {
      universalIdentifier: deriveUuid(T, 'consegne'),
      title: 'Consegne al committente',
      type: 'FIELD',
      configuration: { configurationType: 'FIELD', fieldMetadataId: ID['person.consegneLead'], fieldDisplayMode: 'TABLE' },
    },
  ],
});
