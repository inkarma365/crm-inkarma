import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ls.opposizioni'],
  name: 'Opposizioni',
  icon: 'IconHandStop',
  position: 6,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: ID['opposizione'],
  parentUniversalIdentifier: ID['nav.folder.leadspark'],
});
