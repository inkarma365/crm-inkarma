import { useCallback, useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar, openCommandConfirmationModal, useSelectedRecordIds, useUserId } from 'twenty-sdk/front-component';
import { interroga, modifica } from 'src/front-components/lib/api';
import { Button, Input } from 'twenty-ui/primitives/input';
import { Tag } from 'twenty-ui/primitives/data-display';
import { Skeleton } from 'twenty-ui/primitives/feedback';
import { Text } from 'twenty-ui/primitives/typography';
import { IconCheck, IconQuestionMark, IconSend } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { ID } from 'src/constants/ids';
import { membroCorrente, messaggioErrore } from 'src/front-components/lib/membro';
import { dataOra } from 'src/front-components/lib/tempo';

type Criteri = { soddisfatti?: string[]; mancanti?: string[] } | null;
type Lead = {
  id: string;
  titolo: string | null;
  evidenza: string | null;
  criteri: Criteri;
  statoFunnel: string | null;
  commessa: { id: string; nome: string; stato: string } | null;
  campagna: { nome: string } | null;
  persona: { id: string; name: { firstName: string; lastName: string } | null; emails: { primaryEmail: string | null } | null } | null;
  aziendaProspect: { name: string } | null;
  consegne: { edges: Array<{ node: { id: string; consegnataIl: string | null; esito: string; notifica: string; commercialeNome: string | null } }> } | null;
};

const NOTIFICA: Record<string, string> = {
  DA_INVIARE: 'notifica in invio',
  INVIATA: 'notifica inviata al cliente',
  ERRORE: 'notifica non riuscita: verrà ritentata',
  BLOCCATA: 'notifica bloccata dai controlli (vedi audit)',
};
const ESITO: Record<string, string> = {
  IN_ATTESA: 'esito atteso dal cliente',
  ACCETTATO: 'accettato dal cliente',
  RIFIUTATO: 'rifiutato dal cliente',
  INCONTRO_FISSATO: 'incontro fissato',
  INCONTRO_SVOLTO: 'incontro svolto',
  OPPORTUNITA: 'trattativa aperta',
  VENDITA: 'venduto',
  PERSO: 'perso',
};

/**
 * Scheda di consegna: tutto ciò che serve per decidere se consegnare il lead al committente,
 * e il pulsante che lo fa. La consegna è un record di comando: l'Hub ricontrolla commessa,
 * coerenza e opposizioni prima di notificare il cliente.
 */
const SchedaConsegna = () => {
  const theme = useTheme();
  const [recordId] = useSelectedRecordIds();
  const userId = useUserId();
  const [lead, setLead] = useState<Lead | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [commerciale, setCommerciale] = useState('');
  const [invio, setInvio] = useState(false);

  const carica = useCallback(async () => {
    if (!recordId) return;
    try {
      const r = await interroga<{ appartenenza: Lead | null }>({
        appartenenza: {
          __args: { filter: { id: { eq: recordId } } },
          id: true,
          titolo: true,
          evidenza: true,
          criteri: true,
          statoFunnel: true,
          commessa: { id: true, nome: true, stato: true },
          campagna: { nome: true },
          persona: { id: true, name: { firstName: true, lastName: true }, emails: { primaryEmail: true } },
          aziendaProspect: { name: true },
          consegne: {
            __args: { orderBy: [{ consegnataIl: 'DescNullsLast' }], first: 5 },
            edges: { node: { id: true, consegnataIl: true, esito: true, notifica: true, commercialeNome: true } },
          },
        },
      });
      setLead((r.appartenenza ?? null) as Lead | null);
      setErrore(null);
    } catch (e) {
      setErrore(messaggioErrore(e));
    }
  }, [recordId]);

  useEffect(() => {
    void carica();
  }, [carica]);

  const stack = { display: 'flex', flexDirection: 'column' as const, gap: theme.spacing[3] };

  if (errore) return <Text color="secondary">{errore}</Text>;
  if (!lead)
    return (
      <div style={stack} aria-busy="true">
        <Skeleton height={20} />
        <Skeleton height={56} />
        <Skeleton height={32} />
      </div>
    );

  const nome = [lead.persona?.name?.firstName, lead.persona?.name?.lastName].filter(Boolean).join(' ') || lead.titolo || 'Lead';
  const soddisfatti = lead.criteri?.soddisfatti ?? [];
  const mancanti = lead.criteri?.mancanti ?? [];
  const consegne = lead.consegne?.edges.map((e) => e.node) ?? [];
  const commessaAttiva = lead.commessa?.stato === 'ATTIVA';
  const bloccoMotivo = !lead.commessa
    ? 'Il lead non è collegato a una commessa: collegalo prima di consegnarlo.'
    : !commessaAttiva
      ? `La commessa ${lead.commessa.nome} non è attiva: la consegna è sospesa.`
      : !lead.persona
        ? 'Manca la persona da consegnare.'
        : null;

  const consegna = async () => {
    if (!lead.commessa || !lead.persona) return;
    const scelta = await openCommandConfirmationModal({
      title: `Consegnare ${nome} a ${lead.commessa.nome}?`,
      subtitle: 'Il referente del cliente riceve un’email e trova il lead nell’area clienti. La consegna resta nello storico.',
      confirmButtonText: 'Consegna al cliente',
      confirmButtonAccent: 'blue',
    });
    if (scelta !== 'confirm') return;
    setInvio(true);
    try {
      const io = await membroCorrente(userId);
      await modifica({
        createConsegnaLead: {
          __args: {
            data: {
              titolo: `${nome} → ${lead.commessa.nome.split(' — ')[0]}`,
              appartenenzaId: lead.id,
              commessaId: lead.commessa.id,
              personaId: lead.persona.id,
              consegnataIl: new Date().toISOString(),
              evidenza: lead.evidenza,
              commercialeNome: commerciale.trim() || null,
              ...(io ? { consegnataDaId: io.id } : {}),
            },
          },
          id: true,
        },
      });
      await modifica({
        updateAppartenenza: { __args: { id: lead.id, data: { prontoPerConsegna: false } }, id: true },
      });
      await enqueueSnackbar({ message: `${nome} consegnato: notifica al cliente in invio`, variant: 'success' });
      setCommerciale('');
      await carica();
    } catch (e) {
      await enqueueSnackbar({ message: messaggioErrore(e), variant: 'error' });
    } finally {
      setInvio(false);
    }
  };

  return (
    <div style={{ ...stack, gap: theme.spacing[4] }}>
      <div style={stack}>
        <Text size="lg" weight="semibold">
          {nome}
          {lead.aziendaProspect?.name ? `, ${lead.aziendaProspect.name}` : ''}
        </Text>
        <Text color="secondary">
          {lead.commessa ? `Per ${lead.commessa.nome}` : 'Senza commessa'}
          {lead.campagna ? ` · campagna ${lead.campagna.nome}` : ''}
        </Text>
      </div>

      <div style={stack}>
        <Text weight="medium" color="secondary">
          Perché consegnarlo
        </Text>
        {lead.evidenza ? (
          <blockquote
            style={{
              margin: 0,
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              borderLeft: `3px solid ${theme.border.color.blue}`,
              background: theme.background.secondary,
              borderRadius: theme.border.radius.sm,
              fontStyle: 'italic',
              color: theme.font.color.primary,
            }}
          >
            “{lead.evidenza}”
          </blockquote>
        ) : (
          <Text color="tertiary">Nessuna frase di evidenza: il cliente vedrà solo i dati di contatto.</Text>
        )}
      </div>

      <div style={stack}>
        <Text weight="medium" color="secondary">
          Criteri di qualifica
        </Text>
        {soddisfatti.length + mancanti.length === 0 && <Text color="tertiary">Nessun criterio valutato.</Text>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
          {soddisfatti.map((c) => (
            <Tag key={`s-${c}`} color="green" variant="soft" startIcon={<IconCheck size={14} />}>
              {c}
            </Tag>
          ))}
          {mancanti.map((c) => (
            <Tag key={`m-${c}`} color="gray" variant="outline" startIcon={<IconQuestionMark size={14} />}>
              {`${c}: sconosciuto`}
            </Tag>
          ))}
        </div>
      </div>

      {consegne.length > 0 && (
        <div style={stack}>
          <Text weight="medium" color="secondary">
            Consegne
          </Text>
          {consegne.map((c) => (
            <Text key={c.id}>
              {dataOra(c.consegnataIl)}: {NOTIFICA[c.notifica] ?? c.notifica}, {ESITO[c.esito] ?? c.esito}
              {c.commercialeNome ? ` (a ${c.commercialeNome})` : ''}
            </Text>
          ))}
        </div>
      )}

      <div style={{ ...stack, paddingTop: theme.spacing[3], borderTop: `1px dashed ${theme.border.color.medium}` }}>
        {bloccoMotivo ? (
          <Text color="secondary">{bloccoMotivo}</Text>
        ) : (
          <>
            <label style={stack}>
              <Text weight="medium">Commerciale del cliente che lo richiama (facoltativo)</Text>
              <Input value={commerciale} onValueChange={setCommerciale} placeholder="Es. Davide Rossi" />
            </label>
            <div>
              <Button variant="solid" color="accent" startIcon={<IconSend size={16} />} loading={invio} disabled={invio} onClick={consegna}>
                {consegne.length ? 'Consegna di nuovo' : 'Consegna al cliente'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: ID['fc.schedaConsegna'],
  name: 'scheda-consegna',
  description: 'Evidenza, criteri e consegna del lead al committente',
  component: SchedaConsegna,
});
