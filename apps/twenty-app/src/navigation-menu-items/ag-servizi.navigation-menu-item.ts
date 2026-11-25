import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ag.servizi'],
  name: 'Catalogo servizi',
  icon: 'IconPackage',
  position: 1,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: ID['servizio'],
  parentUniversalIdentifier: ID['nav.folder.agenzia'],
});
