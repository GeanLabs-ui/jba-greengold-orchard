# Staging activity reconciliation

This standalone data migration imports only the reviewed missing Daily Task Log records. It is separate from schema migrations and does not deploy application or visual changes. The staging workflow runs only when this directory or its workflow changes on the staging branch. With no encrypted plan it takes a read-only snapshot.

Private source records, the reviewed baseline hash, and the exact additions are stored in `book5-plan.enc`, authenticated with AES-256-GCM. The key is the staging environment secret `BOOK5_IMPORT_KEY`. Keep that key available to decrypt the workflow's before/after evidence; never commit it or a decrypted snapshot. Evidence artifacts are encrypted and retained for 14 days. Public logs contain only the operation mode and inserted row count.

Apply mode requires the exact reviewed baseline, including farm and block ownership. It locks the relevant tables briefly, adds only planned DailyActivity rows and audit events in one transaction, checks existing records remain unchanged, verifies cost totals, and checks a second planning pass proposes no additions. Deterministic source-row IDs make subsequent runs safe; edits to an imported record stop the operation rather than overwrite that record. Workbook spelling and original values are retained in source metadata; the two separate source rows remain separate. No expense, stock, approval, or compliance records are fabricated by this historical log import.

Validation: `npx vitest run scripts/data-import`. The approved operation was also exercised twice in disposable PostgreSQL against a private copy of the reviewed snapshot, proving transaction insertion, preservation, totals, audit events and repeat-run behavior.

There is no automatic destructive rollback. For an incorrect entry, first inspect the encrypted before/after evidence and the audit entry, then prepare an explicitly reviewed corrective change. If the snapshot changes before apply, obtain fresh encrypted evidence and reconcile again; do not relax the baseline check.
