import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const WEB_HOST = '127.0.0.1';
const WEB_PORT = 5173;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const checkPort = () => new Promise((resolveCheck, rejectCheck) => {
  const probe = createServer();

  probe.once('error', rejectCheck);
  probe.listen(WEB_PORT, WEB_HOST, () => {
    probe.close(resolveCheck);
  });
});

console.log(`[farm-dev] Workspace: ${repositoryRoot}`);
console.log(`[farm-dev] Web URL: http://${WEB_HOST}:${WEB_PORT}`);

try {
  await checkPort();
  console.log(`[farm-dev] Port ${WEB_PORT} is available.`);
} catch (error) {
  if (error?.code !== 'EADDRINUSE') throw error;

  console.error(`\n[farm-dev] Cannot start: port ${WEB_PORT} is already in use.`);
  console.error('[farm-dev] The app will not switch to a fallback port.');
  console.error(`[farm-dev] Stop the old dev server, then restart from: ${repositoryRoot}\n`);
  process.exitCode = 1;
}
