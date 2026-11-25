import { defineField } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { WORKSPACE_MEMBER } from 'src/model/standard';
import { oneToMany } from 'src/model/fields';

export default defineField({
  objectUniversalIdentifier: WORKSPACE_MEMBER,
  ...oneToMany(ID['workspaceMember.leadAssegnati'], 'leadAssegnati', 'Lead assegnati', 'IconUserSearch', ID['appartenenza'], ID['appartenenza.owner']),
});
