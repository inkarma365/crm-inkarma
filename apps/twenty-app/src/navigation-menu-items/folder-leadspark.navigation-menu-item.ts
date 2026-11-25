import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.folder.leadspark'],
  name: 'LeadSpark',
  icon: 'IconSparkles',
  position: 1,
  type: NavigationMenuItemType.FOLDER,
  color: 'amber',
});
