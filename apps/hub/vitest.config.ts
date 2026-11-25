import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // PGlite condivisa per file: i test di un file girano in sequenza.
    sequence: { concurrent: false },
  },
});
