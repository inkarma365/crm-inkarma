import { defineObject, OnDeleteAction } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { WORKSPACE_MEMBER } from 'src/model/standard';
import { array, bool, date, int, manyToOne, richText, select, text } from 'src/model/fields';

// Mandato: cosa LeadSpark può fare per conto del committente, con limiti espliciti e scadenza.
export default defineObject({
  universalIdentifier: ID['mandato'],
  nameSingular: 'mandato',
  namePlural: 'mandati',
  labelSingular: 'Mandato',
  labelPlural: 'Mandati',
  description: 'Perimetro operativo autorizzato: domini, caselle mittenti, pubblico, frequenza, scadenza.',
  icon: 'IconShieldCheck',
  labelIdentifierFieldMetadataUniversalIdentifier: ID['mandato.nome'],
  fields: [
    text(ID['mandato.nome'], 'nome', 'Nome', 'IconAbc'),
    select(ID['mandato.stato'], 'stato', 'Stato', 'IconProgress', [
      { value: 'BOZZA', label: 'Bozza', color: 'gray' },
      { value: 'ATTIVO', label: 'Attivo', color: 'green' },
      { value: 'REVOCATO', label: 'Revocato', color: 'red' },
      { value: 'SCADUTO', label: 'Scaduto', color: 'brown' },
    ], 'BOZZA'),
    array(ID['mandato.dominiAutorizzati'], 'dominiAutorizzati', 'Domini mittenti autorizzati', 'IconWorldWww'),
    array(ID['mandato.caselleAutorizzate'], 'caselleAutorizzate', 'Caselle mittenti autorizzate', 'IconMailbox'),
    richText(ID['mandato.pubblicoAutorizzato'], 'pubblicoAutorizzato', 'Pubblico autorizzato', 'IconUsersGroup'),
    int(ID['mandato.limiteInviiGiornalieri'], 'limiteInviiGiornalieri', 'Limite invii al giorno', 'IconGauge'),
    bool(ID['mandato.approvazioneOperativa'], 'approvazioneOperativa', 'Approvazione operativa a LeadSpark', 'IconUserCheck', false),
    date(ID['mandato.scadenza'], 'scadenza', 'Scadenza'),
    manyToOne(ID['mandato.commessa'], 'commessa', 'Commessa', 'IconBriefcase', ID['commessa'], ID['commessa.mandati'], OnDeleteAction.CASCADE),
    manyToOne(ID['mandato.concessoDa'], 'concessoDa', 'Concesso da', 'IconUserShield', WORKSPACE_MEMBER, ID['workspaceMember.mandatiConcessi']),
  ],
});
