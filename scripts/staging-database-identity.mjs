export const isolatedStaging = Object.freeze({
  project: 'rapid-silence-76969442',
  branch: 'br-morning-pine-b46ahejn',
  host: 'ep-polished-poetry-b465493m.c-6.us-east-2.aws.neon.tech',
  database: 'jba_greengold_staging',
  migrationRole: 'jba_staging_migration_owner',
  runtimeRole: 'jba_staging_runtime_limited',
});

export function stagingMigrationFailures(connectionString) {
  let url;
  try { url = new URL(connectionString); } catch { return ['Staging migration URL is invalid']; }
  const failures = [];
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || url.hostname !== isolatedStaging.host
      || (url.port && url.port !== '5432')
      || decodeURIComponent(url.pathname) !== `/${isolatedStaging.database}`) {
    failures.push('Staging migrations must target the approved isolated Neon database directly');
  }
  if (decodeURIComponent(url.username) !== isolatedStaging.migrationRole || !url.password) {
    failures.push('Staging migrations require the dedicated staging migration role and password');
  }
  if (!['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode'))) {
    failures.push('Staging migrations require TLS');
  }
  if ([...url.searchParams.keys()].some(key => !['sslmode', 'channel_binding'].includes(key))) {
    failures.push('Staging migration URL contains unapproved connection overrides');
  }
  return failures;
}

export function stagingHyperdriveFailures(origin) {
  return origin?.host === isolatedStaging.host
    && Number(origin.port) === 5432
    && origin.database === isolatedStaging.database
    && origin.user === isolatedStaging.runtimeRole
    && origin.scheme === 'postgres'
    ? [] : ['Staging Hyperdrive must target the isolated Neon database with its dedicated runtime role'];
}
