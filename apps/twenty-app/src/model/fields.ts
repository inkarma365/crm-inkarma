// Costruttori compatti per i campi. Restituiscono oggetti semplici accettati da defineObject/defineField.
// Convenzione: nomi camelCase in italiano, valori SELECT in MAIUSCOLO_SNAKE, etichette in italiano.
import { FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

// Colori ammessi dalle opzioni SELECT (TAG_COLORS di twenty-sdk, tipo non esportato).
export type TagColor =
  | 'red' | 'ruby' | 'crimson' | 'tomato' | 'orange' | 'amber' | 'yellow' | 'lime' | 'grass' | 'green'
  | 'jade' | 'mint' | 'turquoise' | 'cyan' | 'sky' | 'blue' | 'iris' | 'violet' | 'purple' | 'plum'
  | 'pink' | 'bronze' | 'gold' | 'brown' | 'gray';
type Opt = { value: string; label: string; color?: TagColor; description?: string };
type Extra = Record<string, unknown>;

export const text = (uid: string, name: string, label: string, icon: string, extra: Extra = {}) => ({
  universalIdentifier: uid,
  type: FieldType.TEXT as const,
  name,
  label,
  icon,
  ...extra,
});

export const richText = (uid: string, name: string, label: string, icon = 'IconFileText', extra: Extra = {}) => ({
  universalIdentifier: uid,
  type: FieldType.RICH_TEXT as const,
  name,
  label,
  icon,
  ...extra,
});

export const select = (
  uid: string,
  name: string,
  label: string,
  icon: string,
  options: Opt[],
  defaultValue?: string,
  extra: Extra = {},
) => ({
  universalIdentifier: uid,
  type: FieldType.SELECT as const,
  name,
  label,
  icon,
  options: options.map((o, position) => ({ position, ...o })),
  ...(defaultValue ? { defaultValue: `'${defaultValue}'` } : {}),
  ...extra,
});

export const multiSelect = (uid: string, name: string, label: string, icon: string, options: Opt[], extra: Extra = {}) => ({
  universalIdentifier: uid,
  type: FieldType.MULTI_SELECT as const,
  name,
  label,
  icon,
  options: options.map((o, position) => ({ position, ...o })),
  ...extra,
});

export const bool = (uid: string, name: string, label: string, icon: string, defaultValue = false, extra: Extra = {}) => ({
  universalIdentifier: uid,
  type: FieldType.BOOLEAN as const,
  name,
  label,
  icon,
  defaultValue,
  ...extra,
});

export const int = (uid: string, name: string, label: string, icon: string, extra: Extra = {}) => ({
  universalIdentifier: uid,
  type: FieldType.NUMBER as const,
  name,
  label,
  icon,
  universalSettings: { dataType: 'int' as const, decimals: 0 },
  ...extra,
});

export const currency = (uid: string, name: string, label: string, icon = 'IconCurrencyEuro', extra: Extra = {}) => ({
  universalIdentifier: uid,
  type: FieldType.CURRENCY as const,
  name,
  label,
  icon,
  ...extra,
});

export const dateTime = (uid: string, name: string, label: string, icon = 'IconCalendarTime', extra: Extra = {}) => ({
  universalIdentifier: uid,
  type: FieldType.DATE_TIME as const,
  name,
  label,
  icon,
  ...extra,
});

export const date = (uid: string, name: string, label: string, icon = 'IconCalendar', extra: Extra = {}) => ({
  universalIdentifier: uid,
  type: FieldType.DATE as const,
  name,
  label,
  icon,
  ...extra,
});

export const emails = (uid: string, name: string, label: string, icon = 'IconMail', extra: Extra = {}) => ({
  universalIdentifier: uid,
  type: FieldType.EMAILS as const,
  name,
  label,
  icon,
  ...extra,
});

export const array = (uid: string, name: string, label: string, icon: string, extra: Extra = {}) => ({
  universalIdentifier: uid,
  type: FieldType.ARRAY as const,
  name,
  label,
  icon,
  ...extra,
});

export const json = (uid: string, name: string, label: string, icon = 'IconBraces', extra: Extra = {}) => ({
  universalIdentifier: uid,
  type: FieldType.RAW_JSON as const,
  name,
  label,
  icon,
  ...extra,
});

/** Lato MANY_TO_ONE (contiene la chiave esterna `<name>Id`). */
export const manyToOne = (
  uid: string,
  name: string,
  label: string,
  icon: string,
  targetObject: string,
  targetField: string,
  onDelete: OnDeleteAction = OnDeleteAction.SET_NULL,
) => ({
  universalIdentifier: uid,
  type: FieldType.RELATION as const,
  name,
  label,
  icon,
  relationTargetObjectMetadataUniversalIdentifier: targetObject,
  relationTargetFieldMetadataUniversalIdentifier: targetField,
  universalSettings: { relationType: RelationType.MANY_TO_ONE as const, onDelete, joinColumnName: `${name}Id` },
});

/** Lato ONE_TO_MANY (inverso). */
export const oneToMany = (
  uid: string,
  name: string,
  label: string,
  icon: string,
  targetObject: string,
  targetField: string,
) => ({
  universalIdentifier: uid,
  type: FieldType.RELATION as const,
  name,
  label,
  icon,
  relationTargetObjectMetadataUniversalIdentifier: targetObject,
  relationTargetFieldMetadataUniversalIdentifier: targetField,
  universalSettings: { relationType: RelationType.ONE_TO_MANY as const },
});

// Insiemi di opzioni riusati in più oggetti (stessi valori = stessi filtri e KPI).
export const ESITO_OPTIONS: Opt[] = [
  { value: 'IN_ATTESA', label: 'In attesa di esito', color: 'gray' },
  { value: 'ACCETTATO', label: 'Accettato', color: 'green' },
  { value: 'RIFIUTATO', label: 'Rifiutato', color: 'red' },
  { value: 'INCONTRO_FISSATO', label: 'Incontro fissato', color: 'sky' },
  { value: 'INCONTRO_SVOLTO', label: 'Incontro svolto', color: 'blue' },
  { value: 'OPPORTUNITA', label: 'Opportunità', color: 'violet' },
  { value: 'VENDITA', label: 'Vendita', color: 'jade' },
  { value: 'PERSO', label: 'Perso', color: 'brown' },
];

export const RICORRENZA_OPTIONS: Opt[] = [
  { value: 'UNA_TANTUM', label: 'Una tantum', color: 'gray' },
  { value: 'MENSILE', label: 'Mensile', color: 'sky' },
  { value: 'TRIMESTRALE', label: 'Trimestrale', color: 'blue' },
  { value: 'ANNUALE', label: 'Annuale', color: 'violet' },
];
