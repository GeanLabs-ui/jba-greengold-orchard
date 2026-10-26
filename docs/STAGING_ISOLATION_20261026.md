# Staging isolation checkpoint — 26 October 2026

## Status and authorization boundary

Independent encrypted database backups, restore tests, Drive retrieval/decryption,
and the isolated staging database are prepared and verified. The staging Worker
and Pages deployment have **not** switched to these resources. PR #68 remains a
draft. Do not merge it or PR #66, dispatch a deployment, change `main`, or perform
any production cutover without the required authorization and successful gates.

Production's existing database, Hyperdrive, Worker, Pages, R2, secrets and DNS
were not modified. All database writes in this checkpoint targeted only
`rapid-silence-76969442` / `br-morning-pine-b46ahejn`.

## Infrastructure map

| Component | Currently deployed production and staging | Prepared isolated staging |
| --- | --- | --- |
| Worker | `mango-farm-api-production` / `mango-farm-api-staging` | Existing staging Worker, after an authorized deployment |
| Hyperdrive | `9e171a949bc0414d80effcf09e57ceda` | `05df39dddd6744cd81fa791957ac922b` |
| Neon project | `green-salad-14512748` | `rapid-silence-76969442` |
| Neon branch | `br-empty-butterfly-aypq6wel` | `br-morning-pine-b46ahejn` |
| Direct endpoint | `ep-jolly-cell-ayr7xsuo.c-5.us-east-2.aws.neon.tech` | `ep-polished-poetry-b465493m.c-6.us-east-2.aws.neon.tech` |
| Database | `jba_greengold_staging` | `jba_greengold_staging` in the independent project |
| Primary R2 | `jba-greengold-files-staging` | `jba-greengold-files-isolated-staging` |
| Backup R2 | `jba-greengold-files-staging-backup` | `jba-greengold-files-isolated-staging-backup` |

The new Hyperdrive uses TLS `require`, disables caching and uses the limited
`jba_staging_runtime_limited` role. Its origin was verified through the Cloudflare
API. Its configuration is new; the shared Hyperdrive was not edited.

## Backup and recovery evidence

Local backup directory:
`C:\Users\USER\Documents\JBA-Safe-Migration\Independent-Encrypted-Backups`.

Private off-device folder:
[JBA-GreenGold-Secure-Database-Backups](https://drive.google.com/drive/folders/14NBimc8KMg9KsHThdtS88WXzLsjrZyrT).
Permission metadata showed only the owner and `shared=false` for both archives.

| Source | Branch | Tables | All table rows | Business entity rows | Restore |
| --- | --- | ---: | ---: | ---: | --- |
| Current live shared | `br-empty-butterfly-aypq6wel` | 54 | 3,724 | 882 | Passed |
| Historical candidate | `br-bitter-wave-aywlfpf6` | 56 | 3,650 | 930 | Passed |

Archive identifiers:

- `current-live-shared-20261026T122901Z.dump.gcm`
  SHA-256 `b6695c6fc134eba8be4032b02ff3c16a8b17b5d413a1f67e201fc7b946aa09f6`.
  Drive file `1TkCFBaOP4zmzi3iAHibPKrpw0bbYCSos`.
- `historical-production-candidate-20261026T122901Z.dump.gcm`
  SHA-256 `80383435fdadec57414462e3557ead548085c01794b8c6b0ffc918d1fd225867`.
  Drive file `1Hch-STnFtEFtiun8YXPXmy9ymKQlE8EE`.

Each custom-format `pg_dump` used an exported repeatable-read, read-only snapshot.
Every table's source row count and sorted row-content fingerprint were captured
in that same snapshot. AES-256-GCM encryption occurred in memory before writing
archives. GCM authentication, plaintext archive SHA-256 and `pg_restore --list`
passed. Full, single-transaction restores into a separate local PostgreSQL 18
cluster passed, with all table fingerprints identical and no invalid indexes.
Both Drive copies were retrieved and decrypted successfully, and their encrypted
and decrypted SHA-256 values matched the local evidence. No plaintext dump was
written to disk or uploaded.

The filename timestamp identifies this backup run, not a shared recovery point:
the two sources have separate exported snapshots and verification timestamps in
`backup-verification-20261026T122901Z.json`. No source was frozen or changed.

### Recovery key custody — user action still required

The random key is protected using Windows CurrentUser DPAPI outside both backup
locations and the repository. It is not in Drive, the archives, scripts or logs.
The user must save a portable copy in their password manager. Run the local
`Tools\copy-recovery-key-to-clipboard.ps1` helper from the migration working
directory, paste into the password manager, and clear the clipboard. The helper
does not print the key. Until this is done, recovery depends on this Windows
account and laptop; disaster recovery readiness is not complete.

The archive format is `JBA-GCM-2\n` (10 bytes), 12-byte nonce, encrypted custom
archive, then a 16-byte GCM tag; the key is 32 bytes. `Tools\backup-restore.cjs`
contains the decrypt/verify implementation. For recovery, retrieve the encrypted
file and manifest, verify encrypted SHA-256, authenticate/decrypt in memory, then
stream into `pg_restore --exit-on-error --single-transaction --no-owner --no-acl`
against a newly created disposable database. Compare every manifest table count
and fingerprint. Never restore over a live database or newer transactions.

## Record reconciliation

Read-only comparison of the two restored snapshots found:

- 861 common entity IDs: 345 identical full rows and 516 differing rows.
- 21 IDs present only in current live.
- 69 IDs present only in the historical candidate.

The current live source remains the operational source used by production. The
historical candidate is not a safe replacement. No differences were merged into
production. Detailed business reconciliation and approval remain outstanding;
these totals are evidence of differences, not a decision about each record.

## Staging schema and business records

The isolated target was confirmed to have zero application tables before setup.
All 19 non-destructive migrations ran in a disposable local database. Its schema
was installed into isolated Neon staging in one transaction, followed by a
transactional import of sanitized fixtures and the matching migration ledger.
The import was validated against local constraints before the successful remote
import. Failed import attempts rolled back atomically.

Per the user's explicit dataset choice, staging combines workbook migration
records and sanitized current-live records. Of 202 workbook entity records, 196
overlap live IDs. Live content wins those overlaps; six workbook-only records
remain. 82 live `AuditLog`/`Notification` entities were excluded, giving **806
business entity records**, plus **2 farms, 10 blocks and 2 activity periods**.

No live users, credentials, sessions, verification tokens, audit payloads, rate
limits, file objects or R2 references were copied. Personal/free-text fields use
HMAC pseudonyms; contact details, locations, ownership links, signatures and
external resources were removed. Operational numeric values and safe dates,
codes and enumerations were retained. This is sanitized staging data, not an
authoritative replacement for either source. Employee identity labels and other
free-text descriptions are intentionally synthetic.

Verified remote counts: 54 tables, 19 migration ledger rows, 806 entity records,
2 farms, 10 blocks, zero users/sessions/files/audit events, zero invalid indexes.
Authentication acceptance is pending creation of staging-only test accounts.

## Credentials and migration secret

- Runtime: `jba_staging_runtime_limited`; no inherited roles, superuser,
  database/role creation, schema creation, or migration-ledger writes.
- Migrator: `jba_staging_migration_owner`; owns staging application tables,
  can create schema objects, has no superuser, role/database creation or inherited
  roles. Future tables grant runtime DML through default privileges.
- Direct runtime authentication and a synthetic insert/read/rollback passed.
  The probe was absent from current live and absent from staging after rollback.
- The dedicated migration credentials successfully reran the existing migration
  runner, accepting all 19 checksums without applying schema changes.
- Only GitHub's **staging** environment `NEON_DATABASE_URL` was replaced, using
  encrypted GitHub secret storage. No production/repository secret was changed.
  Its value cannot be read back from GitHub; the next guarded staging workflow
  must verify the delivered secret before any migration.
- Two preliminary Neon API-created roles (`jba_staging_migrator` and
  `jba_staging_runtime`) inherit `neon_superuser`; they are **not** the deployment
  credentials. Neon denied removing that membership. The SQL-created roles above
  were used instead. The preliminary roles remain unused for operator review;
  no role, branch or historical recovery resource was deleted.

## Deployment guard and validation

PR #68 now prepares only staging Hyperdrive/R2 changes. Production's configuration
object remains unchanged. The guard requires the exact isolated direct endpoint,
database, migration role and TLS, rejects unapproved URL overrides, rejects
shared R2 buckets, and reads Cloudflare to verify the Hyperdrive origin and
runtime role. API verification failures block deployment.

Validation performed: 11 isolation tests passed; frontend/API build passed;
frontend lint passed; 19 migration safety checks passed. Full staging deployment,
browser acceptance, OAuth roles, uploads/downloads and deletion isolation remain
pending. The existing CI failed its dependency audit with 9 findings (4 moderate,
3 high, 2 critical). Do not bypass that gate or merge PR #66 to clear it without
regression testing and review.

## Next staging release and future production procedure

1. Save the recovery key in the user's password manager and confirm custody.
2. Resolve the dependency audit in a reviewed change; keep PR #66 unmerged.
3. Verify all remaining CI and deployment configuration checks, staging-only test
   identities, required Google/Turnstile settings, and staging secret delivery.
4. Obtain explicit authorization to merge PR #68 to `staging`. The existing
   workflow migrates staging and deploys its API and Pages; production is not
   part of that deployment.
5. Verify deployed bindings, health/readiness, all critical desktop/mobile
   workflows, R2 operations and a new staging-only write absent from live.
6. Record the exact passing staging commit and deployment IDs. Retain
   `promote-production.yml` and `deploy-production.yml` approval gates.
7. Prepare the promotion PR and rollback plan. Production reconciliation,
   migrations, merge and cutover each remain a separate approval phase.

For a future application rollback, redeploy the last approved application
version with its compatible bindings. Do not restore the old candidate or a
database archive over newer production transactions. Database reconciliation or
recovery requires a separately reviewed plan and explicit authorization.
