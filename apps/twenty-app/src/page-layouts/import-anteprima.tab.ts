import { definePageLayoutTab, PageLayoutTabLayoutMode, PageLayoutWidgetVerticalListHeightBehavior } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { deriveUuid } from 'src/model/derive';
import { systemRecordPage } from 'src/page-layouts/commessa-tabs';

const T = ID['tab.importLotto.anteprima'];
export default definePageLayoutTab({
  universalIdentifier: T,
  pageLayoutUniversalIdentifier: systemRecordPage(ID['importLotto']),
  title: 'Anteprima',
  position: 1,
  icon: 'IconListCheck',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: deriveUuid(T, 'anteprima'),
      title: 'Anteprima',
      type: 'FRONT_COMPONENT',
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT,
      configuration: { configurationType: 'FRONT_COMPONENT', frontComponentUniversalIdentifier: ID['fc.anteprimaImport'] },
    },
  ],
});
