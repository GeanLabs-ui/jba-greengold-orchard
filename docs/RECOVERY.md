# Backup and recovery policy

Staging and production recovery assets are separate. Never restore production data into staging unless it has been explicitly sanitized.

## Neon PostgreSQL

- Enable Neon backup history/point-in-time restore for both projects and record each project's retention window.
- Before a production migration, confirm the latest restore point and retain the previous application deployment.
- For recovery, stop deployments and writes, restore to a new Neon branch/project, validate row counts and critical queries, create a new Hyperdrive configuration if the hostname changes, then switch the binding deliberately.
- Run a staging restore drill before launch and quarterly. Record actual recovery point and recovery time.

## Cloudflare R2

- Every accepted upload is written to both `PRIVATE_FILES` and the independent `PRIVATE_FILES_BACKUP` bucket before its database row is committed.
- Reads fall back to the backup bucket and asynchronously restore the primary object when the primary copy is missing.
- Files use immutable UUID object keys and the application exposes no delete endpoint.
- Keep both buckets private. Restrict backup-bucket administrative access, apply a retention lock after staging validation, and alert on failed Worker writes.
- Quarterly, remove one disposable staging primary object through an administrator-controlled test, confirm the API serves it from backup and repopulates the primary, then record the result.

Dual R2 buckets protect against accidental object loss, not a total Cloudflare account compromise. Export a periodic encrypted archive to an independently controlled location if the business recovery policy requires provider/account isolation.
