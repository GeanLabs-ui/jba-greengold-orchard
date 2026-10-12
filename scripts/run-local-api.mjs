import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import workerd from 'workerd';

if (process.platform === 'win32') {
  const probe = spawnSync(workerd.default, ['--version'], { timeout: 15000, windowsHide: true });
  if (probe.error?.code === 'UNKNOWN') {
    console.error('[farm-dev] Windows blocked Cloudflare workerd.exe. Check Windows Security / Code Integrity for the blocked runtime.');
    console.error('[farm-dev] The API cannot run until a trusted Workers runtime is available. npm run dev:web can still serve the public website for review.');
    process.exitCode = 1;
  } else {
    startNativeApi();
  }
} else {
  startNativeApi();
}

function startNativeApi() {
  // Local development uses Miniflare's default Request.cf metadata. Fetching
  // Cloudflare's live metadata makes startup depend on an external network.
  const wranglerCli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
  const child = spawn(process.execPath, [wranglerCli, 'dev', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, CLOUDFLARE_CF_FETCH_ENABLED: 'false' },
  });
  child.once('error', (error) => {
    console.error(`[farm-dev] API startup failed: ${error.message}`);
    process.exitCode = 1;
  });
  child.once('exit', (code) => { process.exitCode = code ?? 1; });
}
