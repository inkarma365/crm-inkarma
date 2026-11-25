import { CoreApiClient } from 'twenty-client-sdk/core';

// Query e mutation con tipi dichiarati qui: il client tipizzato di Twenty viene generato solo da
// `twenty app apply` contro un server, quindi il codice non deve dipendere dai suoi tipi
// (in CI non c'è un server). Le forme dei dati sono documentate nei tipi dei singoli componenti.
export const interroga = <T>(selezione: Record<string, unknown>): Promise<T> =>
  new CoreApiClient().query(selezione as never) as Promise<T>;

export const modifica = <T = unknown>(selezione: Record<string, unknown>): Promise<T> =>
  new CoreApiClient().mutation(selezione as never) as Promise<T>;
