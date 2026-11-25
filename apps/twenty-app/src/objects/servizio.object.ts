import { defineObject } from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { RICORRENZA_OPTIONS, bool, currency, oneToMany, richText, select, text } from 'src/model/fields';

// Catalogo dei servizi dell'agenzia. Il prezzo effettivo vive su "Servizio venduto".
export default defineObject({
  universalIdentifier: ID['servizio'],
  nameSingular: 'servizio',
  namePlural: 'servizi',
  labelSingular: 'Servizio',
  labelPlural: 'Servizi',
  description: 'Catalogo dei servizi vendibili.',
  icon: 'IconPackage',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: ID['servizio.nome'],
  fields: [
    text(ID['servizio.nome'], 'nome', 'Nome', 'IconAbc', { isSearchable: true }),
    select(ID['servizio.categoria'], 'categoria', 'Categoria', 'IconCategory', [
      { value: 'WEB', label: 'Web', color: 'sky' },
      { value: 'SEO', label: 'SEO', color: 'green' },
      { value: 'ADVERTISING', label: 'Advertising', color: 'orange' },
      { value: 'AUTOMAZIONE', label: 'Automazione', color: 'violet' },
      { value: 'AI', label: 'AI', color: 'purple' },
      { value: 'LEAD_GENERATION', label: 'Lead generation', color: 'amber' },
      { value: 'ALTRO', label: 'Altro', color: 'gray' },
    ]),
    currency(ID['servizio.prezzoListino'], 'prezzoListino', 'Prezzo di listino'),
    select(ID['servizio.ricorrenza'], 'ricorrenza', 'Ricorrenza', 'IconRepeat', RICORRENZA_OPTIONS, 'UNA_TANTUM'),
    bool(ID['servizio.attivo'], 'attivo', 'In catalogo', 'IconCheck', true),
    richText(ID['servizio.descrizione'], 'descrizione', 'Descrizione'),
    oneToMany(ID['servizio.vendite'], 'vendite', 'Vendite', 'IconReceipt', ID['servizioCommessa'], ID['servizioCommessa.servizio']),
    oneToMany(ID['servizio.campagne'], 'campagne', 'Campagne', 'IconSpeakerphone', ID['campagna'], ID['campagna.servizio']),
  ],
});
