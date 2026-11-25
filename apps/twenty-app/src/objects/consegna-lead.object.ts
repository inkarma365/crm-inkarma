import { defineObject, OnDeleteAction } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { PERSON, WORKSPACE_MEMBER } from 'src/model/standard';
import { ESITO_OPTIONS, bool, currency, dateTime, emails, manyToOne, oneToMany, select, text } from 'src/model/fields';

// Consegna di un lead al committente. Creare il record è il "comando": l'Hub lo verifica e notifica.
export default defineObject({
  universalIdentifier: ID['consegnaLead'],
  nameSingular: 'consegnaLead',
  namePlural: 'consegneLead',
  labelSingular: 'Consegna lead',
  labelPlural: 'Consegne lead',
  description: 'Lead consegnato al commerciale del committente, con esito corrente.',
  icon: 'IconTruckDelivery',
  labelIdentifierFieldMetadataUniversalIdentifier: ID['consegnaLead.titolo'],
  fields: [
    text(ID['consegnaLead.titolo'], 'titolo', 'Consegna', 'IconAbc'),
    dateTime(ID['consegnaLead.consegnataIl'], 'consegnataIl', 'Consegnata il'),
    select(ID['consegnaLead.esito'], 'esito', 'Esito', 'IconFlag', ESITO_OPTIONS, 'IN_ATTESA'),
    text(ID['consegnaLead.motivoRifiuto'], 'motivoRifiuto', 'Motivo del rifiuto', 'IconMessageX'),
    dateTime(ID['consegnaLead.esitoAggiornatoIl'], 'esitoAggiornatoIl', 'Esito aggiornato il'),
    text(ID['consegnaLead.esitoDa'], 'esitoDa', 'Esito indicato da', 'IconUser'),
    bool(ID['consegnaLead.tardivo'], 'tardivo', 'Esito tardivo', 'IconClockExclamation', false),
    text(ID['consegnaLead.evidenza'], 'evidenza', 'Frase di evidenza', 'IconQuote'),
    text(ID['consegnaLead.commercialeNome'], 'commercialeNome', 'Commerciale del committente', 'IconUserDollar'),
    emails(ID['consegnaLead.commercialeEmail'], 'commercialeEmail', 'Email commerciale'),
    currency(ID['consegnaLead.valoreDichiarato'], 'valoreDichiarato', 'Valore dichiarato dal cliente'),
    select(ID['consegnaLead.notifica'], 'notifica', 'Notifica al cliente', 'IconSend', [
      { value: 'DA_INVIARE', label: 'Da inviare', color: 'gray' },
      { value: 'INVIATA', label: 'Inviata', color: 'green' },
      { value: 'ERRORE', label: 'Errore di invio', color: 'red' },
      { value: 'BLOCCATA', label: 'Bloccata dal controllo', color: 'orange' },
    ], 'DA_INVIARE'),
    manyToOne(ID['consegnaLead.appartenenza'], 'appartenenza', 'Lead in campagna', 'IconUserSearch', ID['appartenenza'], ID['appartenenza.consegne'], OnDeleteAction.RESTRICT),
    manyToOne(ID['consegnaLead.commessa'], 'commessa', 'Commessa', 'IconBriefcase', ID['commessa'], ID['commessa.consegne'], OnDeleteAction.RESTRICT),
    manyToOne(ID['consegnaLead.persona'], 'persona', 'Persona', 'IconUser', PERSON, ID['person.consegneLead']),
    manyToOne(ID['consegnaLead.consegnataDa'], 'consegnataDa', 'Consegnata da', 'IconUserCheck', WORKSPACE_MEMBER, ID['workspaceMember.consegneEffettuate']),
    oneToMany(ID['consegnaLead.storicoEsiti'], 'storicoEsiti', 'Storico esiti', 'IconHistory', ID['feedbackLead'], ID['feedbackLead.consegna']),
  ],
});
