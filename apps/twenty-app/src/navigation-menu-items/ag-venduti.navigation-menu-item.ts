import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ag.venduti'],
  name: 'Servizi venduti',
  icon: 'IconReceipt',
  position: 2,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: ID['servizioCommessa'],
  parentUniversalIdentifier: ID['nav.folder.agenzia'],
});
