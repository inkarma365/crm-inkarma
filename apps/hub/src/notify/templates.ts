// Template delle email di servizio, versionati: una modifica sostanziale crea v2, la v1 resta
// per ricostruire cosa è stato inviato. Ogni template produce HTML e testo semplice.
// Identità visiva allineata al portale (sistema "Bolla"): inchiostro #1B2140, copiativo #4A3DCC.

export type Rendered = { subject: string; html: string; text: string; template: string; version: number };

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const layout = (title: string, bodyHtml: string, footer: string) => `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${esc(title)}</title></head>
<body style="margin:0;background:#F4F6F9;font-family:Arial,Helvetica,sans-serif;color:#1B2140">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #D5DAE3;border-radius:6px">
<tr><td style="padding:20px 24px 4px;font-size:15px;font-weight:bold;letter-spacing:.2px">inKarma</td></tr>
<tr><td style="padding:8px 24px 24px;font-size:16px;line-height:1.55">${bodyHtml}</td></tr>
<tr><td style="padding:14px 24px;border-top:1px dashed #D5DAE3;font-size:12px;line-height:1.5;color:#5A6385">${footer}</td></tr>
</table></td></tr></table></body></html>`;

const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:#4A3DCC;color:#FFFFFF;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold">${esc(label)}</a></p>`;

const FOOTER_SERVIZIO =
  'Email di servizio relativa alla tua commessa con inKarma. Non contiene promozioni e non serve un consenso marketing per riceverla.';

export const accessoPortaleV1 = (p: { nome: string; link: string; scadenzaMinuti: number }): Rendered => ({
  template: 'accesso-portale',
  version: 1,
  subject: 'Il tuo link di accesso all’area clienti inKarma',
  html: layout(
    'Accesso area clienti',
    `<p style="margin:0 0 12px">Ciao ${esc(p.nome)},</p>
<p style="margin:0 0 12px">usa questo link per entrare nell’area clienti. Vale ${p.scadenzaMinuti} minuti e funziona una sola volta.</p>
${button(p.link, 'Entra nell’area clienti')}
<p style="margin:0;color:#5A6385;font-size:14px">Se non hai chiesto tu l’accesso, ignora questa email: senza il link nessuno può entrare.</p>`,
    FOOTER_SERVIZIO,
  ),
  text: `Ciao ${p.nome},

usa questo link per entrare nell'area clienti inKarma. Vale ${p.scadenzaMinuti} minuti e funziona una sola volta:
${p.link}

Se non hai chiesto tu l'accesso, ignora questa email.

--
${FOOTER_SERVIZIO}`,
});

export const leadProntoV1 = (p: {
  nomeReferente: string;
  commessa: string;
  lead: string;
  azienda: string | null;
  evidenza: string | null;
  link: string;
}): Rendered => ({
  template: 'lead-pronto',
  version: 1,
  subject: `Nuovo lead consegnato: ${p.lead}${p.azienda ? ` (${p.azienda})` : ''}`,
  html: layout(
    'Nuovo lead consegnato',
    `<p style="margin:0 0 12px">Ciao ${esc(p.nomeReferente)},</p>
<p style="margin:0 0 12px">per la commessa <strong>${esc(p.commessa)}</strong> abbiamo consegnato un nuovo lead: <strong>${esc(p.lead)}</strong>${p.azienda ? `, ${esc(p.azienda)}` : ''}.</p>
${p.evidenza ? `<blockquote style="margin:0 0 12px;padding:10px 14px;border-left:3px solid #4A3DCC;background:#F4F6F9;font-style:italic">“${esc(p.evidenza)}”</blockquote>` : ''}
<p style="margin:0 0 4px">Quando il tuo commerciale lo ha sentito, indica l’esito: ci serve per qualificare meglio i prossimi.</p>
${button(p.link, 'Apri il lead e indica l’esito')}`,
    FOOTER_SERVIZIO,
  ),
  text: `Ciao ${p.nomeReferente},

per la commessa ${p.commessa} abbiamo consegnato un nuovo lead: ${p.lead}${p.azienda ? `, ${p.azienda}` : ''}.
${p.evidenza ? `\n"${p.evidenza}"\n` : ''}
Quando il tuo commerciale lo ha sentito, indica l'esito:
${p.link}

--
${FOOTER_SERVIZIO}`,
});
