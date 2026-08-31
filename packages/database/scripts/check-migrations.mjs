import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { assertMigrationIsNonDestructive } from './migration-safety.mjs';

const migrationDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');
const files = (await readdir(migrationDirectory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort();

for (const file of files) {
  const source = await readFile(path.join(migrationDirectory, file), 'utf8');
  assertMigrationIsNonDestructive(file, source);
}

console.log(`Validated ${files.length} non-destructive database migrations.`);
