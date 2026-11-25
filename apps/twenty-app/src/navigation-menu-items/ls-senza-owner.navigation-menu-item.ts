import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ls.senzaOwner'],
  name: 'Lead senza owner',
  icon: 'IconUserQuestion',
  position: 3,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: ID['view.leadSenzaOwner'],
  parentUniversalIdentifier: ID['nav.folder.leadspark'],
});
