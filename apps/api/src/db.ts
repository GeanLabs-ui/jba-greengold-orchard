import postgres from 'postgres';

export type Database = ReturnType<typeof postgres>;

type DatabaseEnvironment = Pick<Env, 'HYPERDRIVE' | 'APP_ENV'> & Partial<Pick<Env, 'DATABASE_URL'>>;

export function createDatabase(env: DatabaseEnvironment): Database {
  const connectionString = env.APP_ENV === 'local' && env.DATABASE_URL
    ? env.DATABASE_URL
    : env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
  if (!connectionString) throw new Error('Database binding is not configured');

  // Hyperdrive owns connection pooling. A request-local client prevents state leaking
  // between Worker requests while keeping the upstream connection warm.
  return postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 10,
    connect_timeout: 10,
  });
}

export async function closeDatabase(sql: Database): Promise<void> {
  await sql.end({ timeout: 1 });
}
