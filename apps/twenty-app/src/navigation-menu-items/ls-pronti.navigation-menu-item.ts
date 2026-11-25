import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ls.pronti'],
  name: 'Pronti per la consegna',
  icon: 'IconTruckDelivery',
  position: 2,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: ID['view.leadPronti'],
  parentUniversalIdentifier: ID['nav.folder.leadspark'],
});
