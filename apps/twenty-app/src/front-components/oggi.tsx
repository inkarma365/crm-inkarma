import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, enqueueSnackbar, navigate, useUserId } from 'twenty-sdk/front-component';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { Button } from 'twenty-ui/primitives/input';
import { Tag } from 'twenty-ui/primitives/data-display';
import { Skeleton } from 'twenty-ui/primitives/feedback';
import { Text } from 'twenty-ui/primitives/typography';
import { useTheme } from 'twenty-ui/theme';
import { ID } from 'src/constants/ids';
import { membroCorrente, messaggioErrore } from 'src/front-components/lib/membro';
import { data, giorniFa, relativo } from 'src/front-components/lib/tempo';

type Colore = 'red' | 'amber' | 'blue' | 'violet' | 'gray' | 'orange';

/** Una riga della coda: cosa, chi, perché, quando, e l'azione che la chiude. */
type Voce = {
  chiave: string;
  tipo: string;
  colore: Colore;
  titolo: string;
  contesto: string;
  perche: string;
  citazione: boolean;
  quando: string | null;
  /** più alto = più urgente */
  peso: number;
  apri: { oggetto: string; id: string };
  azione?: { etichetta: string; esegui: () => Promise<string> };
};

const STATI_CALDI = ['RISPOSTA', 'INTERESSATO', 'INCONTRO_FISSATO'] as const;
const nomePersona = (p?: { name?: { firstName?: string; lastName?: string } | null } | null, fallback = 'Lead') =>
  [p?.name?.firstName, p?.name?.lastName].filter(Boolean).join(' ') || fallback;

const Oggi = () => {
  const theme = useTheme();
  const userId = useUserId();
  const [voci, setVoci] = useState<Voce[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [prossima, setProssima] = useState<string | null>(null);
  const [attiva, setAttiva] = useState(0);
  const [occupata, setOccupata] = useState<string | null>(null);
  const contenitore = useRef<HTMLDivElement>(null);

  const carica = useCallback(async () => {
    try {
      const c = new CoreApiClient();
      const ora = new Date();
      const setteGiorniFa = new Date(ora.getTime() - 7 * 86_400_000).toISOString();
      const lead = { id: true, titolo: true, evidenza: true, terminePresaInCarico: true, statoFunnel: true, ownerId: true, persona: { name: { firstName: true, lastName: true } }, commessa: { nome: true } };
      // Una query per fonte, in parallelo (genql non supporta alias sullo stesso campo).
      const elenco = async (plurale: string, filter: Record<string, unknown>, node: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
        ((await c.query({ [plurale]: { __args: { filter, first: 50, ...extra }, edges: { node } } } as never)) as Record<string, { edges: Array<{ node: any }> }>)[plurale]?.edges ?? [];
      const consegna = { id: true, titolo: true, notifica: true, consegnataIl: true, commessa: { nome: true }, persona: { name: { firstName: true, lastName: true } } };
      const [senzaOwner, scaduti, pronti, daVerificare, esitiFermi, notificheKo, prossime] = await Promise.all([
        elenco('appartenenze', { ownerId: { is: 'NULL' }, statoFunnel: { in: [...STATI_CALDI] } }, lead),
        elenco('appartenenze', { ownerId: { is: 'NOT_NULL' }, terminePresaInCarico: { lt: ora.toISOString() }, statoFunnel: { in: [...STATI_CALDI] } }, lead),
        elenco('appartenenze', { prontoPerConsegna: { eq: true } }, lead),
        elenco('appartenenze', { revisione: { eq: 'DA_VERIFICARE' } }, { ...lead, motivoEsclusione: true }),
        elenco('consegneLead', { esito: { eq: 'IN_ATTESA' }, consegnataIl: { lt: setteGiorniFa } }, consegna),
        elenco('consegneLead', { notifica: { in: ['ERRORE', 'BLOCCATA'] } }, consegna),
        elenco('appartenenze', { terminePresaInCarico: { gte: ora.toISOString() } }, { terminePresaInCarico: true }, { orderBy: [{ terminePresaInCarico: 'AscNullsLast' }], first: 1 }),
      ]);
      const r = { senzaOwner: { edges: senzaOwner }, scaduti: { edges: scaduti }, pronti: { edges: pronti }, daVerificare: { edges: daVerificare }, esitiFermi: { edges: esitiFermi }, notificheKo: { edges: notificheKo }, prossime: { edges: prossime } };

      const assegnaAMe = (id: string) => async () => {
        const io = await membroCorrente(userId);
        if (!io) throw new Error('membro non trovato');
        await c.mutation({ updateAppartenenza: { __args: { id, data: { ownerId: io.id } }, id: true } });
        return 'Assegnato a te';
      };

      const out: Voce[] = [];
      for (const { node: n } of r.senzaOwner?.edges ?? []) {
        const t = relativo(n.terminePresaInCarico);
        out.push({
          chiave: `so-${n.id}`, tipo: 'Senza owner', colore: 'amber', titolo: nomePersona(n.persona, n.titolo), contesto: n.commessa?.nome ?? '',
          perche: n.evidenza ?? 'Ha risposto e nessuno l’ha ancora preso in carico.', citazione: !!n.evidenza, quando: n.terminePresaInCarico,
          peso: t.scaduto ? 90 : 70, apri: { oggetto: 'appartenenza', id: n.id }, azione: { etichetta: 'Assegna a me', esegui: assegnaAMe(n.id) },
        });
      }
      for (const { node: n } of r.scaduti?.edges ?? []) {
        out.push({
          chiave: `sc-${n.id}`, tipo: 'Presa in carico scaduta', colore: 'red', titolo: nomePersona(n.persona, n.titolo), contesto: n.commessa?.nome ?? '',
          perche: 'Il termine per prenderlo in carico è passato.', citazione: false, quando: n.terminePresaInCarico, peso: 95,
          apri: { oggetto: 'appartenenza', id: n.id },
        });
      }
      for (const { node: n } of r.pronti?.edges ?? []) {
        out.push({
          chiave: `pr-${n.id}`, tipo: 'Pronto per la consegna', colore: 'blue', titolo: nomePersona(n.persona, n.titolo), contesto: n.commessa?.nome ?? '',
          perche: n.evidenza ?? 'Qualificato: manca solo la consegna al cliente.', citazione: !!n.evidenza, quando: null, peso: 60,
          apri: { oggetto: 'appartenenza', id: n.id },
        });
      }
      for (const { node: n } of r.daVerificare?.edges ?? []) {
        out.push({
          chiave: `dv-${n.id}`, tipo: 'Da verificare', colore: 'violet', titolo: nomePersona(n.persona, n.titolo), contesto: n.commessa?.nome ?? '',
          perche: n.motivoEsclusione ?? 'Contatto incerto (possibile duplicato o identità ambigua).', citazione: false, quando: null, peso: 40,
          apri: { oggetto: 'appartenenza', id: n.id },
        });
      }
      for (const { node: n } of r.esitiFermi?.edges ?? []) {
        out.push({
          chiave: `ef-${n.id}`, tipo: 'Esito mancante', colore: 'gray', titolo: nomePersona(n.persona, n.titolo), contesto: n.commessa?.nome ?? '',
          perche: `Consegnato ${giorniFa(n.consegnataIl)} giorni fa, il cliente non ha ancora indicato com’è andata.`, citazione: false,
          quando: null, peso: 30, apri: { oggetto: 'consegnaLead', id: n.id },
        });
      }
      for (const { node: n } of r.notificheKo?.edges ?? []) {
        out.push({
          chiave: `nk-${n.id}`, tipo: n.notifica === 'BLOCCATA' ? 'Notifica bloccata' : 'Notifica non riuscita', colore: 'orange',
          titolo: nomePersona(n.persona, n.titolo), contesto: n.commessa?.nome ?? '',
          perche: n.notifica === 'BLOCCATA' ? 'I controlli hanno fermato l’avviso al cliente (commessa non attiva, opposizione o dati incoerenti).' : 'L’email al cliente non è partita: l’Hub la ritenta.',
          citazione: false, quando: n.consegnataIl, peso: 80, apri: { oggetto: 'consegnaLead', id: n.id },
        });
      }
      // Una persona compare una volta sola, con il motivo più urgente.
      const visti = new Map<string, Voce>();
      for (const v of out.sort((a, b) => b.peso - a.peso)) if (!visti.has(`${v.apri.oggetto}:${v.apri.id}`)) visti.set(`${v.apri.oggetto}:${v.apri.id}`, v);
      setVoci([...visti.values()]);
      setProssima(r.prossime?.edges?.[0]?.node?.terminePresaInCarico ?? null);
      setErrore(null);
    } catch (e) {
      setErrore(messaggioErrore(e));
    }
  }, [userId]);

  useEffect(() => {
    void carica();
    const t = setInterval(() => void carica(), 30_000);
    return () => clearInterval(t);
  }, [carica]);

  const apri = (v: Voce) => navigate(AppPath.RecordShowPage, { objectNameSingular: v.apri.oggetto, objectRecordId: v.apri.id });
  const esegui = async (v: Voce) => {
    if (!v.azione) return apri(v);
    setOccupata(v.chiave);
    try {
      const msg = await v.azione.esegui();
      await enqueueSnackbar({ message: `${msg}: ${v.titolo}`, variant: 'success' });
      await carica();
    } catch (e) {
      await enqueueSnackbar({ message: messaggioErrore(e), variant: 'error' });
    } finally {
      setOccupata(null);
    }
  };

  const tasti = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!voci?.length) return;
    if (e.key === 'j' || e.key === 'ArrowDown') setAttiva((i) => Math.min(i + 1, voci.length - 1));
    else if (e.key === 'k' || e.key === 'ArrowUp') setAttiva((i) => Math.max(i - 1, 0));
    else if (e.key === 'Enter') void apri(voci[attiva]!);
    else if (e.key === 'a' && voci[attiva]?.azione) void esegui(voci[attiva]!);
    else return;
    e.preventDefault();
  };

  const conteggi = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of voci ?? []) m.set(v.tipo, (m.get(v.tipo) ?? 0) + 1);
    return [...m.entries()];
  }, [voci]);

  const pagina = { padding: `${theme.spacing[6]} ${theme.spacing[8]}`, maxWidth: 980, margin: '0 auto', height: '100%', overflowY: 'auto' as const };

  return (
    <div ref={contenitore} style={pagina} tabIndex={0} onKeyDown={tasti} aria-label="Coda di oggi. Usa j e k per spostarti, Invio per aprire, a per l’azione.">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.spacing[4], marginBottom: theme.spacing[2] }}>
        <Text size="xl" weight="semibold">Oggi</Text>
        <Text size="sm" color="tertiary">j / k per muoverti · Invio apre · a esegue</Text>
      </div>
      {errore && <Text color="secondary">{errore}</Text>}
      {!voci && !errore && (
        <div style={{ display: 'grid', gap: theme.spacing[3], marginTop: theme.spacing[4] }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={64} />)}
        </div>
      )}
      {voci && (
        <>
          <Text color="secondary">
            {voci.length === 0
              ? `Niente in attesa.${prossima ? ` Prossima scadenza: ${data(prossima)} (${relativo(prossima).testo}).` : ''}`
              : `${voci.length} ${voci.length === 1 ? 'cosa richiede' : 'cose richiedono'} attenzione: ${conteggi.map(([t, n]) => `${n} ${t.toLowerCase()}`).join(', ')}.`}
          </Text>
          <ol style={{ listStyle: 'none', margin: `${theme.spacing[4]} 0 0`, padding: 0, display: 'grid', gap: theme.spacing[2] }}>
            {voci.map((v, i) => {
              const t = relativo(v.quando);
              const sel = i === attiva;
              return (
                <li
                  key={v.chiave}
                  onClick={() => setAttiva(i)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: theme.spacing[3],
                    alignItems: 'center',
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    background: sel ? theme.background.tertiary : theme.background.primary,
                    border: `1px solid ${sel ? theme.border.color.strong : theme.border.color.light}`,
                    borderRadius: theme.border.radius.md,
                  }}
                >
                  <div style={{ display: 'grid', gap: theme.spacing[1], minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], flexWrap: 'wrap' }}>
                      <Tag color={v.colore} variant="soft">{v.tipo}</Tag>
                      <Text weight="semibold">{v.titolo}</Text>
                      {v.contesto && <Text size="sm" color="tertiary">{v.contesto}</Text>}
                      {t.testo && (
                        <Text size="sm" color={t.scaduto ? 'primary' : 'tertiary'} weight={t.scaduto ? 'semibold' : 'regular'}>
                          {t.testo}
                        </Text>
                      )}
                    </div>
                    <Text color="secondary" lineClamp={2} style={v.citazione ? { fontStyle: 'italic' } : undefined}>
                      {v.citazione ? `“${v.perche}”` : v.perche}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', gap: theme.spacing[2] }}>
                    {v.azione && (
                      <Button size="sm" variant="solid" color="accent" loading={occupata === v.chiave} disabled={!!occupata} onClick={() => void esegui(v)}>
                        {v.azione.etichetta}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" color="neutral" onClick={() => void apri(v)}>
                      Apri
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: ID['fc.oggi'],
  name: 'oggi',
  description: 'Coda unica di ciò che richiede attenzione oggi',
  component: Oggi,
});
