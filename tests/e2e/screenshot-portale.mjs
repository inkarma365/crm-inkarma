// Screenshot del portale reale (via tunnel SSH) per la revisione visiva. Uso: node tests/e2e/screenshot-portale.mjs <cartella>
import { chromium } from '@playwright/test';
const OUT = process.argv[2];
const MP = 'http://localhost:33025/api/v1';
const BASE = 'http://localhost:33010/portale';
const linkFor = async () => {
  const list = await (await fetch(`${MP}/search?query=${encodeURIComponent('subject:"link di accesso"')}&limit=1`)).json();
  const id = list.messages[0].ID;
  const msg = await (await fetch(`${MP}/message/${id}`)).json();
  return /http:\/\/\S+#t=[A-Za-z0-9_-]+/.exec(msg.Text)[0];
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium' });
for (const [nome, viewport] of [['mobile', { width: 375, height: 812 }], ['desktop', { width: 1366, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'it-IT' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/accesso`);
  await page.screenshot({ path: `${OUT}/${nome}-01-accesso.png` });
  await page.getByLabel('La tua email di lavoro').fill('giulia.rossi@rossi-serramenti.test');
  await page.getByRole('button', { name: 'Mandami il link' }).click();
  await page.getByText('Controlla la posta').waitFor();
  await page.screenshot({ path: `${OUT}/${nome}-02-inviato.png` });
  await new Promise((r) => setTimeout(r, 1500));
  await page.goto(await linkFor());
  await page.getByRole('heading', { name: 'Lead consegnati' }).waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${nome}-03-lead.png`, fullPage: true });
  await page.getByRole('button', { name: /Tutti/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${nome}-04-tutti.png`, fullPage: true });
  await page.getByRole('link', { name: 'Luca Bortolin' }).click();
  await page.getByRole('heading', { name: 'Luca Bortolin' }).waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${nome}-05-dettaglio.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log('ok');
