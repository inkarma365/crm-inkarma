import { definePageLayoutTab, PageLayoutTabLayoutMode, STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS as L } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { deriveUuid } from 'src/model/derive';

const T = ID['tab.company.prospect'];
// Relazione 2 di 2: l'azienda come PROSPECT nelle campagne LeadSpark svolte per i committenti.
export default definePageLayoutTab({
  universalIdentifier: T,
  pageLayoutUniversalIdentifier: L.companyRecordPage.universalIdentifier,
  title: 'Prospect nelle campagne',
  position: 1001,
  icon: 'IconUserSearch',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: deriveUuid(T, 'appartenenze'),
      title: 'Campagne in cui compare (con committente)',
      type: 'FIELD',
      configuration: { configurationType: 'FIELD', fieldMetadataId: ID['company.appartenenzeProspect'], fieldDisplayMode: 'TABLE' },
    },
  ],
});
