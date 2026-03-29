import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { typeOrmEntities } from './typeorm-entities';

config({ path: join(process.cwd(), '.env.local') });
config({ path: join(process.cwd(), '.env') });

function buildPostgresUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return url;
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5432';
  const user = process.env.POSTGRES_USER ?? 'postgres';
  const pass = process.env.POSTGRES_PASSWORD ?? 'postgres';
  const db = process.env.POSTGRES_DB ?? 'dukaan';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
}

export default new DataSource({
  type: 'postgres',
  url: buildPostgresUrl(),
  entities: typeOrmEntities,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
});
