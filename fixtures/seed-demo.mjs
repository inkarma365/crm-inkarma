#!/usr/bin/env node
// Dati sintetici per la demo e i test d'integrazione (nessun dato reale).
// Due commesse: Rossi Serramenti (A) e Alfa Impianti (B).
// "Ferri Arredi" è cliente dell'agenzia (opportunità e commessa propria) E prospect nella campagna di A.
// Idempotente: se la commessa A esiste già, non crea nulla.
// Uso: node fixtures/seed-demo.mjs   (usa la API key admin in .secrets/twenty-bootstrap.json)
import { readFileSync } from 'node:fs';

const boot = JSON.parse(readFileSync(new URL('../.secrets/twenty-bootstrap.json', import.meta.url), 'utf8'));
const BASE = process.env.TWENTY_URL ?? boot.url;

const api = async (method, path, body) => {
  const r = await fetch(`${BASE}/rest/${path}`, {
    method,
    headers: { authorization: `Bearer ${boot.apiKey}`, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return Object.values(j.data)[0];
};
const crea = (plural, data) => api('POST', plural, data);
const eur = (n) => ({ amountMicros: Math.round(n * 1_000_000), currencyCode: 'EUR' });
const giorniFa = (g, ora = 9) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - g);
  d.setUTCHours(ora, 0, 0, 0);
  return d.toISOString();
};

const esistenti = await api('GET', `commesse?filter=${encodeURIComponent('nome[eq]:"Rossi Serramenti — Lead showroom 2026"')}`);
if (esistenti.length) {
  console.log('Dati demo già presenti: nessuna modifica.');
  process.exit(0);
}

// ---------- Catalogo servizi ----------
const sLead = await crea('servizi', { nome: 'Lead generation B2B', categoria: 'LEAD_GENERATION', prezzoListino: eur(1200), ricorrenza: 'MENSILE' });
const sSeo = await crea('servizi', { nome: 'SEO locale', categoria: 'SEO', prezzoListino: eur(450), ricorrenza: 'MENSILE' });
const sWeb = await crea('servizi', { nome: 'Sito vetrina', categoria: 'WEB', prezzoListino: eur(3500), ricorrenza: 'UNA_TANTUM' });
await crea('servizi', { nome: 'Automazioni n8n', categoria: 'AUTOMAZIONE', prezzoListino: eur(900), ricorrenza: 'UNA_TANTUM' });

// ---------- Clienti dell'agenzia ----------
const rossi = await crea('companies', { name: 'Rossi Serramenti Srl', domainName: { primaryLinkUrl: 'https://rossi-serramenti.test' }, employees: 35 });
const alfa = await crea('companies', { name: 'Alfa Impianti Spa', domainName: { primaryLinkUrl: 'https://alfa-impianti.test' }, employees: 120 });
const ferri = await crea('companies', { name: 'Ferri Arredi Snc', domainName: { primaryLinkUrl: 'https://ferri-arredi.test' }, employees: 12 });

const A = await crea('commesse', {
  nome: 'Rossi Serramenti — Lead showroom 2026',
  stato: 'ATTIVA',
  clienteId: rossi.id,
  referenteEmail: { primaryEmail: 'giulia.rossi@rossi-serramenti.test', additionalEmails: [] },
  risultatoPromesso: { markdown: 'Almeno **8 appuntamenti qualificati al mese** con architetti e imprese edili del Veneto.' },
  inizio: '2026-09-01',
});
const B = await crea('commesse', {
  nome: 'Alfa Impianti — Manutenzioni B2B',
  stato: 'ATTIVA',
  clienteId: alfa.id,
  referenteEmail: { primaryEmail: 'marco.bianchi@alfa-impianti.test', additionalEmails: ['commerciale@alfa-impianti.test'] },
  risultatoPromesso: { markdown: 'Contratti di manutenzione con condomini e capannoni in Lombardia.' },
  inizio: '2026-10-01',
});
const C = await crea('commesse', { nome: 'Ferri Arredi — SEO locale', stato: 'ATTIVA', clienteId: ferri.id, inizio: '2026-06-01' });

await crea('serviziCommessa', { nome: 'Lead generation B2B — canone', prezzo: eur(1100), ricorrenza: 'MENSILE', commessaId: A.id, servizioId: sLead.id, decorrenza: '2026-09-01' });
await crea('serviziCommessa', { nome: 'Lead generation B2B — canone', prezzo: eur(1400), ricorrenza: 'MENSILE', commessaId: B.id, servizioId: sLead.id, decorrenza: '2026-10-01' });
await crea('serviziCommessa', { nome: 'SEO locale Treviso', prezzo: eur(400), ricorrenza: 'MENSILE', commessaId: C.id, servizioId: sSeo.id, decorrenza: '2026-06-01' });

await crea('mandati', {
  nome: 'Outreach architetti Veneto',
  stato: 'ATTIVO',
  commessaId: A.id,
  dominiAutorizzati: ['outreach.rossi-serramenti.test'],
  caselleAutorizzate: ['giulia@outreach.rossi-serramenti.test'],
  pubblicoAutorizzato: { markdown: 'Studi di architettura e imprese edili, province di TV, VE, PD, VI.' },
  limiteInviiGiornalieri: 60,
  approvazioneOperativa: true,
  scadenza: '2027-03-31',
});

// Pipeline dell'agenzia (separata dai risultati LeadSpark): vendita del sito a Ferri.
await crea('opportunities', { name: 'Ferri Arredi — nuovo sito vetrina', amount: eur(3500), stage: 'PROPOSAL', companyId: ferri.id, closeDate: giorniFa(-20) });
await crea('opportunities', { name: 'Alfa Impianti — estensione SEO', amount: eur(900), stage: 'MEETING', companyId: alfa.id, closeDate: giorniFa(-35) });

// ---------- Campagne ----------
const campA = await crea('campagne', {
  nome: 'Architetti e imprese Veneto',
  stato: 'ATTIVA',
  commessaId: A.id,
  servizioId: sLead.id,
  settore: 'Edilizia e architettura',
  area: 'Veneto',
  profiloIdeale: { markdown: 'Studi con 3+ progetti residenziali all’anno, imprese che ristrutturano showroom o villette.' },
  criteriQualifica: { markdown: '- Progetto con serramenti nei prossimi 6 mesi\n- Budget dichiarato o implicito\n- Decisore raggiunto' },
});
const campB = await crea('campagne', {
  nome: 'Condomini e capannoni Lombardia',
  stato: 'ATTIVA',
  commessaId: B.id,
  servizioId: sLead.id,
  settore: 'Facility management',
  area: 'Lombardia',
});

// ---------- Prospect ----------
const prospect = [
  // [nome, cognome, email, ruolo, azienda(obj|nome), campagna, commessa, stato, evidenza, consegna?]
  ['Paolo', 'Ferri', 'paolo@ferri-arredi.test', 'Titolare', ferri, campA, A, 'INTERESSATO', 'Stiamo rifacendo lo showroom di Treviso: mandateci un preventivo per le vetrate entro marzo.', { giorni: 1 }],
  ['Chiara', 'Zanon', 'c.zanon@studiozanon.test', 'Architetta', 'Studio Zanon Architetti', campA, A, 'INCONTRO_FISSATO', 'Ho tre villette in partenza a primavera, possiamo sentirci giovedì?', { giorni: 3 }],
  ['Luca', 'Bortolin', 'luca@bortolinedilizia.test', 'Responsabile acquisti', 'Bortolin Edilizia', campA, A, 'INTERESSATO', 'Il fornitore attuale non riesce a garantire i tempi, valutiamo alternative.', { giorni: 6, esito: 'ACCETTATO' }],
  ['Elena', 'Furlan', 'elena@furlan-design.test', 'Interior designer', 'Furlan Design', campA, A, 'RISPOSTA', 'Lavoriamo solo su interni, ma giro il contatto al socio.', { giorni: 9, esito: 'RIFIUTATO', motivo: 'Fuori target' }],
  ['Giorgio', 'Pavan', 'g.pavan@pavancostruzioni.test', 'Direttore tecnico', 'Pavan Costruzioni', campA, A, 'INTERESSATO', null, null],
  ['Sara', 'Conti', 'sara.conti@condominiomilano.test', 'Amministratrice', 'Studio Conti Amministrazioni', campB, B, 'INTERESSATO', 'Gestiamo 40 condomini, il contratto di manutenzione scade a gennaio.', { giorni: 2 }],
  ['Andrea', 'Galli', 'andrea@logisticagalli.test', 'Facility manager', 'Logistica Galli', campB, B, 'INCONTRO_SVOLTO', 'Abbiamo due capannoni a Lodi con impianti da rifare.', { giorni: 12, esito: 'OPPORTUNITA' }],
];

const aziende = new Map();
let consegne = 0;
for (const [nome, cognome, email, ruolo, az, camp, commessa, stato, evidenza, cons] of prospect) {
  let company = typeof az === 'string' ? aziende.get(az) : az;
  if (!company) {
    company = await crea('companies', { name: az });
    aziende.set(az, company);
  }
  const persona = await crea('people', { name: { firstName: nome, lastName: cognome }, emails: { primaryEmail: email }, jobTitle: ruolo, companyId: company.id });
  const ap = await crea('appartenenze', {
    titolo: `${nome} ${cognome}`,
    campagnaId: camp.id,
    commessaId: commessa.id,
    personaId: persona.id,
    aziendaProspectId: company.id,
    statoFunnel: stato,
    fonte: 'LEADSPARK',
    provenienza: 'Import LeadSpark ottobre 2026',
    dataIngresso: giorniFa(20),
    terminePresaInCarico: giorniFa(-1, 17),
    prontoPerConsegna: !cons && !!evidenza,
    evidenza,
    segnaleMx: 'VALIDO',
    criteri: { soddisfatti: ['Progetto nei prossimi 6 mesi', 'Decisore raggiunto'], mancanti: evidenza ? [] : ['Budget'] },
  });
  if (cons) {
    const c = await crea('consegneLead', {
      titolo: `${nome} ${cognome} → ${commessa.nome.split(' — ')[0]}`,
      appartenenzaId: ap.id,
      commessaId: commessa.id,
      personaId: persona.id,
      consegnataIl: giorniFa(cons.giorni),
      evidenza,
      commercialeNome: commessa === A ? 'Davide Rossi' : 'Marco Bianchi',
      ...(cons.esito
        ? { esito: cons.esito, motivoRifiuto: cons.motivo ?? null, esitoAggiornatoIl: giorniFa(cons.giorni - 1, 15), esitoDa: commessa === A ? 'giulia.rossi@rossi-serramenti.test' : 'marco.bianchi@alfa-impianti.test' }
        : {}),
    });
    if (cons.esito) {
      await crea('feedbackLeads', {
        titolo: `${cons.esito.toLowerCase()} (seed)`,
        esito: cons.esito,
        motivo: cons.motivo ?? null,
        autore: commessa === A ? 'giulia.rossi@rossi-serramenti.test' : 'marco.bianchi@alfa-impianti.test',
        canale: 'PORTALE',
        ricevutoIl: giorniFa(cons.giorni - 1, 15),
        eventId: `seed:${c.id}`,
        consegnaId: c.id,
        commessaId: commessa.id,
      });
    }
    consegne++;
  }
}

// Un'opposizione globale (dominio): blocca qualsiasi comunicazione futura verso quel dominio.
await crea('opposizioni', { valore: 'nonchiamateci.test', tipo: 'DOMINIO', ambito: 'GLOBALE', fonte: 'Risposta email "cancellatemi"', registrataIl: giorniFa(30) });

console.log(`Dati demo creati: 3 commesse, ${prospect.length} prospect, ${consegne} consegne.`);
console.log(`Commessa A: ${A.id}\nCommessa B: ${B.id}`);
