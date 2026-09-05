import { constants } from 'node:fs';
import { access, copyFile, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const environmentPath = path.join(rootDirectory, '.env');
const exampleEnvironmentPath = path.join(rootDirectory, '.env.example');
const volumeName = 'farmactualproject_mango_farm_postgres_data';
const localDatabasePort = '54329';
const dockerCommand = process.platform === 'win32' ? 'docker.exe' : 'docker';

async function exists(filePath) {
  try { await access(filePath, constants.F_OK); return true; } catch { return false; }
}

function readVariable(source, name) {
  const line = source.split(/\r?\n/).find((entry) => entry.trim().startsWith(`${name}=`));
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : '';
}

function runDocker(args, options = {}) {
  const result = spawnSync(dockerCommand, args, { cwd: rootDirectory, encoding: 'utf8', stdio: options.quiet ? 'ignore' : 'inherit' });
  if (result.error?.code === 'ENOENT') throw new Error('Docker was not found. Start Docker Desktop, then run npm run dev again.');
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) throw new Error(`Docker command failed: docker ${args.join(' ')}`);
  return result.status === 0;
}

if (!(await exists(environmentPath))) {
  await copyFile(exampleEnvironmentPath, environmentPath, constants.COPYFILE_EXCL);
  console.log('Created .env from .env.example.');
}

const connectionString = readVariable(await readFile(environmentPath, 'utf8'), 'DATABASE_URL');
let databaseUrl;
try { databaseUrl = new URL(connectionString); } catch { throw new Error('DATABASE_URL in .env must be a valid PostgreSQL URL.'); }
if (!new Set(['127.0.0.1', 'localhost', '::1']).has(databaseUrl.hostname) || databaseUrl.port !== localDatabasePort || databaseUrl.pathname !== '/mango_farm') {
  throw new Error(`npm run dev only accepts the protected local database at 127.0.0.1:${localDatabasePort}/mango_farm. Use deployment workflows for staging or production migrations.`);
}

runDocker(['version'], { quiet: true });
if (!runDocker(['volume', 'inspect', volumeName], { quiet: true, allowFailure: true })) {
  runDocker(['volume', 'create', '--label', 'com.jba.preserve=true', volumeName]);
}
runDocker(['compose', 'up', '-d', '--wait', 'postgres']);
console.log('Local PostgreSQL is healthy and uses the shared protected volume.');
