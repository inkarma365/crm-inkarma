// Screenshot delle estensioni dentro Twenty (pagina Oggi, scheda Consegna). Uso: node tests/e2e/screenshot-twenty.mjs <cartella>
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
const OUT = process.argv[2];
const boot = JSON.parse(readFileSync(new URL('../../.secrets/twenty-bootstrap.json', import.meta.url), 'utf8'));
const BASE = process.env.TWENTY_PUBLIC_URL ?? 'https://crm.inkarma.it';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'it-IT' });
await page.goto(`${BASE}/`);
await page.getByPlaceholder('Email').fill(boot.adminEmail);
await page.getByRole('button', { name: 'Continua' }).click();
await page.locator('input[type="password"]').first().fill(boot.adminPassword);
await page.keyboard.press('Enter');
await page.waitForTimeout(5000);
// Onboarding iniziale (solo la prima volta): profilo, poi passi facoltativi saltati.
for (let i = 0; i < 10; i++) {
  if (await page.getByText('Crea profilo').isVisible().catch(() => false)) {
    await page.getByPlaceholder('Tim').fill('Amministratore');
    await page.getByPlaceholder('Apple').fill('inKarma');
    await page.getByRole('button', { name: 'Continua' }).click();
  } else {
    const avanti = page.getByRole('button', { name: /^(Ignora comunque|Salta|Continua|Skip|Inizia|Avanti|Inizia a usare)/ }).first();
    if (!(await avanti.isVisible().catch(() => false))) break;
    await avanti.click();
  }
  await page.waitForTimeout(3000);
}
await page.screenshot({ path: `${OUT}/twenty-01-home.png` });
await page.getByText('Oggi', { exact: true }).first().click();
await page.waitForTimeout(7000);
await page.screenshot({ path: `${OUT}/twenty-02-oggi.png` });
// Navigazione dalla coda: "Apri" sulla riga del lead (prova anche navigate() della front component).
await page.locator('li', { hasText: 'Giorgio Pavan' }).getByRole('button', { name: 'Apri' }).click();
await page.waitForTimeout(8000);
// La scheda "Consegna" (prima scheda aggiunta) Twenty la mostra nella colonna sinistra della pagina record.
await page.getByText('Scheda di consegna').waitFor({ timeout: 20_000 });
await page.screenshot({ path: `${OUT}/twenty-03-consegna.png` });
await browser.close();
console.log('ok');
