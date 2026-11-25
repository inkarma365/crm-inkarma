import { defineObject, OnDeleteAction } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { RICORRENZA_OPTIONS, currency, date, manyToOne, select, text } from 'src/model/fields';

// Servizio venduto dentro una commessa, con il prezzo concordato (fonte per AI e preventivi).
export default defineObject({
  universalIdentifier: ID['servizioCommessa'],
  nameSingular: 'servizioCommessa',
  namePlural: 'serviziCommessa',
  labelSingular: 'Servizio venduto',
  labelPlural: 'Servizi venduti',
  description: 'Servizio venduto in una commessa con prezzo e ricorrenza concordati.',
  icon: 'IconReceipt',
  labelIdentifierFieldMetadataUniversalIdentifier: ID['servizioCommessa.nome'],
  fields: [
    text(ID['servizioCommessa.nome'], 'nome', 'Descrizione', 'IconAbc'),
    currency(ID['servizioCommessa.prezzo'], 'prezzo', 'Prezzo concordato'),
    select(ID['servizioCommessa.ricorrenza'], 'ricorrenza', 'Ricorrenza', 'IconRepeat', RICORRENZA_OPTIONS, 'UNA_TANTUM'),
    select(ID['servizioCommessa.stato'], 'stato', 'Stato', 'IconProgress', [
      { value: 'ATTIVO', label: 'Attivo', color: 'green' },
      { value: 'SOSPESO', label: 'Sospeso', color: 'orange' },
      { value: 'CONCLUSO', label: 'Concluso', color: 'gray' },
    ], 'ATTIVO'),
    date(ID['servizioCommessa.decorrenza'], 'decorrenza', 'Decorrenza'),
    manyToOne(ID['servizioCommessa.commessa'], 'commessa', 'Commessa', 'IconBriefcase', ID['commessa'], ID['commessa.serviziVenduti'], OnDeleteAction.CASCADE),
    manyToOne(ID['servizioCommessa.servizio'], 'servizio', 'Servizio', 'IconPackage', ID['servizio'], ID['servizio.vendite']),
  ],
});
