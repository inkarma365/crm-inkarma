import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { json, manyToOne, select, text } from 'src/model/fields';

// Import di lead da file. Flusso: l'operatore allega il file → l'Hub prepara l'anteprima
// (righe valide, errori per riga, duplicati, opposizioni) → l'operatore conferma → l'Hub importa.
// Lo stato lo avanza solo l'Hub, tranne CONFERMATO e RICALCOLA che sono i comandi dell'operatore.
export default defineObject({
  universalIdentifier: ID['importLotto'],
  nameSingular: 'importLotto',
  namePlural: 'importLotti',
  labelSingular: 'Import lead',
  labelPlural: 'Import lead',
  description: 'Caricamento di lead da CSV o Excel con anteprima e conferma.',
  icon: 'IconFileImport',
  labelIdentifierFieldMetadataUniversalIdentifier: ID['importLotto.nome'],
  fields: [
    text(ID['importLotto.nome'], 'nome', 'Nome', 'IconAbc'),
    {
      universalIdentifier: ID['importLotto.file'],
      type: FieldType.FILES as const,
      name: 'file',
      label: 'File (CSV o Excel)',
      icon: 'IconFileSpreadsheet',
      // Un file per import: l'anteprima e l'idempotenza si riferiscono a un solo contenuto.
      universalSettings: { maxNumberOfValues: 1 },
    },
    select(ID['importLotto.formato'], 'formato', 'Formato', 'IconTemplate', [
      { value: 'AUTOMATICO', label: 'Riconosci colonne', color: 'gray' },
      { value: 'LEADSPARK', label: 'Export LeadSpark', color: 'amber' },
    ], 'AUTOMATICO'),
    select(ID['importLotto.stato'], 'stato', 'Stato', 'IconProgress', [
      { value: 'IN_ATTESA_FILE', label: 'In attesa del file', color: 'gray' },
      { value: 'ANALISI', label: 'Analisi in corso', color: 'sky' },
      { value: 'ANTEPRIMA_PRONTA', label: 'Anteprima pronta', color: 'blue' },
      { value: 'RICALCOLA', label: 'Ricalcolo richiesto', color: 'sky' },
      { value: 'CONFERMATO', label: 'Confermato', color: 'violet' },
      { value: 'COMPLETATO', label: 'Completato', color: 'green' },
      { value: 'ERRORE', label: 'Errore', color: 'red' },
    ], 'IN_ATTESA_FILE'),
    json(ID['importLotto.mappatura'], 'mappatura', 'Mappatura colonne', 'IconArrowsRightLeft'),
    json(ID['importLotto.riepilogo'], 'riepilogo', 'Anteprima ed esito', 'IconListCheck'),
    text(ID['importLotto.messaggio'], 'messaggio', 'Messaggio', 'IconInfoCircle'),
    manyToOne(ID['importLotto.campagna'], 'campagna', 'Campagna', 'IconSpeakerphone', ID['campagna'], ID['campagna.importLotti'], OnDeleteAction.RESTRICT),
  ],
});
