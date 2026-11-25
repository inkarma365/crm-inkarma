import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

const MP = process.env.MAILPIT_URL ?? 'http://localhost:33025/api/v1';
const boot = JSON.parse(readFileSync(new URL('../../.secrets/twenty-bootstrap.json', import.meta.url), 'utf8'));

export const twenty = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`${boot.url}/rest/${path}`, {
    method,
    headers: { authorization: `Bearer ${boot.apiKey}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}`);
  return Object.values(j.data)[0] as any;
};

/** Richiede il link di accesso dal portale e lo legge dalla casella di prova (Mailpit). */
export const accedi = async (page: Page, email: string) => {
  const prima = new Date();
  await page.goto('/portale/accesso');
  await page.getByLabel('La tua email di lavoro').fill(email);
  await page.getByRole('button', { name: 'Mandami il link' }).click();
  await page.getByText('Controlla la posta').waitFor();
  let link: string | undefined;
  for (let i = 0; i < 30 && !link; i++) {
    const res = await (await fetch(`${MP}/search?query=${encodeURIComponent(`subject:"link di accesso" to:casella-prova@inkarma.test`)}&limit=5`)).json();
    for (const m of res.messages ?? []) {
      if (new Date(m.Created) < prima) continue;
      const msg = await (await fetch(`${MP}/message/${m.ID}`)).json();
      if (msg.Headers?.['X-Inkarma-Destinatario']?.[0] !== email) continue;
      link = /http:\/\/\S+#t=[A-Za-z0-9_-]+/.exec(msg.Text)?.[0];
      if (link) break;
    }
    if (!link) await new Promise((r) => setTimeout(r, 500));
  }
  if (!link) throw new Error(`nessun link di accesso per ${email}`);
  await page.goto(link.replace(/^http:\/\/[^/]+/, ''));
  await page.getByRole('heading', { name: 'Lead consegnati' }).waitFor();
};
