import { definePageLayout, PageLayoutTabLayoutMode, PageLayoutWidgetVerticalListHeightBehavior } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { deriveUuid } from 'src/model/derive';

const P = ID['page.oggi'];
export default definePageLayout({
  universalIdentifier: P,
  name: 'Oggi',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: deriveUuid(P, 'tab'),
      title: 'Oggi',
      position: 0,
      icon: 'IconSunHigh',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: deriveUuid(P, 'coda'),
          title: ' ',
          type: 'FRONT_COMPONENT',
          heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
          configuration: { configurationType: 'FRONT_COMPONENT', frontComponentUniversalIdentifier: ID['fc.oggi'] },
        },
      ],
    },
  ],
});
