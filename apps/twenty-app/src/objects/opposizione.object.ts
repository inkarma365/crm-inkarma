import { defineObject, OnDeleteAction } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { dateTime, manyToOne, select, text } from 'src/model/fields';

// Opposizione al contatto. Non si modifica né si cancella: sopravvive a reimport e fusioni,
// perché è legata al valore normalizzato (email o dominio), non al record persona.
export default defineObject({
  universalIdentifier: ID['opposizione'],
  nameSingular: 'opposizione',
  namePlural: 'opposizioni',
  labelSingular: 'Opposizione',
  labelPlural: 'Opposizioni',
  description: 'Richiesta di non essere contattati: blocca gli invii pertinenti anche dopo un reimport.',
  icon: 'IconHandStop',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: ID['opposizione.valore'],
  fields: [
    text(ID['opposizione.valore'], 'valore', 'Email o dominio', 'IconAt', { isSearchable: true }),
    select(ID['opposizione.tipo'], 'tipo', 'Tipo', 'IconCategory', [
      { value: 'EMAIL', label: 'Indirizzo email', color: 'sky' },
      { value: 'DOMINIO', label: 'Intero dominio', color: 'orange' },
    ], 'EMAIL'),
    select(ID['opposizione.ambito'], 'ambito', 'Ambito', 'IconWorld', [
      { value: 'GLOBALE', label: 'Tutte le commesse', color: 'red' },
      { value: 'COMMESSA', label: 'Solo questa commessa', color: 'amber' },
    ], 'GLOBALE'),
    text(ID['opposizione.fonte'], 'fonte', 'Fonte', 'IconRoute'),
    dateTime(ID['opposizione.registrataIl'], 'registrataIl', 'Registrata il'),
    text(ID['opposizione.nota'], 'nota', 'Nota', 'IconNote'),
    manyToOne(ID['opposizione.commessa'], 'commessa', 'Commessa', 'IconBriefcase', ID['commessa'], ID['commessa.opposizioni'], OnDeleteAction.RESTRICT),
  ],
});
