import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';

export default defineNavigationMenuItem({
  universalIdentifier: ID['nav.ls.esiti'],
  name: 'Esito da ricevere',
  icon: 'IconHourglass',
  position: 5,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: ID['view.consegneInAttesa'],
  parentUniversalIdentifier: ID['nav.folder.leadspark'],
});
