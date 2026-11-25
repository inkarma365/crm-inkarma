import { createDb, migrateToLatest } from './index.ts';

const url = process.env.HUB_DATABASE_URL;
if (!url) throw new Error('HUB_DATABASE_URL mancante');
const db = createDb(url, 1);
const applied = await migrateToLatest(db);
console.log(applied.length ? `Migrazioni applicate: ${applied.join(', ')}` : 'Schema già aggiornato');
await db.destroy();
