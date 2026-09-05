import { describe, expect, it } from 'vitest';
import { migrationChecksums, normalizeMigrationSource } from './migration-checksum.mjs';

describe('migration checksums', () => {
  it('uses one canonical checksum for Windows and Unix line endings', () => {
    const unixSource = 'CREATE TABLE example (id integer);\nINSERT INTO example VALUES (1);\n';
    const windowsSource = unixSource.replaceAll('\n', '\r\n');
    const unix = migrationChecksums(unixSource);
    const windows = migrationChecksums(windowsSource);

    expect(normalizeMigrationSource(windowsSource)).toBe(unixSource);
    expect(windows.canonical).toBe(unix.canonical);
    expect(windows.accepted).toEqual(unix.accepted);
  });

  it('still detects a real SQL change', () => {
    const original = migrationChecksums('CREATE TABLE example (id integer);\n');
    const modified = migrationChecksums('CREATE TABLE example (id bigint);\n');
    expect(original.accepted.has(modified.canonical)).toBe(false);
  });
});
