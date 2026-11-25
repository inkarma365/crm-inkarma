import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ls.campagne'],
  name: 'Campagne',
  icon: 'IconSpeakerphone',
  position: 0,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: ID['campagna'],
  parentUniversalIdentifier: ID['nav.folder.leadspark'],
});
