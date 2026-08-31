import { describe, expect, it } from 'vitest';
import { assertMigrationIsNonDestructive, findDestructiveMigrationStatements } from './migration-safety.mjs';

describe('migration safety', () => {
  it('blocks statements that can erase application data', () => {
    const source = `
      TRUNCATE TABLE users, farms RESTART IDENTITY CASCADE;
      DELETE FROM customers;
      DROP TABLE orders;
      ALTER TABLE users DROP COLUMN email;
      DROP SCHEMA public CASCADE;
    `;

    expect(() => assertMigrationIsNonDestructive('0099_reset.sql', source)).toThrow(
      /Blocked destructive migration 0099_reset\.sql/,
    );
    expect(findDestructiveMigrationStatements(source).map(({ label }) => label)).toEqual(
      expect.arrayContaining(['TRUNCATE', 'DELETE FROM', 'DROP TABLE', 'ALTER TABLE ... DROP COLUMN', 'DROP SCHEMA']),
    );
  });

  it('allows cleanup of migration-only scratch tables', () => {
    expect(() =>
      assertMigrationIsNonDestructive(
        '0007_backfill.sql',
        'DROP TABLE IF EXISTS _migration_0007_map; DROP TABLE public._migration_0007_rows;',
      ),
    ).not.toThrow();
  });

  it('ignores destructive words in comments and string literals', () => {
    expect(() =>
      assertMigrationIsNonDestructive(
        '0020_safe.sql',
        "-- DELETE FROM users\nINSERT INTO audit_events (action) VALUES ('TRUNCATE TABLE farms');",
      ),
    ).not.toThrow();
  });
});
