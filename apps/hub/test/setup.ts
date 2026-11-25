import { beforeAll } from 'vitest';
import { makeTestDb } from './helpers.ts';

// Avvia PGlite una volta per worker, fuori dal tempo dei singoli test.
beforeAll(async () => {
  await makeTestDb();
}, 180_000);
