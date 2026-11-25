import { describe, expect, it } from 'vitest';
import { gestisciImport } from '../src/import/handler.ts';
import { analizza } from '../src/import/pipeline.ts';
import { normalizzaTelefono } from '../src/import/normalizza.ts';
import { TwentyClient } from '../src/twenty/client.ts';
import { FakeTwenty } from './fake-twenty.ts';
import { seedDueCommesse } from './fixture.ts';
import { makeTestDb, testConfig } from './helpers.ts';

const CSV = [
  'Nome;Cognome;Email;Azienda;Ruolo;Telefono;Note',
  'Marta;Riva;marta@riva-design.test;Riva Design;Titolare;347 1234567;Vuole rifare le vetrine',
  'Ugo;Sbaglio;ugo@@sbagliata;Sbaglio Srl;;;',
  'Marta;Riva;MARTA@riva-design.test;Riva Design;Titolare;;',
  'Nadia;Opposta;nadia@nonchiamateci.test;Silenzio Spa;;;',
  'Paolo;Ferri;paolo@ferri-arredi.test;Ferri Arredi Snc;Titolare;;',
  'Sara;Conti;sara.altra@conti.test;Conti Srl;;;',
  ';;;;;;',
].join('\n');

const setup = async () => {
  const db = await makeTestDb();
  const fake = new FakeTwenty();
  const seed = seedDueCommesse(fake);
  fake.insert('opposizioni', { valore: 'nonchiamateci.test', tipo: 'DOMINIO', ambito: 'GLOBALE' });
  const twenty = new TwentyClient(testConfig.TWENTY_URL, testConfig.TWENTY_API_KEY, fake.fetch);
  const noMx = async () => [{ exchange: 'mx.test', priority: 10 }];
  return { db, fake, seed, twenty, noMx };
};

describe('import lead', () => {
  it('normalizza i telefoni italiani', () => {
    expect(normalizzaTelefono('347 123 4567')).toBe('+393471234567');
    expect(normalizzaTelefono('0039 02 1234567')).toBe('+39021234567');
    expect(normalizzaTelefono('+44 20 7946 0000')).toBe('+442079460000');
  });

  it('l’anteprima classifica ogni riga con il motivo', async () => {
    const { twenty, seed } = await setup();
    const a = await analizza(
      twenty,
      { nomeFile: 'lead.csv', contenuto: Buffer.from(CSV), formato: 'AUTOMATICO', campagnaId: seed.campA.id, commessaId: seed.A.id },
      async () => 'VALIDO',
    );
    const per = Object.fromEntries(a.righe.map((r) => [r.n, r.esito]));
    expect(per).toEqual({ 2: 'NUOVO', 3: 'ERRORE', 4: 'DUPLICATO_NEL_FILE', 5: 'ESCLUSO_OPPOSIZIONE', 6: 'PERSONA_ESISTENTE', 7: 'DA_VERIFICARE' });
    expect(a.righe.find((r) => r.n === 3)!.messaggi[0]).toMatch(/Email non valida/);
    expect(a.colonne.find((c) => c.intestazione === 'Note')!.campo).toBe('evidenza');
  });

  it('confermare due volte non crea doppioni e l’opposizione resta esclusa', async () => {
    const { db, fake, twenty, seed } = await setup();
    const lotto = fake.insert('importLotti', {
      nome: 'Import ottobre',
      stato: 'IN_ATTESA_FILE',
      formato: 'AUTOMATICO',
      campagnaId: seed.campA.id,
      file: [{ fileId: 'f1', label: 'lead.csv', url: 'https://crm.example/file/files-field/f1?token=x' }],
    });
    const fetchFile = (async () => new Response(CSV)) as typeof fetch;
    const deps = { db, twenty, twentyUrl: 'http://server:3000', fetchImpl: fetchFile };
    await gestisciImport(deps, lotto.id);
    expect(fake.db.importLotti!.get(lotto.id)!.stato).toBe('ANTEPRIMA_PRONTA');
    const prima = fake.db.appartenenze!.size;

    fake.db.importLotti!.get(lotto.id)!.stato = 'CONFERMATO';
    await gestisciImport(deps, lotto.id);
    expect(fake.db.importLotti!.get(lotto.id)!.stato).toBe('COMPLETATO');
    const dopo = fake.db.appartenenze!.size;
    expect(dopo - prima).toBe(3); // Marta (nuova), Paolo (persona esistente), Sara omonima (in revisione)
    const sara = [...fake.db.appartenenze!.values()].find((a) => a.chiaveImport === `${seed.campA.id}:sara.altra@conti.test`)!;
    expect(sara.revisione).toBe('DA_VERIFICARE');

    // Stesso file riconfermato: nessun nuovo lead.
    fake.db.importLotti!.get(lotto.id)!.stato = 'CONFERMATO';
    await gestisciImport(deps, lotto.id);
    expect(fake.db.appartenenze!.size).toBe(dopo);
    expect([...fake.db.people!.values()].some((p) => (p.emails as { primaryEmail?: string })?.primaryEmail === 'nadia@nonchiamateci.test')).toBe(false);
  });

  it('senza campagna o file spiega cosa manca, senza errori', async () => {
    const { db, fake, twenty } = await setup();
    const lotto = fake.insert('importLotti', { nome: 'x', stato: 'IN_ATTESA_FILE', formato: 'AUTOMATICO', campagnaId: null, file: null });
    await gestisciImport({ db, twenty, twentyUrl: 'http://server:3000' }, lotto.id);
    expect(fake.db.importLotti!.get(lotto.id)!.messaggio).toBe('Scegli la campagna e allega il file CSV o Excel.');
  });
});
