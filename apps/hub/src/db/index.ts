import { Kysely, Migrator, PostgresDialect, type Migration, type MigrationProvider } from 'kysely';
import pg from 'pg';
import type { DB } from './schema.ts';
import * as m0001 from './migrations/0001_base.ts';

export type Db = Kysely<DB>;

export const createDb = (connectionString: string, max = 8): Db =>
  new Kysely<DB>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString, max }) }),
  });

/** Migrazioni registrate staticamente: l'ordine è il nome, l'elenco è versionato nel codice. */
const migrations: Record<string, Migration> = {
  '0001_base': m0001,
};

class StaticProvider implements MigrationProvider {
  async getMigrations() {
    return migrations;
  }
}

export const migrateToLatest = async (db: Db): Promise<string[]> => {
  const migrator = new Migrator({ db, provider: new StaticProvider() });
  const { error, results } = await migrator.migrateToLatest();
  if (error) throw error;
  return (results ?? []).filter((r) => r.status === 'Success').map((r) => r.migrationName);
};
