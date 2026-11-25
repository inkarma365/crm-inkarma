import { definePageLayoutTab, PageLayoutTabLayoutMode, PageLayoutWidgetVerticalListHeightBehavior } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { deriveUuid } from 'src/model/derive';
import { systemRecordPage } from 'src/page-layouts/commessa-tabs';

const T = ID['tab.appartenenza.consegna'];
// Prima scheda dopo Home: perché consegnare il lead e il pulsante per farlo.
export default definePageLayoutTab({
  universalIdentifier: T,
  pageLayoutUniversalIdentifier: systemRecordPage(ID['appartenenza']),
  title: 'Consegna',
  position: 1,
  icon: 'IconTruckDelivery',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: deriveUuid(T, 'scheda'),
      title: 'Scheda di consegna',
      type: 'FRONT_COMPONENT',
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT,
      configuration: { configurationType: 'FRONT_COMPONENT', frontComponentUniversalIdentifier: ID['fc.schedaConsegna'] },
    },
  ],
});
