#!/usr/bin/env node
// Mantiene src/constants/ids.ts: ogni chiave ID['...'] usata nel codice riceve un UUID v4
// generato una sola volta. Le chiavi esistenti non cambiano mai (sono identità in Twenty).
// Le chiavi non più usate restano (rimuoverle cancellerebbe entità al prossimo sync).
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;
const OUT = join(SRC, 'constants/ids.ts');

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
});

const existing = {};
try {
  for (const m of readFileSync(OUT, 'utf8').matchAll(/^\s+'([^']+)': '([0-9a-f-]{36})',$/gm)) existing[m[1]] = m[2];
} catch {}

const used = new Set();
for (const f of walk(SRC)) {
  if (f === OUT) continue;
  for (const m of readFileSync(f, 'utf8').matchAll(/\bID\[\s*'([^']+)'\s*\]/g)) used.add(m[1]);
}
let added = 0;
for (const k of used) if (!existing[k]) { existing[k] = randomUUID(); added++; }
const keys = Object.keys(existing).sort();
writeFileSync(OUT, `// GENERATO da scripts/sync-ids.mjs — non modificare a mano i valori: sono identità stabili in Twenty.\nexport const ID = {\n${keys.map((k) => `  '${k}': '${existing[k]}',`).join('\n')}\n} as const;\n`);
console.log(`ids: ${keys.length} chiavi (${added} nuove)`);
