import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
try {
  const report = await sql.begin('read only', async (tx) => {
    const accounts = await tx`
      SELECT u.id, u.role, u.status, u.email_verified_at IS NOT NULL AS email_verified,
        u.google_subject IS NOT NULL AS google_linked, u.password_hash IS NOT NULL AS password_enabled,
        (SELECT count(*)::int FROM entity_records e WHERE e.owner_user_id = u.id) AS owned_records
      FROM users u ORDER BY u.id`;
    const duplicates = await tx`SELECT count(*)::int AS count FROM
      (SELECT lower(trim(email)) FROM users GROUP BY lower(trim(email)) HAVING count(*) > 1) d`;
    const orphanOwners = await tx`SELECT count(*)::int AS count FROM entity_records e
      LEFT JOIN users u ON u.id = e.owner_user_id WHERE e.owner_user_id IS NOT NULL AND u.id IS NULL`;
    const customerRecords = await tx`SELECT e.entity_name, count(*)::int AS records,
      count(*) FILTER (WHERE e.owner_user_id IS NULL)::int AS unassigned,
      count(*) FILTER (WHERE u.role <> 'customer')::int AS staff_owned
      FROM entity_records e LEFT JOIN users u ON u.id = e.owner_user_id
      WHERE e.entity_name IN ('Customer', 'Order', 'Invoice', 'Payment', 'PaymentAttempt', 'Document')
      GROUP BY e.entity_name ORDER BY e.entity_name`;
    const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'account_%' ORDER BY tablename`;
    const invoiceLinks = await tx`SELECT
      count(*) FILTER (WHERE o.id IS NULL)::int AS missing_order,
      count(*) FILTER (WHERE o.id IS NOT NULL AND i.owner_user_id IS DISTINCT FROM o.owner_user_id)::int AS different_owner
      FROM entity_records i LEFT JOIN entity_records o ON o.entity_name = 'Order' AND o.id = i.data->>'order_id'
      WHERE i.entity_name = 'Invoice' AND i.data->>'order_id' IS NOT NULL`;
    const duplicateSubjects = await tx`SELECT count(*)::int AS count FROM
      (SELECT google_subject FROM users WHERE google_subject IS NOT NULL GROUP BY google_subject HAVING count(*) > 1) d`;
    const migrations = await tx`SELECT name FROM _jba_migrations ORDER BY name`;
    const counts = await tx`SELECT (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM entity_records) AS entity_records,
      (SELECT count(*)::int FROM farms) AS farms, (SELECT count(*)::int FROM farm_blocks) AS farm_blocks`;
    return { accounts, duplicateEmails: duplicates[0].count, duplicateGoogleSubjects: duplicateSubjects[0].count, orphanOwners: orphanOwners[0].count, invoiceLinks: invoiceLinks[0], customerRecords, accountTables: tables.map(r => r.tablename), migrations: migrations.map(r => r.name), counts: counts[0] };
  });
  console.log(JSON.stringify(report, null, 2));
} finally { await sql.end(); }
