import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from 'mango-farm-database';

export function getDb(databaseUrl: string) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.');
  }
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}
export type DbType = ReturnType<typeof getDb>;
