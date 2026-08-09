import { readFileSync } from 'node:fs';

const environment = process.argv.find((arg) => arg.startsWith('--env='))?.slice('--env='.length);
if (!['staging', 'production'].includes(environment)) {
  console.error('Usage: node scripts/verify-deployment-config.mjs --env=staging|production');
  process.exit(1);
}

const apiConfig = JSON.parse(readFileSync(new URL('../apps/api/wrangler.jsonc', import.meta.url), 'utf8'));
const pagesConfig = JSON.parse(readFileSync(new URL('../apps/web/wrangler.jsonc', import.meta.url), 'utf8'));
const apiEnvironment = apiConfig.env?.[environment];
const pagesEnvironment = pagesConfig.env?.[environment === 'staging' ? 'preview' : 'production'];
const hyperdriveId = apiEnvironment?.hyperdrive?.find((binding) => binding.binding === 'HYPERDRIVE')?.id;
const expectedService = `mango-farm-api-${environment}`;
const pagesService = pagesEnvironment?.services?.find((binding) => binding.binding === 'API')?.service;
const failures = [];

if (!/^[a-f0-9]{32}$/i.test(hyperdriveId || '') || /^0+$/.test(hyperdriveId || '')) {
  failures.push(`${environment} HYPERDRIVE must contain a real 32-character Cloudflare configuration id`);
}
if (apiEnvironment?.name !== expectedService) {
  failures.push(`${environment} Worker name must be ${expectedService}`);
}
if (pagesService !== expectedService) {
  failures.push(`${environment} Pages API service binding must target ${expectedService}`);
}
if (!/^postgres(?:ql)?:\/\//.test(process.env.DATABASE_URL || '')) {
  failures.push('DATABASE_URL must be the direct PostgreSQL/Neon migration connection string');
}

if (failures.length) {
  console.error(`Deployment configuration is not ready for ${environment}:`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Deployment configuration verified for ${environment}.`);
