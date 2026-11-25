import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ls.funnel'],
  name: 'Funnel lead',
  icon: 'IconLayoutKanban',
  position: 1,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: ID['view.leadFunnel'],
  parentUniversalIdentifier: ID['nav.folder.leadspark'],
});
