import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS as S,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS as L,
} from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { deriveUuid } from 'src/model/derive';

const T = ID['tab.company.cliente'];
// Relazione 1 di 2: l'azienda come CLIENTE dell'agenzia (servizi venduti, opportunità agenzia).
// Non contiene mai dati delle campagne svolte per altri committenti.
export default definePageLayoutTab({
  universalIdentifier: T,
  pageLayoutUniversalIdentifier: L.companyRecordPage.universalIdentifier,
  title: "Cliente dell'agenzia",
  position: 1000,
  icon: 'IconBriefcase',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: deriveUuid(T, 'commesse'),
      title: 'Commesse',
      type: 'FIELD',
      configuration: { configurationType: 'FIELD', fieldMetadataId: ID['company.commesse'], fieldDisplayMode: 'TABLE' },
    },
    {
      universalIdentifier: deriveUuid(T, 'opportunita'),
      title: "Opportunità dell'agenzia",
      type: 'FIELD',
      configuration: { configurationType: 'FIELD', fieldMetadataId: S.company.fields.opportunities.universalIdentifier, fieldDisplayMode: 'TABLE' },
    },
  ],
});
