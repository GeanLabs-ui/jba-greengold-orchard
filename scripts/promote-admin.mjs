import postgres from 'postgres';

const emailArgument = process.argv.find((argument) => argument.startsWith('--email='));
const email = (emailArgument?.slice('--email='.length) || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const connectionString = process.env.DATABASE_URL;

if (!email || !email.includes('@')) throw new Error('Provide ADMIN_EMAIL or --email=admin@example.com');
if (!connectionString) throw new Error('DATABASE_URL is required');

const sql = postgres(connectionString, { max: 1, prepare: false });
try {
  const rows = await sql`UPDATE users SET role = 'super_admin', status = 'active', updated_at = now() WHERE email = ${email} RETURNING id, email, role`;
  if (!rows[0]) throw new Error('No registered user was found for that email');
  console.log(`Promoted ${rows[0].email} to ${rows[0].role}.`);
} finally {
  await sql.end();
}
