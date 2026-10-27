import { describe, it, expect } from 'vitest';
import { isolatedStaging, stagingMigrationFailures, stagingHyperdriveFailures } from './staging-database-identity.mjs';
const valid = `postgresql://${isolatedStaging.migrationRole}:test-password@${isolatedStaging.host}/${isolatedStaging.database}?sslmode=require`;
describe('staging database isolation', () => {
  it('accepts the dedicated direct migration target', () => expect(stagingMigrationFailures(valid)).toEqual([]));
  it.each([
    valid.replace(isolatedStaging.host, 'ep-jolly-cell-ayr7xsuo.c-5.us-east-2.aws.neon.tech'),
    valid.replace(isolatedStaging.host, 'ep-restless-night-ay75rzel.c-5.us-east-2.aws.neon.tech'),
    valid.replace('.c-6.', '-pooler.c-6.'),
    valid.replace(isolatedStaging.database, 'neondb'),
    valid.replace(isolatedStaging.migrationRole, 'neondb_owner'),
    valid.replace('sslmode=require', 'sslmode=disable'),
    `${valid}&host=production.example`,
    valid.replace('test-password@', '@'),
    'not-a-url',
  ])('rejects unsafe migration target %s', url => expect(stagingMigrationFailures(url).length).toBeGreaterThan(0));
  it('checks actual Hyperdrive origin rather than resource ID', () => {
    const origin = {host:isolatedStaging.host,port:5432,database:isolatedStaging.database,user:isolatedStaging.runtimeRole,scheme:'postgres'};
    expect(stagingHyperdriveFailures(origin)).toEqual([]);
    expect(stagingHyperdriveFailures({...origin,host:'ep-jolly-cell-ayr7xsuo.c-5.us-east-2.aws.neon.tech'}).length).toBeGreaterThan(0);
    expect(stagingHyperdriveFailures({...origin,user:'neondb_owner'}).length).toBeGreaterThan(0);
    expect(stagingHyperdriveFailures(undefined).length).toBeGreaterThan(0);
  });
});
