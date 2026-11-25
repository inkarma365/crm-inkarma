import { defineField } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { COMPANY } from 'src/model/standard';
import { oneToMany } from 'src/model/fields';

export default defineField({
  objectUniversalIdentifier: COMPANY,
  ...oneToMany(ID['company.commesse'], 'commesse', 'Commesse (come cliente)', 'IconBriefcase', ID['commessa'], ID['commessa.cliente']),
});
