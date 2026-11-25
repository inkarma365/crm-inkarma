import { defineObject, OnDeleteAction } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { COMPANY, WORKSPACE_MEMBER } from 'src/model/standard';
import { date, emails, manyToOne, oneToMany, richText, select, text } from 'src/model/fields';

// Commessa: il contratto con un committente. È l'ambito di isolamento di tutti i dati LeadSpark.
export default defineObject({
  universalIdentifier: ID['commessa'],
  nameSingular: 'commessa',
  namePlural: 'commesse',
  labelSingular: 'Commessa',
  labelPlural: 'Commesse',
  description: 'Contratto con un committente: servizi venduti, mandato, campagne e risultati promessi.',
  icon: 'IconBriefcase',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: ID['commessa.nome'],
  fields: [
    text(ID['commessa.nome'], 'nome', 'Nome', 'IconAbc', { isSearchable: true }),
    select(ID['commessa.stato'], 'stato', 'Stato', 'IconProgress', [
      { value: 'ATTIVA', label: 'Attiva', color: 'green' },
      { value: 'IN_PAUSA', label: 'In pausa', color: 'orange' },
      { value: 'CHIUSA', label: 'Chiusa', color: 'gray' },
    ], 'ATTIVA'),
    select(ID['commessa.modalitaAgente'], 'modalitaAgente', 'Agente AI', 'IconRobot', [
      { value: 'SUGGERIMENTI', label: 'Solo suggerimenti', color: 'sky' },
      { value: 'APPROVAZIONE', label: 'Azioni con approvazione', color: 'blue' },
      { value: 'PAUSA', label: 'In pausa', color: 'orange' },
    ], 'SUGGERIMENTI'),
    text(ID['commessa.fuso'], 'fuso', 'Fuso orario', 'IconWorld', { defaultValue: "'Europe/Rome'" }),
    emails(ID['commessa.referenteEmail'], 'referenteEmail', 'Email referente cliente'),
    richText(ID['commessa.risultatoPromesso'], 'risultatoPromesso', 'Risultato promesso', 'IconTarget'),
    richText(ID['commessa.condizioniEconomiche'], 'condizioniEconomiche', 'Condizioni economiche', 'IconCoin'),
    date(ID['commessa.inizio'], 'inizio', 'Inizio'),
    date(ID['commessa.fine'], 'fine', 'Fine prevista'),
    manyToOne(ID['commessa.cliente'], 'cliente', 'Cliente', 'IconBuildingSkyscraper', COMPANY, ID['company.commesse'], OnDeleteAction.RESTRICT),
    manyToOne(ID['commessa.accountManager'], 'accountManager', 'Account manager', 'IconUserStar', WORKSPACE_MEMBER, ID['workspaceMember.commesseGestite']),
    oneToMany(ID['commessa.serviziVenduti'], 'serviziVenduti', 'Servizi venduti', 'IconPackage', ID['servizioCommessa'], ID['servizioCommessa.commessa']),
    oneToMany(ID['commessa.mandati'], 'mandati', 'Mandati', 'IconShieldCheck', ID['mandato'], ID['mandato.commessa']),
    oneToMany(ID['commessa.campagne'], 'campagne', 'Campagne', 'IconSpeakerphone', ID['campagna'], ID['campagna.commessa']),
    oneToMany(ID['commessa.leadCampagne'], 'leadCampagne', 'Lead nelle campagne', 'IconUserSearch', ID['appartenenza'], ID['appartenenza.commessa']),
    oneToMany(ID['commessa.consegne'], 'consegne', 'Consegne lead', 'IconTruckDelivery', ID['consegnaLead'], ID['consegnaLead.commessa']),
    oneToMany(ID['commessa.esitiLead'], 'esitiLead', 'Storico esiti', 'IconHistory', ID['feedbackLead'], ID['feedbackLead.commessa']),
    oneToMany(ID['commessa.opposizioni'], 'opposizioni', 'Opposizioni', 'IconHandStop', ID['opposizione'], ID['opposizione.commessa']),
  ],
});
