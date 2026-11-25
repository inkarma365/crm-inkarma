import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ag.mandati'],
  name: 'Mandati',
  icon: 'IconShieldCheck',
  position: 3,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: ID['mandato'],
  parentUniversalIdentifier: ID['nav.folder.agenzia'],
});
