import { definePageLayoutTab, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { deriveUuid } from 'src/model/derive';
import { COMMESSA_PAGE } from 'src/page-layouts/commessa-tabs';

const T = ID['tab.commessa.operativo'];
// Cosa abbiamo venduto, cosa siamo autorizzati a fare e con quali campagne.
export default definePageLayoutTab({
  universalIdentifier: T,
  pageLayoutUniversalIdentifier: COMMESSA_PAGE,
  title: 'Servizi e mandato',
  position: 5,
  icon: 'IconShieldCheck',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    { universalIdentifier: deriveUuid(T, 'servizi'), title: 'Servizi venduti', type: 'FIELD',
      configuration: { configurationType: 'FIELD', fieldMetadataId: ID['commessa.serviziVenduti'], fieldDisplayMode: 'TABLE' } },
    { universalIdentifier: deriveUuid(T, 'mandati'), title: 'Mandati', type: 'FIELD',
      configuration: { configurationType: 'FIELD', fieldMetadataId: ID['commessa.mandati'], fieldDisplayMode: 'TABLE' } },
    { universalIdentifier: deriveUuid(T, 'campagne'), title: 'Campagne', type: 'FIELD',
      configuration: { configurationType: 'FIELD', fieldMetadataId: ID['commessa.campagne'], fieldDisplayMode: 'TABLE' } },
  ],
});
