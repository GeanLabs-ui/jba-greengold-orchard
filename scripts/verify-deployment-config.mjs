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
const expectedPrimaryBucket = `jba-greengold-files-${environment}`;
const expectedBackupBucket = `${expectedPrimaryBucket}-backup`;
const primaryBucket = apiEnvironment?.r2_buckets?.find((binding) => binding.binding === 'PRIVATE_FILES')?.bucket_name;
const backupBucket = apiEnvironment?.r2_buckets?.find((binding) => binding.binding === 'PRIVATE_FILES_BACKUP')?.bucket_name;
const failures = [];
const expectedAppUrl = environment === 'staging'
  ? 'https://staging.jba-greengold-orchard.pages.dev'
  : 'https://jbagreengoldorchard.farm';

function requiredEnvironmentValue(name) {
  const value = process.env[name]?.trim();
  if (!value) failures.push(`${name} must be configured in the ${environment} GitHub environment`);
  return value || '';
}

const appUrl = requiredEnvironmentValue('APP_URL');
const googleClientId = requiredEnvironmentValue('GOOGLE_CLIENT_ID');
const turnstileSiteKey = requiredEnvironmentValue('TURNSTILE_SITE_KEY');
const turnstileSecretKey = requiredEnvironmentValue('TURNSTILE_SECRET_KEY');
const accountId = requiredEnvironmentValue('CLOUDFLARE_ACCOUNT_ID');
requiredEnvironmentValue('CLOUDFLARE_API_TOKEN');

if (!/^[a-f0-9]{32}$/i.test(hyperdriveId || '') || /^0+$/.test(hyperdriveId || '')) {
  failures.push(`${environment} HYPERDRIVE must contain a real 32-character Cloudflare configuration id`);
}
if (apiEnvironment?.name !== expectedService) {
  failures.push(`${environment} Worker name must be ${expectedService}`);
}
if (pagesService !== expectedService) {
  failures.push(`${environment} Pages API service binding must target ${expectedService}`);
}
if (primaryBucket !== expectedPrimaryBucket) {
  failures.push(`${environment} PRIVATE_FILES must target ${expectedPrimaryBucket}`);
}
if (backupBucket !== expectedBackupBucket || backupBucket === primaryBucket) {
  failures.push(`${environment} PRIVATE_FILES_BACKUP must target the independent ${expectedBackupBucket} bucket`);
}
if (!/^postgres(?:ql)?:\/\//.test(process.env.DATABASE_URL || '')) {
  failures.push('DATABASE_URL must be the direct PostgreSQL/Neon migration connection string');
} else {
  try {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    if (!databaseUrl.hostname.endsWith('.neon.tech')) failures.push('DATABASE_URL must target a Neon hostname');
  } catch {
    failures.push('DATABASE_URL must be a valid PostgreSQL URL');
  }
}
if (accountId && !/^[a-f0-9]{32}$/i.test(accountId)) {
  failures.push('CLOUDFLARE_ACCOUNT_ID must be a 32-character Cloudflare account id');
}
if (googleClientId && !/^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(googleClientId)) {
  failures.push('GOOGLE_CLIENT_ID must be a Google OAuth web client id');
}
if (turnstileSiteKey && !/^[0-9]x[A-Za-z0-9_-]{20,}$/.test(turnstileSiteKey)) {
  failures.push('TURNSTILE_SITE_KEY must be a Cloudflare Turnstile site key');
}
if (turnstileSecretKey && !/^[0-9]x[A-Za-z0-9_-]{20,}$/.test(turnstileSecretKey)) {
  failures.push('TURNSTILE_SECRET_KEY must be a Cloudflare Turnstile secret key');
}
if (environment === 'production' && (/^[123]x0/.test(turnstileSiteKey) || /^[123]x0/.test(turnstileSecretKey))) {
  failures.push('production must use a real Turnstile widget; Cloudflare test keys are not allowed');
}

let appOrigin = '';
try {
  const parsedAppUrl = new URL(appUrl);
  if (parsedAppUrl.protocol !== 'https:' || parsedAppUrl.pathname !== '/' || parsedAppUrl.search || parsedAppUrl.hash) {
    failures.push('APP_URL must be an HTTPS origin with no path, query, or fragment');
  }
  appOrigin = parsedAppUrl.origin;
} catch {
  if (appUrl) failures.push('APP_URL must be a valid URL');
}
if (appUrl && appUrl !== expectedAppUrl) {
  failures.push(`${environment} APP_URL must be ${expectedAppUrl}`);
}

const allowedOrigins = new Set((apiEnvironment?.vars?.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()));
if (appOrigin && !allowedOrigins.has(appOrigin)) {
  failures.push(`${environment} ALLOWED_ORIGINS must include APP_URL (${appOrigin})`);
}
if (appOrigin && apiEnvironment?.vars?.PASSWORD_RESET_URL !== `${appOrigin}/reset-password`) {
  failures.push(`${environment} PASSWORD_RESET_URL must use APP_URL`);
}
if (apiEnvironment?.vars?.APP_ENV !== environment) {
  failures.push(`${environment} APP_ENV must be ${environment}`);
}

if (failures.length) {
  console.error(`Deployment configuration is not ready for ${environment}:`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Deployment configuration verified for ${environment}.`);
