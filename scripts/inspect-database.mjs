import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
try {
  const columns = await sql`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;
  if (!columns.length) {
    console.log('No tables exist in the public schema. Run npm run db:migrate first.');
  } else {
    console.table(columns);
  }
} catch (error) {
  if (error?.code === '3D000') console.error('The database named in DATABASE_URL does not exist. Copy a valid connection string from Neon.');
  else console.error(`Unable to inspect the database: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
