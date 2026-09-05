import { createConnection } from 'node:net';
import { spawn } from 'node:child_process';
import { get } from 'node:http';

const webUrl = 'http://127.0.0.1:5173/';
const apiUrl = 'http://127.0.0.1:8787/api/v1/health';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

async function fetchOk(url, expectedStatus) {
  try {
    const { statusCode, body } = await new Promise((resolve, reject) => {
      const request = get(url, { timeout: 1500 }, (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { responseBody += chunk; });
        response.on('end', () => resolve({ statusCode: response.statusCode, body: responseBody }));
      });
      request.once('timeout', () => request.destroy(new Error('Request timed out.')));
      request.once('error', reject);
    });
    if (statusCode !== 200) return false;
    return !expectedStatus || JSON.parse(body)?.status === expectedStatus;
  } catch {
    return false;
  }
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}

function runNpm(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`npm ${args.join(' ')} exited with code ${code}`)));
  });
}

const [webHealthy, apiHealthy] = await Promise.all([
  fetchOk(webUrl),
  fetchOk(apiUrl, 'ok'),
]);

if (webHealthy && apiHealthy) {
  console.log('[farm-dev] Farm Actual Project is already running and healthy.');
  console.log(`[farm-dev] Web: ${webUrl}`);
  console.log(`[farm-dev] API: ${apiUrl}`);
  process.exit(0);
}

const [webBusy, apiBusy] = await Promise.all([portInUse(5173), portInUse(8787)]);
if (webBusy || apiBusy) {
  const busyPorts = [webBusy && 5173, apiBusy && 8787].filter(Boolean).join(', ');
  throw new Error(
    `Port ${busyPorts} is occupied by an unhealthy or unrelated process. ` +
      'Close that process, then run npm run dev again.',
  );
}

await runNpm(['run', 'dev:setup']);
await runNpm(['run', 'db:backup']);
await runNpm(['run', 'dev:seed']);
await runNpm(['run', 'dev:all']);
