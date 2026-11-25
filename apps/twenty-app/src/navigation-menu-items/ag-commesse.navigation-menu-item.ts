import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ag.commesse'],
  name: 'Commesse',
  icon: 'IconBriefcase',
  position: 0,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: ID['commessa'],
  parentUniversalIdentifier: ID['nav.folder.agenzia'],
});
