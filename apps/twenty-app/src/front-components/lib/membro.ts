import { CoreApiClient } from 'twenty-client-sdk/core';

/** Il membro del workspace che sta usando la pagina (useUserId restituisce l'utente, non il membro). */
export const membroCorrente = async (userId: string | null): Promise<{ id: string; nome: string } | null> => {
  if (!userId) return null;
  const r = await new CoreApiClient().query({
    workspaceMembers: {
      __args: { filter: { userId: { eq: userId } }, first: 1 },
      edges: { node: { id: true, name: { firstName: true, lastName: true } } },
    },
  });
  const n = r.workspaceMembers?.edges?.[0]?.node;
  return n ? { id: n.id, nome: [n.name?.firstName, n.name?.lastName].filter(Boolean).join(' ') } : null;
};

export const messaggioErrore = (e: unknown) =>
  e instanceof Error && /permission|forbidden/i.test(e.message)
    ? 'Il tuo ruolo non permette questa operazione.'
    : 'Operazione non riuscita. Riprova; se continua, segnala il problema.';
