import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupDirectory = path.join(rootDirectory, '.backups', 'database');
const dockerCommand = process.platform === 'win32' ? 'docker.exe' : 'docker';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const databaseUrl = new URL(connectionString);
if (!['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname) || databaseUrl.port !== '54329') throw new Error('db:backup is restricted to the local Docker database.');

await mkdir(backupDirectory, { recursive: true });
const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const finalPath = path.join(backupDirectory, `mango_farm-${timestamp}.dump`);
const partialPath = `${finalPath}.partial`;

function runBackup(args, inputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(dockerCommand, args, { cwd: rootDirectory, stdio: inputPath ? ['pipe', 'ignore', 'pipe'] : ['ignore', 'pipe', 'pipe'] });
    let errorOutput = '';
    child.stderr.setEncoding('utf8'); child.stderr.on('data', (chunk) => { errorOutput += chunk; });
    if (inputPath) createReadStream(inputPath).pipe(child.stdin); else child.stdout.pipe(createWriteStream(partialPath, { flags: 'wx' }));
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(errorOutput.trim() || `Database backup command exited with code ${code}`)));
  });
}

try {
  await runBackup(['compose', 'exec', '-T', 'postgres', 'pg_dump', '--username=mango_farm', '--dbname=mango_farm', '--format=custom', '--no-owner', '--no-privileges']);
  await runBackup(['compose', 'exec', '-T', 'postgres', 'pg_restore', '--list'], partialPath);
  await rename(partialPath, finalPath);
  console.log(`Database backup verified and saved to ${path.relative(rootDirectory, finalPath)}.`);
} catch (error) {
  await rm(partialPath, { force: true });
  throw error;
}
