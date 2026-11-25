import {
  getSystemRecordPageLayoutUniversalIdentifier,
} from 'twenty-sdk/define';
import { ID } from 'src/constants/ids';
import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

/** Pagina record generata dal server per un oggetto di questa app. */
export const systemRecordPage = (objectUniversalIdentifier: string) =>
  getSystemRecordPageLayoutUniversalIdentifier({
    objectMetadataApplicationUniversalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
    objectUniversalIdentifier,
  });

export const COMMESSA_PAGE = systemRecordPage(ID['commessa']);
