const destructivePatterns = [
  { label: 'TRUNCATE', pattern: /\bTRUNCATE\b/i },
  { label: 'DELETE FROM', pattern: /\bDELETE\s+FROM\b/i },
  { label: 'DROP SCHEMA', pattern: /\bDROP\s+SCHEMA\b/i },
  { label: 'ALTER TABLE ... DROP COLUMN', pattern: /\bALTER\s+TABLE\b[\s\S]*\bDROP\s+COLUMN\b/i },
];

function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\r\n]*/g, ' ')
    .replace(/'(?:''|[^'])*'/g, "''");
}

function isTemporaryMigrationTableDrop(statement) {
  const match = statement.match(/^\s*DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(.+)$/i);
  if (!match) return false;

  return match[1]
    .split(',')
    .map((name) => name.trim().replace(/^public\./i, '').replace(/^"|"$/g, ''))
    .every((name) => /^_migration_[a-z0-9_]+$/i.test(name));
}

export function findDestructiveMigrationStatements(source) {
  const statements = stripCommentsAndStrings(source)
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  return statements.flatMap((statement) => {
    if (/^DROP\s+TABLE\b/i.test(statement) && !isTemporaryMigrationTableDrop(statement)) {
      return [{ label: 'DROP TABLE', statement }];
    }

    return destructivePatterns
      .filter(({ pattern }) => pattern.test(statement))
      .map(({ label }) => ({ label, statement }));
  });
}

export function assertMigrationIsNonDestructive(file, source) {
  const violations = findDestructiveMigrationStatements(source);
  if (violations.length === 0) return;

  const operations = [...new Set(violations.map(({ label }) => label))].join(', ');
  throw new Error(
    `Blocked destructive migration ${file}: ${operations}. ` +
      'Deployments must preserve existing data; use an explicitly reviewed, out-of-band data maintenance procedure instead.',
  );
}
