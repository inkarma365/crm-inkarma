import { defineObject, OnDeleteAction } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { manyToOne, oneToMany, richText, select, text } from 'src/model/fields';

export default defineObject({
  universalIdentifier: ID['campagna'],
  nameSingular: 'campagna',
  namePlural: 'campagne',
  labelSingular: 'Campagna',
  labelPlural: 'Campagne',
  description: 'Campagna di lead generation svolta per una commessa.',
  icon: 'IconSpeakerphone',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: ID['campagna.nome'],
  fields: [
    text(ID['campagna.nome'], 'nome', 'Nome', 'IconAbc', { isSearchable: true }),
    select(ID['campagna.stato'], 'stato', 'Stato', 'IconProgress', [
      { value: 'BOZZA', label: 'Bozza', color: 'gray' },
      { value: 'ATTIVA', label: 'Attiva', color: 'green' },
      { value: 'IN_PAUSA', label: 'In pausa', color: 'orange' },
      { value: 'CONCLUSA', label: 'Conclusa', color: 'brown' },
    ], 'BOZZA'),
    text(ID['campagna.fuso'], 'fuso', 'Fuso orario', 'IconWorld', { defaultValue: "'Europe/Rome'" }),
    text(ID['campagna.finestraInvio'], 'finestraInvio', 'Finestra di invio', 'IconClock', { defaultValue: "'lun-ven 09:00-17:30'" }),
    text(ID['campagna.settore'], 'settore', 'Settore', 'IconBuildingFactory2'),
    text(ID['campagna.area'], 'area', 'Area geografica', 'IconMapPin'),
    richText(ID['campagna.profiloIdeale'], 'profiloIdeale', 'Profilo cliente ideale', 'IconTarget'),
    richText(ID['campagna.criteriQualifica'], 'criteriQualifica', 'Criteri di qualifica', 'IconChecklist'),
    manyToOne(ID['campagna.commessa'], 'commessa', 'Commessa', 'IconBriefcase', ID['commessa'], ID['commessa.campagne'], OnDeleteAction.CASCADE),
    manyToOne(ID['campagna.servizio'], 'servizio', 'Servizio promosso', 'IconPackage', ID['servizio'], ID['servizio.campagne']),
    oneToMany(ID['campagna.lead'], 'lead', 'Lead', 'IconUserSearch', ID['appartenenza'], ID['appartenenza.campagna']),
  ],
});
