import { useCallback, useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar, openCommandConfirmationModal, useSelectedRecordIds } from 'twenty-sdk/front-component';
import { interroga, modifica } from 'src/front-components/lib/api';
import { Button } from 'twenty-ui/primitives/input';
import { Tag } from 'twenty-ui/primitives/data-display';
import { Skeleton } from 'twenty-ui/primitives/feedback';
import { Text } from 'twenty-ui/primitives/typography';
import { useTheme } from 'twenty-ui/theme';
import { ID } from 'src/constants/ids';
import { messaggioErrore } from 'src/front-components/lib/membro';

type Riga = { n: number; nome: string; email: string | null; azienda: string | null; esito: string; esitoTesto: string; messaggi: string[] };
type Riepilogo = {
  fase: 'anteprima' | 'esito';
  file: string;
  colonne: Array<{ intestazione: string; etichetta: string | null }>;
  totali: Record<string, number>;
  righe: Riga[];
};
type Lotto = { id: string; stato: string; messaggio: string | null; riepilogo: Riepilogo | null; campagna: { nome: string } | null };

const COLORE: Record<string, 'green' | 'blue' | 'gray' | 'amber' | 'red' | 'orange'> = {
  NUOVO: 'green',
  PERSONA_ESISTENTE: 'blue',
  GIA_IN_CAMPAGNA: 'gray',
  DA_VERIFICARE: 'amber',
  ESCLUSO_OPPOSIZIONE: 'orange',
  DUPLICATO_NEL_FILE: 'gray',
  ERRORE: 'red',
};
const VOCI: Array<[string, string]> = [
  ['NUOVO', 'nuovi'],
  ['PERSONA_ESISTENTE', 'già nel CRM'],
  ['DA_VERIFICARE', 'da verificare'],
  ['GIA_IN_CAMPAGNA', 'già in campagna'],
  ['ESCLUSO_OPPOSIZIONE', 'esclusi per opposizione'],
  ['DUPLICATO_NEL_FILE', 'ripetuti nel file'],
  ['ERRORE', 'con errori'],
];

/** Anteprima dell'import: cosa succederà riga per riga, prima di confermare. */
const AnteprimaImport = () => {
  const theme = useTheme();
  const [id] = useSelectedRecordIds();
  const [lotto, setLotto] = useState<Lotto | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  const carica = useCallback(async () => {
    if (!id) return;
    try {
      const r = await interroga<{ importLotto: Lotto }>({
        importLotto: { __args: { filter: { id: { eq: id } } }, id: true, stato: true, messaggio: true, riepilogo: true, campagna: { nome: true } },
      });
      setLotto(r.importLotto);
      setErrore(null);
    } catch (e) {
      setErrore(messaggioErrore(e));
    }
  }, [id]);

  useEffect(() => {
    void carica();
    // Mentre l'Hub lavora, aggiorna spesso; poi lentamente.
    const t = setInterval(() => void carica(), lotto && ['ANALISI', 'RICALCOLA', 'CONFERMATO', 'IN_ATTESA_FILE'].includes(lotto.stato) ? 3000 : 20000);
    return () => clearInterval(t);
  }, [carica, lotto?.stato]);

  const comando = async (stato: 'CONFERMATO' | 'RICALCOLA') => {
    if (!lotto) return;
    if (stato === 'CONFERMATO') {
      const t = lotto.riepilogo?.totali ?? {};
      const n = (t.NUOVO ?? 0) + (t.PERSONA_ESISTENTE ?? 0) + (t.DA_VERIFICARE ?? 0);
      const ok = await openCommandConfirmationModal({
        title: `Importare ${n} lead in ${lotto.campagna?.nome ?? 'campagna'}?`,
        subtitle: 'Le righe con errori, i duplicati e i contatti con opposizione restano fuori. Puoi ripetere l’import: non crea doppioni.',
        confirmButtonText: 'Conferma import',
        confirmButtonAccent: 'blue',
      });
      if (ok !== 'confirm') return;
    }
    setInvio(true);
    try {
      await modifica({ updateImportLotto: { __args: { id: lotto.id, data: { stato } }, id: true } });
      await enqueueSnackbar({ message: stato === 'CONFERMATO' ? 'Import avviato' : 'Ricalcolo avviato', variant: 'success' });
      await carica();
    } catch (e) {
      await enqueueSnackbar({ message: messaggioErrore(e), variant: 'error' });
    } finally {
      setInvio(false);
    }
  };

  const col = { display: 'flex', flexDirection: 'column' as const, gap: theme.spacing[3] };
  if (errore) return <Text color="secondary">{errore}</Text>;
  if (!lotto) return <Skeleton height={80} />;

  const r = lotto.riepilogo;
  const lavorando = ['ANALISI', 'RICALCOLA', 'CONFERMATO'].includes(lotto.stato);
  return (
    <div style={col}>
      <Text weight="semibold" size="lg">
        {lotto.stato === 'COMPLETATO' ? 'Import completato' : lotto.stato === 'ANTEPRIMA_PRONTA' ? 'Anteprima dell’import' : 'Import lead'}
      </Text>
      {lotto.messaggio && <Text color="secondary">{lotto.messaggio}</Text>}
      {lotto.stato === 'IN_ATTESA_FILE' && (
        <Text color="tertiary">Allega il file nel campo «File (CSV o Excel)» e scegli la campagna: l’anteprima compare qui in pochi secondi. Niente viene importato senza conferma.</Text>
      )}
      {lavorando && <Skeleton height={48} />}

      {r && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
            {VOCI.filter(([k]) => (r.totali[k] ?? 0) > 0).map(([k, testo]) => (
              <Tag key={k} color={COLORE[k] ?? 'gray'} variant="soft">{`${r.totali[k]} ${testo}`}</Tag>
            ))}
          </div>
          <Text size="sm" color="tertiary">
            {`${r.totali.righe ?? 0} righe da «${r.file}». Colonne: ${r.colonne.map((c) => (c.etichetta ? `${c.intestazione} → ${c.etichetta}` : `${c.intestazione} (ignorata)`)).join(', ')}.`}
          </Text>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: theme.spacing[1] }}>
            {r.righe.map((x) => (
              <li key={x.n} style={{ display: 'grid', gridTemplateColumns: '3.2em minmax(0,1fr)', gap: theme.spacing[2], padding: `${theme.spacing[1]} 0`, borderBottom: `1px solid ${theme.border.color.light}` }}>
                <Text size="sm" color="tertiary">{`r. ${x.n}`}</Text>
                <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text weight="medium" truncate>{x.nome || x.email || '(senza nome)'}</Text>
                    <Tag color={COLORE[x.esito] ?? 'gray'} variant="soft">{x.esitoTesto}</Tag>
                  </div>
                  {(x.email || x.azienda) && <Text size="sm" color="secondary" truncate>{[x.email, x.azienda].filter(Boolean).join(', ')}</Text>}
                  {x.messaggi.map((m) => <Text key={m} size="sm" color="secondary">{m}</Text>)}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {lotto.stato === 'ANTEPRIMA_PRONTA' && (
        <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
          <Button variant="solid" color="accent" loading={invio} disabled={invio} onClick={() => void comando('CONFERMATO')}>Conferma import</Button>
          <Button variant="outline" color="neutral" disabled={invio} onClick={() => void comando('RICALCOLA')}>Ricalcola anteprima</Button>
        </div>
      )}
      {lotto.stato === 'ERRORE' && (
        <div>
          <Button variant="outline" color="neutral" disabled={invio} onClick={() => void comando('RICALCOLA')}>Riprova l’analisi</Button>
        </div>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: ID['fc.anteprimaImport'],
  name: 'anteprima-import',
  description: 'Anteprima riga per riga e conferma dell’import di lead',
  component: AnteprimaImport,
});
