import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.folder.agenzia'],
  name: 'Agenzia',
  icon: 'IconBuildingStore',
  position: 2,
  type: NavigationMenuItemType.FOLDER,
  color: 'violet',
});
