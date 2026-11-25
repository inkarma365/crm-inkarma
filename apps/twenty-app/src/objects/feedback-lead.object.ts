import { defineObject, OnDeleteAction } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { ESITO_OPTIONS, bool, dateTime, manyToOne, select, text } from 'src/model/fields';

// Storico immutabile degli esiti: ogni cambio di esito aggiunge una riga, nessuna viene riscritta.
export default defineObject({
  universalIdentifier: ID['feedbackLead'],
  nameSingular: 'feedbackLead',
  namePlural: 'feedbackLeads',
  labelSingular: 'Esito lead',
  labelPlural: 'Esiti lead',
  description: 'Esito restituito dal committente su un lead consegnato (storico, mai riscritto).',
  icon: 'IconMessageCheck',
  labelIdentifierFieldMetadataUniversalIdentifier: ID['feedbackLead.titolo'],
  fields: [
    text(ID['feedbackLead.titolo'], 'titolo', 'Esito', 'IconAbc'),
    select(ID['feedbackLead.esito'], 'esito', 'Esito', 'IconFlag', ESITO_OPTIONS, 'IN_ATTESA'),
    text(ID['feedbackLead.motivo'], 'motivo', 'Motivo', 'IconMessage'),
    text(ID['feedbackLead.autore'], 'autore', 'Autore', 'IconUser'),
    select(ID['feedbackLead.canale'], 'canale', 'Canale', 'IconInbox', [
      { value: 'PORTALE', label: 'Area cliente', color: 'violet' },
      { value: 'EMAIL', label: 'Email', color: 'sky' },
      { value: 'OPERATORE', label: 'Operatore', color: 'gray' },
    ], 'PORTALE'),
    dateTime(ID['feedbackLead.ricevutoIl'], 'ricevutoIl', 'Ricevuto il'),
    bool(ID['feedbackLead.tardivo'], 'tardivo', 'Dopo report inviato', 'IconClockExclamation', false),
    text(ID['feedbackLead.eventId'], 'eventId', 'ID evento', 'IconFingerprint', { isUnique: true }),
    manyToOne(ID['feedbackLead.consegna'], 'consegna', 'Consegna', 'IconTruckDelivery', ID['consegnaLead'], ID['consegnaLead.storicoEsiti'], OnDeleteAction.CASCADE),
    manyToOne(ID['feedbackLead.commessa'], 'commessa', 'Commessa', 'IconBriefcase', ID['commessa'], ID['commessa.esitiLead'], OnDeleteAction.CASCADE),
  ],
});
