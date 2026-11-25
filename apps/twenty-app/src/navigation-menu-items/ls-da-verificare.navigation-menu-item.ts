import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ls.daVerificare'],
  name: 'Da verificare',
  icon: 'IconEye',
  position: 4,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: ID['view.leadDaVerificare'],
  parentUniversalIdentifier: ID['nav.folder.leadspark'],
});
