# Dev account security review — 4 September 2026

The local account-loading failure and role-separation gaps were repaired. Real Google registration remains blocked by missing OAuth configuration. Existing account and business records were preserved; no account was manually marked verified, promoted, relinked, or enabled.

## Findings and repairs

| ID | Severity | Evidence | Result |
| --- | --- | --- | --- |
| AUTH-01 | High | `apps/api/src/modules/auth.ts`, `/me`, reads `account_profiles`; the local database had no `account_*` tables. | Verified backup, then applied only existing additive migration `0019_customer_account_setup.sql`. Authenticated session loading now passes against the actual local database. |
| AUTH-02 | High | `/login` and `/google` accepted accounts without a requested customer/staff audience; `apps/web/src/App.jsx` did not restrict portal roles. | API validates the stored role against the requested audience before issuing a session. `/staff-login` and `/login` have distinct labels and destinations. Portal routes require a verified customer. Customer checkout and payment APIs reject staff. |
| AUTH-03 | High | Password login and session loading did not require customer email verification. | Unverified customers cannot get or reuse a session. Google credentials still require signature, audience, issuer, and verified email checks, and existing identities must match Google's stable subject ID. |
| AUTH-04 | High | Google bootstrap login could promote/reactivate an existing account; staff invitation acceptance could convert a customer. | Login never promotes or reactivates existing accounts. Customer-to-staff conversion is rejected in invitation acceptance and staff access updates. Explicit administrative provisioning remains separate. |
| AUTH-05 | Medium | Entity HR page grants were checked before the customer role. | A customer with an erroneous HR page grant still cannot read Employee or Department data. Customer entity reads remain scoped by server-side `owner_user_id`. |
| AUTH-06 | Medium | Sign-in accepted bodies without a content-type/origin guard. | Browser sign-in requires JSON and rejects foreign origins to prevent login CSRF. Authentication responses are not cached. |
| DEV-01 | Blocking configuration | No `GOOGLE_CLIENT_ID` in local API configuration; no web client ID configured. | Browser now reads the API's public Google client ID from `/api/v1/auth/config`, avoiding mismatched frontend/backend IDs. An actual OAuth Web client ID and authorized localhost origin are still required. |

Relevant locations: `apps/api/src/modules/auth.ts:218` (password login), `apps/api/src/middleware/auth.ts:54` (session verification), `apps/web/src/App.jsx:231` (portal gate), `apps/api/src/modules/commerce.ts:72` (customer ownership).

Google identity matching follows [Google's server verification guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token). Existing password accounts are never silently linked based on matching email alone.

“Verified” for login means verified email/account ownership. Government-document verification remains the separate Account Setup review process; no document review was approved by this repair. Customers must be able to authenticate before submitting their identity documents.

## Local data audit

All four existing users were inspected and their session resolution exercised in a rolled-back database transaction:

| Account ID | Stored state | Result |
| --- | --- | --- |
| `83b4453b-06a5-4b32-bb32-fd613609873b` | Active super admin; password enabled; email unverified; no Google link | Staff session resolves to its own ID. Existing admin password access preserved. Email verification flag was not altered. |
| `cca51dd2-c64e-4122-9a8c-18b05a9e9535` | Active super admin; password enabled; email verified; no Google link | Staff session resolves to its own ID. |
| `0dbea7aa-3831-41ac-af3a-9acc045a9356` | Disabled legacy user | Session rejected. |
| `d090a103-72b2-4e49-b93a-28b123a4344b` | Disabled legacy user | Session rejected. |

There are no existing customer login accounts in this local database. No duplicate normalized emails, duplicate Google subjects, dangling owner references, missing invoice-linked orders, or invoice/order owner mismatches were found.

Ownership requiring business review: one Customer record, four Orders and four Invoices are owned by an administrator; three Payments have no owner. These may be staff-entered legacy records. They were not reassigned by email or guessed customer identity, and new customers cannot see them. A verified owner mapping is needed before exposing them to customer accounts.

Before/after preserved totals: **4 users, 383 entity records, 2 farms, 11 blocks**. Backup: `.backups/database/mango_farm-2026-09-04T13-31-45-276Z.dump` (pg_restore listing verified).

## Verification and limits

- Full automated suite: 46 files, 314 tests passed, including the opt-in PostgreSQL integration test.
- `npm run build` (Vite build and API typecheck), `npm run lint:web`, and the final targeted 31-test auth/database run passed. Vite retains its existing large-bundle warning. Local `/ready` returns ready; `/auth/config` confirms `googleClientId: null`.
- Database test: real password hashing/login, wrong-role rejection, wrong-password rejection, disabled/unverified rejection, existing-account session loading, five customer entity ownership scopes, foreign-order payment rejection, CSRF, logout invalidation. Every fixture/session was rolled back.
- Google unit tests cover verified-customer creation, staff login, wrong audiences, conflicting identities, unverified claims, invalid credentials, and bootstrap conversion rejection. Google signature verification is mocked in those tests; they are not proof of a real Google sign-in.
- Browser inspection confirmed separate customer/staff login pages and the missing-Google-configuration state. No existing user's password was guessed, reset, or used. Real user password login and live Google signup still need an interactive login with the account owner.
- This review covers authentication, role separation, and account ownership. It does not certify the business accuracy of every legacy record or perform a full application penetration test.

## Follow-up: staging OAuth and local test accounts

The initial missing-OAuth findings above are historical. The user subsequently requested Google OAuth for staging only, documented in `STAGING_GOOGLE_SIGN_IN.md`; localhost OAuth must remain unconfigured. Local testing now uses server-gated seeded admin/customer login and customer registration described in `LOCAL_TEST_AUTH.md`. These synthetic accounts have simulated verification and are rejected outside local development. Existing account verification and roles were not changed.

The follow-up read-only audit found seven users (the original four, two seeded fixtures, and one locally registered customer), with business totals still 383 entity records, two farms, and eleven blocks. No duplicate normalized emails, duplicate Google subjects, orphan owners, or invoice/order owner mismatches were found. The legacy staff-owned/unassigned records above still require business-owner review; no records were reassigned.

Read-only repeat audit: `node --env-file=.env scripts/audit-accounts.mjs`. Setup and test commands are in `README.md`.
