import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { accedi, twenty } from './supporto.ts';

const COMMESSA_A = 'Rossi Serramenti — Lead showroom 2026';

// Ogni esecuzione crea un lead nuovo da valutare, così il test è ripetibile.
const nuovaConsegna = async (suffisso: string) => {
  const [commessa] = await twenty('GET', `commesse?filter=${encodeURIComponent(`nome[eq]:"${COMMESSA_A}"`)}`);
  const [campagna] = await twenty('GET', `campagne?filter=${encodeURIComponent(`commessaId[eq]:"${commessa.id}"`)}`);
  const nome = `Prova${suffisso}`;
  const persona = await twenty('POST', 'people', { name: { firstName: nome, lastName: 'Esito' }, emails: { primaryEmail: `${nome.toLowerCase()}@prova-e2e.test` } });
  const ap = await twenty('POST', 'appartenenze', { titolo: `${nome} Esito`, campagnaId: campagna.id, commessaId: commessa.id, personaId: persona.id, statoFunnel: 'INTERESSATO' });
  const c = await twenty('POST', 'consegneLead', {
    titolo: `${nome} Esito (e2e)`, appartenenzaId: ap.id, commessaId: commessa.id, personaId: persona.id,
    consegnataIl: new Date().toISOString(), evidenza: 'Richiamatemi lunedì per il preventivo.',
  });
  creati.push(['consegneLead', c.id], ['appartenenze', ap.id], ['people', persona.id]);
  return { id: c.id as string, nome: `${nome} Esito` };
};

// Pulizia: i record di prova non restano nella commessa demo (lo storico esiti segue in cascata).
const creati: Array<[string, string]> = [];
test.afterEach(async () => {
  for (const [p, id] of creati.splice(0)) await twenty('DELETE', `${p}/${id}?soft_delete=false`).catch(() => undefined);
});

test('il referente accetta un lead e ne rifiuta un altro con motivo', async ({ page }, info) => {
  const tag = `${info.project.name === 'telefono' ? 'T' : 'D'}${Date.now().toString(36)}`;
  const a = await nuovaConsegna(`${tag}a`);
  const b = await nuovaConsegna(`${tag}b`);
  await accedi(page, 'giulia.rossi@rossi-serramenti.test');

  const bollaA = page.getByRole('article', { name: a.nome });
  await expect(bollaA.getByText('Aspetta il tuo esito')).toBeVisible();
  await bollaA.getByRole('button', { name: 'Accetto' }).click();
  // Il timbro compare nella bolla appena il server conferma (resta visibile, a differenza dell'avviso).
  await page.getByRole('button', { name: /Tutti/ }).click();
  await expect(page.getByRole('article', { name: a.nome }).getByText('Accettato', { exact: true })).toBeVisible({ timeout: 20_000 });

  const bollaB = page.getByRole('article', { name: b.nome });
  await bollaB.getByRole('button', { name: 'Non è in target' }).click();
  const dialogo = page.getByRole('dialog', { name: `Perché ${b.nome} non è in target?` });
  await expect(dialogo.getByRole('button', { name: 'Invia esito' })).toBeDisabled();
  await dialogo.getByLabel('Già nostro cliente').check();
  await dialogo.getByRole('button', { name: 'Invia esito' }).click();
  await expect(dialogo).toBeHidden({ timeout: 20_000 });
  await expect(page.getByRole('article', { name: b.nome }).getByText('Non in target', { exact: true })).toBeVisible({ timeout: 20_000 });

  // Il fatto è registrato in Twenty, con storico.
  const ca = await twenty('GET', `consegneLead/${a.id}`);
  const cb = await twenty('GET', `consegneLead/${b.id}`);
  expect(ca.esito).toBe('ACCETTATO');
  expect(cb.esito).toBe('RIFIUTATO');
  expect(cb.motivoRifiuto).toBe('Già nostro cliente');
  const storico = await twenty('GET', `feedbackLeads?filter=${encodeURIComponent(`consegnaId[eq]:"${b.id}"`)}`);
  expect(storico).toHaveLength(1);
});

test('un lead di un’altra commessa non si apre nemmeno conoscendone l’ID', async ({ page }) => {
  const [commessaB] = await twenty('GET', `commesse?filter=${encodeURIComponent('nome[eq]:"Alfa Impianti — Manutenzioni B2B"')}`);
  const [consegnaB] = await twenty('GET', `consegneLead?filter=${encodeURIComponent(`commessaId[eq]:"${commessaB.id}"`)}`);
  await accedi(page, 'giulia.rossi@rossi-serramenti.test');
  await page.goto(`/portale/lead/${consegnaB.id}`);
  await expect(page.getByText('Questo lead non esiste o non fa parte della tua commessa.')).toBeVisible();
  const api = await page.request.get(`/api/portale/lead/${consegnaB.id}`);
  expect(api.status()).toBe(404);
  expect(await api.text()).not.toContain(consegnaB.titolo);
});

test('accessibilità: nessuna violazione WCAG A/AA su accesso, elenco e dettaglio', async ({ page }) => {
  await page.goto('/portale/accesso');
  const accesso = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accesso.violations.map((v) => v.id)).toEqual([]);
  await accedi(page, 'giulia.rossi@rossi-serramenti.test');
  await page.getByRole('button', { name: /Tutti/ }).click();
  const elenco = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(elenco.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  await page.getByRole('link', { name: 'Luca Bortolin' }).click();
  await page.locator('#scheda-nome', { hasText: 'Luca Bortolin' }).waitFor();
  const dettaglio = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(dettaglio.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
});
