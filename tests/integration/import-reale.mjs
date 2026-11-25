// Prova d'integrazione dell'import sullo stack reale (Twenty + webhook + Hub).
// Uso: node tests/integration/import-reale.mjs   (via tunnel: Twenty su localhost:33000)
import { readFileSync } from 'node:fs';

const boot = JSON.parse(readFileSync(new URL('../../.secrets/twenty-bootstrap.json', import.meta.url), 'utf8'));
const ids = readFileSync(new URL('../../apps/twenty-app/src/constants/ids.ts', import.meta.url), 'utf8');
const FIELD = /'importLotto\.file': '([0-9a-f-]{36})'/.exec(ids)[1];
const BASE = process.env.TWENTY_URL ?? 'http://localhost:33000';
const H = { authorization: `Bearer ${boot.apiKey}` };
const rest = async (method, path, body) => {
  const r = await fetch(`${BASE}/rest/${path}`, { method, headers: { ...H, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return Object.values(j.data)[0];
};
const attendi = async (id, stati, maxS = 120) => {
  for (let i = 0; i < maxS / 2; i++) {
    const l = await rest('GET', `importLotti/${id}`);
    if (stati.includes(l.stato)) return l;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`timeout in attesa di ${stati}`);
};

// 1. caricamento del file nel campo FILES (multipart GraphQL)
const csv = readFileSync(new URL('../../fixtures/import-esempio.csv', import.meta.url));
const fd = new FormData();
fd.append('operations', JSON.stringify({
  query: 'mutation($f: String!, $file: Upload!) { uploadFilesFieldFileByUniversalIdentifier(fieldMetadataUniversalIdentifier: $f, file: $file) { id path } }',
  variables: { f: FIELD, file: null },
}));
fd.append('map', JSON.stringify({ 0: ['variables.file'] }));
fd.append('0', new Blob([csv], { type: 'text/csv' }), 'import-esempio.csv');
const up = await (await fetch(`${BASE}/metadata`, { method: 'POST', headers: H, body: fd })).json();
if (up.errors) throw new Error(JSON.stringify(up.errors));
const fileId = up.data.uploadFilesFieldFileByUniversalIdentifier.id;
console.log('file caricato', fileId);

// 2. import nella campagna della commessa A
const [campagna] = await rest('GET', `campagne?filter=${encodeURIComponent('nome[eq]:"Architetti e imprese Veneto"')}`);
const prima = (await rest('GET', `appartenenze?limit=200&filter=${encodeURIComponent(`campagnaId[eq]:"${campagna.id}"`)}`)).length;
const lotto = await rest('POST', 'importLotti', { nome: `Prova import ${new Date().toISOString().slice(0, 16)}`, campagnaId: campagna.id, file: [{ fileId, label: 'import-esempio.csv' }] });
const ant = await attendi(lotto.id, ['ANTEPRIMA_PRONTA', 'ERRORE']);
console.log('anteprima:', ant.stato, ant.messaggio, JSON.stringify(ant.riepilogo?.totali));
if (ant.stato !== 'ANTEPRIMA_PRONTA') process.exit(1);

// 3. conferma e riconferma (idempotenza)
await rest('PATCH', `importLotti/${lotto.id}`, { stato: 'CONFERMATO' });
const fine = await attendi(lotto.id, ['COMPLETATO', 'ERRORE']);
console.log('esito:', fine.stato, fine.messaggio);
const dopo = (await rest('GET', `appartenenze?limit=200&filter=${encodeURIComponent(`campagnaId[eq]:"${campagna.id}"`)}`)).length;
await rest('PATCH', `importLotti/${lotto.id}`, { stato: 'CONFERMATO' });
await attendi(lotto.id, ['COMPLETATO', 'ERRORE']);
const ancora = (await rest('GET', `appartenenze?limit=200&filter=${encodeURIComponent(`campagnaId[eq]:"${campagna.id}"`)}`)).length;
console.log(`lead in campagna: prima ${prima}, dopo import ${dopo}, dopo riconferma ${ancora}`);
if (ancora !== dopo) { console.error('DOPPIONI CREATI'); process.exit(1); }
console.log('IMPORT REALE VERIFICATO');
