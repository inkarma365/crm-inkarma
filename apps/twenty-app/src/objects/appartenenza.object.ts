import { defineObject, OnDeleteAction } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { COMPANY, PERSON, WORKSPACE_MEMBER } from 'src/model/standard';
import { bool, dateTime, json, manyToOne, oneToMany, select, text } from 'src/model/fields';

// Appartenenza di una persona a una campagna: il "lead" LeadSpark.
// Una persona può appartenere a più campagne (anche di commesse diverse): ogni appartenenza
// porta il proprio ambito (commessa), provenienza, owner e stato del funnel.
export default defineObject({
  universalIdentifier: ID['appartenenza'],
  nameSingular: 'appartenenza',
  namePlural: 'appartenenze',
  labelSingular: 'Lead in campagna',
  labelPlural: 'Lead in campagna',
  description: 'Persona inserita in una campagna, con provenienza, qualifica e stato del funnel.',
  icon: 'IconUserSearch',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: ID['appartenenza.titolo'],
  fields: [
    text(ID['appartenenza.titolo'], 'titolo', 'Lead', 'IconAbc', { isSearchable: true }),
    select(ID['appartenenza.statoFunnel'], 'statoFunnel', 'Stato', 'IconProgress', [
      { value: 'NUOVO', label: 'Nuovo', color: 'gray' },
      { value: 'CONTATTATO', label: 'Contattato', color: 'sky' },
      { value: 'RISPOSTA', label: 'Ha risposto', color: 'blue' },
      { value: 'INTERESSATO', label: 'Interessato', color: 'violet' },
      { value: 'INCONTRO_FISSATO', label: 'Incontro fissato', color: 'iris' },
      { value: 'INCONTRO_SVOLTO', label: 'Incontro svolto', color: 'purple' },
      { value: 'OPPORTUNITA_CLIENTE', label: 'Opportunità del cliente', color: 'plum' },
      { value: 'VENDITA_CLIENTE', label: 'Vendita del cliente', color: 'jade' },
      { value: 'NON_INTERESSATO', label: 'Non interessato', color: 'brown' },
      { value: 'ESCLUSO', label: 'Escluso', color: 'red' },
    ], 'NUOVO'),
    select(ID['appartenenza.revisione'], 'revisione', 'Revisione', 'IconEye', [
      { value: 'NESSUNA', label: 'Non serve', color: 'gray' },
      { value: 'DA_VERIFICARE', label: 'Da verificare', color: 'amber' },
      { value: 'CONFERMATA', label: 'Verificata', color: 'green' },
    ], 'NESSUNA'),
    select(ID['appartenenza.fonte'], 'fonte', 'Fonte', 'IconInbox', [
      { value: 'FORM', label: 'Form', color: 'sky' },
      { value: 'API', label: 'API', color: 'blue' },
      { value: 'CSV', label: 'CSV', color: 'gray' },
      { value: 'EXCEL', label: 'Excel', color: 'green' },
      { value: 'LEADSPARK', label: 'Import LeadSpark', color: 'amber' },
      { value: 'MANUALE', label: 'Inserimento manuale', color: 'gray' },
    ], 'MANUALE'),
    text(ID['appartenenza.provenienza'], 'provenienza', 'Provenienza', 'IconRoute'),
    dateTime(ID['appartenenza.dataIngresso'], 'dataIngresso', 'Ingresso in campagna'),
    dateTime(ID['appartenenza.terminePresaInCarico'], 'terminePresaInCarico', 'Prendere in carico entro', 'IconAlarm'),
    bool(ID['appartenenza.prontoPerConsegna'], 'prontoPerConsegna', 'Pronto per la consegna', 'IconTruckDelivery', false),
    text(ID['appartenenza.evidenza'], 'evidenza', 'Frase di evidenza', 'IconQuote'),
    json(ID['appartenenza.criteri'], 'criteri', 'Criteri di qualifica', 'IconChecklist'),
    select(ID['appartenenza.segnaleMx'], 'segnaleMx', 'Dominio email (MX)', 'IconServer', [
      { value: 'VALIDO', label: 'MX presente', color: 'green' },
      { value: 'ASSENTE', label: 'MX assente', color: 'red' },
      { value: 'NON_VERIFICATO', label: 'Non verificato', color: 'gray' },
    ], 'NON_VERIFICATO'),
    text(ID['appartenenza.motivoEsclusione'], 'motivoEsclusione', 'Motivo esclusione', 'IconBan'),
    text(ID['appartenenza.chiaveImport'], 'chiaveImport', 'Chiave di import', 'IconKey'),
    manyToOne(ID['appartenenza.campagna'], 'campagna', 'Campagna', 'IconSpeakerphone', ID['campagna'], ID['campagna.lead'], OnDeleteAction.CASCADE),
    manyToOne(ID['appartenenza.commessa'], 'commessa', 'Commessa', 'IconBriefcase', ID['commessa'], ID['commessa.leadCampagne'], OnDeleteAction.CASCADE),
    manyToOne(ID['appartenenza.persona'], 'persona', 'Persona', 'IconUser', PERSON, ID['person.appartenenzeCampagne']),
    manyToOne(ID['appartenenza.aziendaProspect'], 'aziendaProspect', 'Azienda prospect', 'IconBuilding', COMPANY, ID['company.appartenenzeProspect']),
    manyToOne(ID['appartenenza.owner'], 'owner', 'Owner', 'IconUserCircle', WORKSPACE_MEMBER, ID['workspaceMember.leadAssegnati']),
    oneToMany(ID['appartenenza.consegne'], 'consegne', 'Consegne', 'IconTruckDelivery', ID['consegnaLead'], ID['consegnaLead.appartenenza']),
  ],
});
