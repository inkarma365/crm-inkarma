import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ls.import'],
  name: 'Importa lead',
  icon: 'IconFileImport',
  position: 7,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: ID['importLotto'],
  parentUniversalIdentifier: ID['nav.folder.leadspark'],
});
