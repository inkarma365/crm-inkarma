import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.oggi'],
  name: 'Oggi',
  icon: 'IconSunHigh',
  color: 'amber',
  position: 0,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: ID['page.oggi'],
});
