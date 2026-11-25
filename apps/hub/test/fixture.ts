import type { FakeTwenty } from './fake-twenty.ts';

/** Due commesse sintetiche. "Ferri Arredi" è cliente dell'agenzia (commessa B) E prospect nella campagna di A. */
export const seedDueCommesse = (t: FakeTwenty) => {
  const rossi = t.insert('companies', { name: 'Rossi Serramenti Srl' });
  const alfa = t.insert('companies', { name: 'Alfa Impianti Spa' });
  const ferri = t.insert('companies', { name: 'Ferri Arredi Snc' });

  const A = t.insert('commesse', {
    nome: 'Rossi — Lead serramenti 2026',
    stato: 'ATTIVA',
    clienteId: rossi.id,
    referenteEmail: { primaryEmail: 'giulia@rossi-serramenti.test', additionalEmails: [] },
  });
  const B = t.insert('commesse', {
    nome: 'Alfa — Manutenzioni B2B',
    stato: 'ATTIVA',
    clienteId: alfa.id,
    referenteEmail: { primaryEmail: 'marco@alfa-impianti.test', additionalEmails: ['ufficio@alfa-impianti.test'] },
  });

  const campA = t.insert('campagne', { nome: 'Serramenti Veneto', commessaId: A.id, stato: 'ATTIVA' });
  const campB = t.insert('campagne', { nome: 'Manutenzioni Lombardia', commessaId: B.id, stato: 'ATTIVA' });

  const p1 = t.insert('people', { name: { firstName: 'Paolo', lastName: 'Ferri' }, emails: { primaryEmail: 'paolo@ferri-arredi.test' }, jobTitle: 'Titolare' });
  const p2 = t.insert('people', { name: { firstName: 'Sara', lastName: 'Conti' }, emails: { primaryEmail: 'sara@conti.test' } });

  const apA = t.insert('appartenenze', { titolo: 'Paolo Ferri', campagnaId: campA.id, commessaId: A.id, personaId: p1.id, aziendaProspectId: ferri.id, statoFunnel: 'INTERESSATO' });
  const apB = t.insert('appartenenze', { titolo: 'Sara Conti', campagnaId: campB.id, commessaId: B.id, personaId: p2.id, statoFunnel: 'INTERESSATO' });

  const cA = t.insert('consegneLead', {
    titolo: 'Paolo Ferri → Rossi', commessaId: A.id, appartenenzaId: apA.id, personaId: p1.id,
    consegnataIl: '2026-11-20T09:00:00.000Z', esito: 'IN_ATTESA', notifica: 'DA_INVIARE',
    evidenza: 'Stiamo rifacendo lo showroom, mandateci un preventivo entro marzo.',
  });
  const cB = t.insert('consegneLead', {
    titolo: 'Sara Conti → Alfa', commessaId: B.id, appartenenzaId: apB.id, personaId: p2.id,
    consegnataIl: '2026-11-21T09:00:00.000Z', esito: 'IN_ATTESA', notifica: 'DA_INVIARE',
    evidenza: 'Valutiamo un nuovo fornitore per la manutenzione.',
  });
  return { A, B, campA, campB, cA, cB, apA, apB, p1, p2, ferri };
};
