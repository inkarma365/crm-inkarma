import { defineField } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { PERSON } from 'src/model/standard';
import { oneToMany } from 'src/model/fields';

export default defineField({
  objectUniversalIdentifier: PERSON,
  ...oneToMany(ID['person.appartenenzeCampagne'], 'appartenenzeCampagne', 'Campagne', 'IconUserSearch', ID['appartenenza'], ID['appartenenza.persona']),
});
