import { ViewFilterOperand } from 'twenty-sdk/define';
import { deriveUuid } from 'src/model/derive';

/** Colonne di una vista nell'ordine dato. size in px (opzionale). */
export const columns = (viewId: string, fields: Array<string | [string, number]>) =>
  fields.map((f, position) => {
    const [fieldId, size] = Array.isArray(f) ? f : [f, undefined];
    return {
      universalIdentifier: deriveUuid(viewId, 'col', fieldId),
      fieldMetadataUniversalIdentifier: fieldId,
      position,
      isVisible: true,
      ...(size ? { size } : {}),
    };
  });

export const filter = (viewId: string, fieldId: string, operand: ViewFilterOperand, value: string | string[]) => ({
  universalIdentifier: deriveUuid(viewId, 'filter', fieldId, operand),
  fieldMetadataUniversalIdentifier: fieldId,
  operand,
  value,
});

export const groups = (viewId: string, values: string[]) =>
  values.map((fieldValue, position) => ({
    universalIdentifier: deriveUuid(viewId, 'group', fieldValue),
    fieldValue,
    position,
    isVisible: true,
  }));
