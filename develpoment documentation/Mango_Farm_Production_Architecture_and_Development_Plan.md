  
  

Mango Farm Platform

**Production Architecture, Security and Development Plan**

Cloudflare deployment + Neon PostgreSQL

  

**Document field**

**Value**

Project path

C:\\Users\\USER\\Desktop\\Farm Actual Project\\base44-app

Prepared date

21 July 2026

Document status

Approved development baseline

Primary frontend

React 18 + Vite + Tailwind CSS

Cloud platform

Cloudflare

Database platform

Neon PostgreSQL

Purpose

Guide implementation without losing current website/admin functionality

**Core decision  
**Keep the current React website, admin dashboard and customer portal. Replace the browser-only Base44 mock implementation with a real Cloudflare-hosted API and Neon database through a compatibility adapter, module by module.

**CONFIDENTIAL - DEVELOPMENT USE**

# Document map

1.  1\. Executive summary and current-state findings
2.  2\. Final target architecture and technology decisions
3.  3\. Production requirements across all 15 control areas
4.  4\. Backend modules, API standards and business rules
5.  5\. Neon database architecture and schema domains
6.  6\. Authentication, authorization and security model
7.  7\. Cloudflare deployment and infrastructure design
8.  8\. Git, environments and CI/CD
9.  9\. Migration strategy from the current prototype
10.  10\. SEO and AI-search implementation
11.  11\. Testing, observability and disaster recovery
12.  12\. Folder structure, implementation phases and acceptance checklists
13.  13\. Operating procedures and reference sources

# 1\. Executive summary and current-state findings

The current application already contains a significant React/Vite user interface for a public website, an administrative management system and a customer portal. It also contains broad domain models for farms, blocks, harvests, inventory, HR, finance, logistics, procurement, documents and content. The objective is therefore not to discard the interface. The objective is to place a production-grade service, security and data platform behind it.

**Current production blocker  
**The current src/api/base44Client.js stores application records, users and sessions in browser localStorage. It also performs authentication, password hashing and authorization in browser code. This must not be used in production because users can inspect or alter client-side state and call data operations without server enforcement.

## 1.1 Current stack retained

**Layer**

**Current technology**

**Decision**

UI framework

React 18

Retain

Build tool

Vite 6

Retain; add Cloudflare Vite integration/build configuration

Routing

React Router 6

Retain

Styling

Tailwind CSS + Radix UI

Retain

Forms

React Hook Form + Zod

Retain; mirror validation on server

Client data

TanStack Query

Retain and point to HTTP API

Current data adapter

base44Client.js/localStorage

Replace internally; preserve method signatures during migration

Current auth

Browser session/localStorage

Remove and replace with server/OIDC authentication

## 1.2 Verified risks in the current implementation

-   Users, application data and sessions are stored in localStorage and are therefore controlled by the browser user.
-   The first registered user can become an administrator, creating a privilege-escalation path.
-   Admin and staff authorization is checked only in React code; it is not enforced by a trusted server.
-   The customer portal routes are not consistently protected by an authentication boundary.
-   Password reset logic uses a fixed local token and is unsuitable for real accounts.
-   Operational and sample data is bundled into frontend JavaScript, increasing exposure and bundle size.
-   No trusted API currently enforces validation, transactions, audit logs, rate limits or business rules.
-   No production database, file storage, secret management, centralized logging, recovery procedure or deployment gate is currently defined.

# 2\. Final target architecture and technology decisions

## 2.1 Architecture overview

Internet users  
|  
Cloudflare DNS + TLS + CDN + WAF + Bot/Rate controls  
|  
+-- Public React application (Cloudflare Workers Static Assets)  
+-- Admin/Portal React application (same build or separate hostname)  
+-- /api/v1/\* -> Cloudflare Worker API (Hono + TypeScript)  
|  
+-- Neon PostgreSQL (transactional data)  
+-- Cloudflare R2 (private/public objects)  
+-- Cloudflare Queues (background jobs)  
+-- Cloudflare KV (small non-authoritative config/cache only)  
+-- Email/SMS provider APIs  
+-- Sentry + structured logs + OpenTelemetry

## 2.2 Technology selection

**Concern**

**Selected technology**

**Reason**

Frontend runtime

React/Vite deployed with Cloudflare Workers Static Assets

Preserves the existing code and provides global delivery.

API framework

Hono on Cloudflare Workers, TypeScript

Cloudflare-native, lightweight, typed and compatible with Worker execution.

Database

Neon PostgreSQL

Managed serverless Postgres, branching and point-in-time recovery capabilities.

Database access

Drizzle ORM + @neondatabase/serverless

Worker-friendly SQL access, typed schemas and migrations.

Validation

Zod shared schemas

Can share contracts between frontend and API while keeping server validation authoritative.

Object storage

Cloudflare R2

S3-compatible object storage for images, CVs, contracts, certificates and generated exports.

Background work

Cloudflare Queues + Cron Triggers

Moves email, report generation, indexing and other slow work outside requests.

Identity

OIDC identity provider plus application RBAC; Cloudflare Access as optional extra admin gate

Avoids inventing authentication cryptography; application permissions remain in Neon.

Protection

Cloudflare WAF, Turnstile, rate-limit rules and Worker-level limits

Edge and application defense in depth.

Observability

Sentry, Worker logs, structured JSON logs, OpenTelemetry-compatible traces

Fast incident detection and request correlation.

CI/CD

GitHub Actions + Cloudflare Wrangler + Neon migrations

Repeatable deployments with review gates.

Infrastructure as code

Wrangler configuration initially; Terraform when account scope grows

Practical first phase with a clear path to full IaC.

**Important architecture rule  
**Neon is the system of record. R2 stores objects. KV and caches are never authoritative for financial, inventory, HR, authentication or operational records.

# 3\. Production requirements - 15 control areas

## 3.1 Frontend

-   Keep public website, admin dashboard and portal routes compatible with the current visual system.
-   Replace all direct localStorage entity access with a typed API client.
-   Use environment-specific API origins and no secret values in VITE\_\* variables.
-   Add lazy loading by route, code splitting, error boundaries, skeletons, retries and offline-safe messages.
-   Use accessible semantic HTML, keyboard navigation, labelled controls, contrast checks and WCAG 2.2 AA testing.
-   Add CSP-compatible code; eliminate unsafe inline scripts where practical.
-   Add unit tests, component tests and Playwright end-to-end tests.
-   Remove seed data, passwords, tokens and private operational records from production bundles.
-   Use immutable hashed assets with long cache TTL; use no-store for private API responses.
-   Implement responsive layouts and performance budgets for JavaScript, images and Core Web Vitals.

## 3.2 API and backend logic

-   Create a versioned REST API under /api/v1 with a consistent response and error envelope.
-   Validate every request at the Worker boundary using Zod; never trust frontend validation.
-   Use service/domain functions for business rules and repository functions for persistence.
-   Use database transactions for inventory movements, payments, approvals, harvest posting and related multi-table changes.
-   Use idempotency keys for order creation, payments, imports and retried write operations.
-   Generate OpenAPI documentation and contract tests.
-   Implement pagination, filtering, field selection, sorting and maximum result limits.
-   Enforce tenancy/organization ownership and record-level access on the server.
-   Create health, readiness and version endpoints.
-   Do not expose stack traces, SQL details, secrets or internal identifiers in client errors.

## 3.3 Database and storage

-   Use Neon PostgreSQL with separate production, staging and development branches/projects as defined in the environment policy.
-   Use UUID primary keys, foreign keys, unique constraints, check constraints, indexes and explicit nullability.
-   Use decimal/numeric types for money and measured quantities; never floating point for currency.
-   Use UTC timestamptz for system times and explicit local business date fields where required.
-   Add organization\_id to tenant-owned records and index common organization/date/status query patterns.
-   Use append-only ledgers for inventory movements and financial posting where appropriate.
-   Use schema migrations committed to Git; production schema changes run only through CI/CD.
-   Store files in R2 with metadata in Postgres, private access by default and signed short-lived download URLs.
-   Add retention, archival and legal deletion policies per data class.
-   Encrypt all connections with TLS and rotate database credentials.

## 3.4 Authentication and permission

-   Disable public administrator registration.
-   Use an OIDC identity provider for login, MFA, email verification and secure recovery.
-   Persist application users, memberships, roles and permissions in Neon.
-   Validate identity-provider tokens on every protected API request.
-   Enforce RBAC plus record ownership/organization scope in the API, not just in React.
-   Use least privilege roles and separate sensitive permissions such as finance.approve and users.roles.assign.
-   Require MFA and optionally Cloudflare Access for privileged admin routes.
-   Add session revocation, account suspension, login audit events and emergency access procedures.
-   Use short-lived tokens; never store bearer tokens in localStorage when a secure cookie/BFF pattern is available.
-   Implement re-authentication for high-risk actions such as role changes and payment approvals.

## 3.5 Hosting and deployment

-   Deploy frontend assets and Worker API through Cloudflare using Wrangler.
-   Use production, staging and development environments with independent bindings and secrets.
-   Use custom hostnames such as www, app, api and staging subdomains as the product grows.
-   Enable TLS, HSTS after validation, HTTP/2/3 and automatic asset compression.
-   Deploy immutable builds with build ID, source commit and release metadata.
-   Use preview environments for pull requests where cost and workflow allow.
-   Run migrations before switching traffic only when backward-compatible; otherwise use expand/migrate/contract releases.
-   Configure post-deploy smoke tests and automatic rollback/redeployment procedures.
-   Keep deployment permissions restricted to CI service identities.
-   Document DNS, certificates, domains and account ownership.

## 3.6 Cloud infrastructure

-   Cloudflare DNS is authoritative for application domains.
-   Cloudflare WAF protects public and API endpoints; rules are versioned/documented.
-   R2 buckets are separated by environment and data sensitivity.
-   Queues separate slow/retryable workloads from request handling.
-   KV is limited to configuration and cache entries that can be recreated.
-   Use account-scoped API tokens with minimum permissions rather than global API keys.
-   Use Wrangler secrets for Worker secrets and GitHub environment secrets for deployment credentials.
-   Apply budget alerts, usage monitoring and quotas.
-   Document infrastructure ownership, escalation and provider dependencies.
-   Move to Terraform when multiple services/environments make manual configuration error-prone.

## 3.7 Git and version control

-   Initialize and push the project to a private GitHub repository before major restructuring.
-   Protect main and staging branches; require pull requests and successful checks.
-   Use short-lived feature/\*, fix/\* and hotfix/\* branches.
-   Use Conventional Commits and semantic release tags.
-   Commit migration files, Wrangler config templates and documentation; never commit secrets.
-   Enable GitHub secret scanning, Dependabot and code scanning.
-   Use CODEOWNERS for security, database and deployment-sensitive paths.
-   Create release notes and a rollback reference for each production release.
-   Use .env.example with names only and safe placeholder values.
-   Run Gitleaks locally and in CI.

## 3.8 CI/CD pipeline

-   Pull request pipeline: install, format check, lint, typecheck, unit tests, API tests, frontend build and security scans.
-   Run dependency audit, secret scanning, SAST and license policy checks.
-   Validate Drizzle migrations against an ephemeral or dedicated Neon branch.
-   Deploy to staging automatically after merge to staging/develop according to the chosen branch policy.
-   Require manual approval for production environment deployment.
-   Run database backup/restore checkpoint and migration preflight for high-risk releases.
-   Deploy Worker and assets using Wrangler with immutable version metadata.
-   Run post-deployment health checks and Playwright smoke tests.
-   Notify maintainers on failure and preserve logs/artifacts.
-   Use rollback-safe, backward-compatible database changes.

## 3.9 Application security

-   Adopt OWASP ASVS-inspired requirements and threat-model high-risk workflows.
-   Use WAF, Turnstile and both edge and application-level rate limits.
-   Validate, normalize and constrain every input; encode every output by context.
-   Use parameterized queries through the ORM and no dynamic SQL from user input.
-   Apply strict CORS allowlists, CSRF controls for cookie-authenticated writes and secure headers.
-   Use Content-Security-Policy, frame-ancestors, Referrer-Policy, Permissions-Policy and X-Content-Type-Options.
-   Validate file extension, MIME type, signature, size and ownership; scan uploads before release.
-   Redact passwords, tokens, personal data and document contents from logs.
-   Create tamper-resistant audit records for privilege, finance, inventory and approval changes.
-   Perform dependency updates, penetration testing and security review before production.

## 3.10 Rate limiting

-   Configure broad Cloudflare rate rules for abusive IPs and endpoints.
-   Apply Worker-level limits keyed by user, organization, IP and action.
-   Login target: approximately 5 failed attempts per 15 minutes with progressive controls.
-   Password recovery target: approximately 3 requests per account/hour without revealing account existence.
-   Contact/career forms: strict per-IP and per-session limits plus Turnstile.
-   Export/report generation: concurrency and daily quotas.
-   File upload: count, size and bandwidth limits.
-   API limits return 429 with Retry-After and a safe structured error.
-   Use allowlists only for controlled service integrations and audit their use.
-   Monitor rate-limit events to tune thresholds without blocking legitimate customers.

## 3.11 Caching and CDNs

-   Use Cloudflare CDN for versioned frontend assets and public media.
-   Use a custom domain for public R2 delivery when WAF/cache control is required.
-   Cache only public published content; never cache private admin, HR, finance or authentication responses.
-   Use Cache-Control: public, max-age and s-maxage for safe content; private/no-store for protected data.
-   Use ETags and conditional requests.
-   Purge or version cache keys when public content changes.
-   Use Redis only if a Worker-compatible managed Redis is later justified; initially prefer Cache API/KV for reproducible non-sensitive caches.
-   Prevent cache-key confusion involving cookies, authorization headers and query parameters.
-   Use stale-while-revalidate for safe public content.
-   Monitor cache hit ratio and origin/database query reductions.

## 3.12 Load balancing and scaling

-   Cloudflare Workers scale horizontally at the edge; API code must remain stateless.
-   Use Neon connection pooling/serverless driver suitable for Workers.
-   Bound database concurrency and use indexes, pagination and query timeouts.
-   Move email, PDF generation, bulk imports and search indexing to Queues.
-   Use idempotent consumers with retry and dead-letter handling.
-   Use caching for read-heavy published content.
-   Load test key APIs and dashboard queries before launch.
-   Define service limits and graceful degradation for third-party outages.
-   Consider Cloudflare Load Balancing only for multi-origin architecture; it is not initially required for a single Worker API.
-   Profile slow queries and introduce read replicas or specialized search only when evidence supports it.

## 3.13 Error tracking and logging

-   Emit structured JSON logs with request\_id, trace\_id, release, route, method, status and duration.
-   Add Sentry to frontend and Worker API with source maps and environment tags.
-   Redact authorization headers, cookies, passwords, tokens, PII and file contents.
-   Log authentication failures, authorization denials and administrative actions.
-   Create immutable audit events separate from operational logs.
-   Add health checks and synthetic monitoring for website, API, database and login.
-   Alert on error-rate spikes, latency, failed queue messages, database saturation and deployment failures.
-   Use correlation IDs from edge through database and queue operations.
-   Define log retention and access policies.
-   Create dashboards for uptime, traffic, errors, latency, database and queue health.

## 3.14 Availability and disaster recovery

-   Define initial objectives: RPO <= 15 minutes and RTO <= 2 hours, subject to plan capabilities and business approval.
-   Use Neon history/point-in-time restore and scheduled snapshots where available on the selected plan.
-   Create periodic logical exports to a separate protected R2 backup bucket for defense in depth.
-   Enable R2 object versioning/retention strategy where required and use lifecycle rules for backup retention.
-   Test database restore into a non-production Neon branch at least quarterly.
-   Document Worker rollback, DNS recovery and credential rotation.
-   Keep infrastructure configuration, schemas and runbooks in Git.
-   Design Queue consumers for retry and dead-letter processing.
-   Maintain contact lists, incident severity levels and communication templates.
-   Run an annual disaster-recovery exercise and record actual RTO/RPO.

## 3.15 SEO for search engines and AI systems

-   Use prerendering or server-rendered public content so important pages do not depend solely on client rendering.
-   Keep admin, portal, staging and internal APIs blocked from indexing and protected by authentication.
-   Generate titles, descriptions, canonical URLs, Open Graph and social metadata per page.
-   Generate XML sitemap, image sitemap and news sitemap where appropriate; submit to Google and Bing.
-   Add valid JSON-LD for Organization, Product, Article, BreadcrumbList and other applicable types.
-   Create authoritative pages for mango varieties, farm locations, export services, local supply, sustainability, quality and traceability.
-   Publish evidence-based educational content and original farm updates with authorship and update dates.
-   Optimize Core Web Vitals, semantic HTML, internal links, alt text and image formats.
-   Use consistent business identity, address and contact information across trusted external profiles.
-   Provide clear crawlable facts and optional llms.txt, but do not promise or claim guaranteed first-place ranking.

# 4\. Backend modules, API standards and business rules

## 4.1 Module map

**Domain**

**Primary responsibilities**

**Representative endpoints**

Identity & access

Users, organizations, memberships, roles, permissions, invites, sessions, MFA events

/auth, /users, /roles, /permissions

Farm operations

Farms, blocks, crop plans, tasks, daily activities, notes and approvals

/farms, /farm-blocks, /crop-plans, /daily-activities

Labour & HR

Employees, workers, schedules, attendance, payroll inputs, applications

/employees, /workers, /attendance, /job-applications

Equipment & inputs

Equipment, usage, maintenance, farm inputs, pesticide records

/equipment, /equipment-usage, /farm-inputs, /pesticide-applications

Harvest & quality

Harvest batches, grading, quality checks, waste/loss, traceability

/harvest-batches, /quality-checks, /waste-loss

Inventory & warehousing

Products, stock items, movements, warehouses, cycle counts

/products, /inventory, /stock-movements, /warehouses

Commercial

Customers, CRM, quotations, orders, invoices, payments, returns

/customers, /quotes, /orders, /invoices, /payments

Supply chain

Suppliers, purchase orders, vehicles, deliveries, export shipments

/suppliers, /purchase-orders, /deliveries, /exports

Finance

Expenses, farm finance, budgets, approvals, reports and exports

/expenses, /finance-records, /financial-reports

Content & files

Pages, news, media, documents, signed uploads/downloads

/content, /news, /documents, /uploads

Platform operations

Audit, notifications, jobs, health, settings, feature flags

/audit-events, /notifications, /health, /settings

## 4.2 API conventions

-   Base path: /api/v1. Breaking changes require a new major API version.
-   JSON uses camelCase externally; database names may use snake\_case internally.
-   Every response includes requestId. Errors use stable machine codes and safe messages.
-   List endpoints use cursor pagination for large data and explicit maximum page sizes.
-   Writes require Content-Type validation and request-body size limits.
-   Use If-Match/version fields or updatedAt checks for concurrency-sensitive edits.
-   Use Idempotency-Key for retriable create/post operations.
-   Use 401 for missing/invalid identity, 403 for insufficient permission, 404 where disclosure should be minimized, 409 for conflicts and 422 for semantic validation errors.
-   OpenAPI is generated from shared schemas and checked in CI.
-   Deprecations are announced and measured before removal.

Success envelope  
{ "data": {...}, "meta": {...}, "requestId": "..." }  
  
Error envelope  
{ "error": { "code": "INVENTORY\_INSUFFICIENT", "message": "Insufficient available quantity", "details": \[\] }, "requestId": "..." }

## 4.3 Critical business-rule examples

**Workflow**

**Required server rule**

Inventory issue

Available stock cannot become negative; movement and balance update are one transaction.

Harvest posting

Grade A + Grade B + rejected must equal harvested quantity within configured tolerance.

Pesticide application

Application date, product, batch, applicator, interval and treated area are mandatory; approval may be required.

Attendance/pay

Only authorized HR/farm roles can approve; totals are derived server-side, not trusted from browser.

Finance approval

Maker-checker separation: creator cannot approve above configured threshold.

Role assignment

Only users with roles.assign can change roles; cannot remove the last emergency administrator without replacement.

Document access

Access derives from organization, module, record ownership and explicit grants.

Job application

Public upload is quarantined; HR access only after validation/scanning.

Content publishing

Draft-review-publish workflow; only published records are publicly cacheable.

Deletion

Sensitive records are archived/soft-deleted according to retention policy; destructive purge requires elevated approval.

# 5\. Neon database architecture and schema domains

## 5.1 Environment topology

**Environment**

**Neon use**

**Data policy**

Development

Developer branch/project

Synthetic data only; disposable.

Pull request/preview

Ephemeral branch where practical

Created by CI and deleted after merge/expiry.

Staging

Persistent staging branch/project

Production-like synthetic/anonymized data.

Production

Protected production branch/project

Real business data; restricted credentials and restore policy.

**Credential rule  
**Use separate database roles/credentials for migrations, application runtime and read-only reporting. The application runtime must not own the schema or have unrestricted administrative privileges.

## 5.2 Core schema domains

**Schema/domain**

**Example tables**

iam

users, organizations, memberships, roles, permissions, role\_permissions, invitations, sessions, auth\_events

farm

farms, farm\_blocks, crop\_plans, farm\_tasks, daily\_activities, activity\_workers, weather\_logs, farm\_notes

workforce

employees, workers, labor\_schedules, attendance, payroll\_inputs, job\_applications

assets

equipment, equipment\_usage, maintenance\_orders, vehicles

inputs

farm\_inputs, input\_batches, input\_usage, pesticide\_applications

harvest

harvest\_batches, harvest\_grades, quality\_checks, waste\_losses, traceability\_events

inventory

products, warehouses, stock\_items, stock\_movements, stock\_counts

commercial

customers, contacts, inquiries, quotations, orders, order\_items, invoices, payments, returns

procurement

suppliers, purchase\_orders, purchase\_order\_items, goods\_receipts

logistics

deliveries, delivery\_items, export\_shipments, shipment\_documents

finance

expenses, finance\_records, budgets, approvals, ledger\_entries

content

content\_pages, news\_posts, media\_assets, seo\_metadata

platform

documents, notifications, audit\_events, outbox\_events, idempotency\_keys, feature\_flags

## 5.3 Required cross-cutting columns

-   id UUID primary key
-   organization\_id UUID on tenant-owned records
-   created\_at and updated\_at timestamptz
-   created\_by and updated\_by where accountability is required
-   version integer for optimistic concurrency where needed
-   status with validated allowed values
-   deleted\_at only for records using soft deletion
-   source and external\_id for integrations
-   metadata JSONB only for truly variable, non-critical extensions
-   classification/retention fields for documents and personal data

## 5.4 Migration and seed policy

-   Drizzle migration files are generated, reviewed and committed.
-   Production migrations never run from a developer laptop.
-   Use expand -> backfill -> switch -> contract for breaking schema changes.
-   Seed scripts create only reference values, roles, permissions and synthetic development data.
-   No real user password, personal data or production record is committed.
-   Every migration has preconditions, estimated impact and recovery notes.
-   Create indexes concurrently or through a safe deployment strategy where large tables require it.
-   Run schema drift detection in CI.

# 6\. Authentication, authorization and security model

## 6.1 Identity architecture

Browser -> OIDC Provider login/MFA -> identity token/session  
Browser -> Worker API -> token/session validation -> application membership lookup in Neon  
Worker API -> permission + organization + record scope check -> business service -> Neon/R2

The identity provider proves who the person is. The application database determines what that person may do. This separation prevents frontend role manipulation and allows roles to be changed or revoked centrally.

## 6.2 Recommended roles

**Role**

**Typical scope**

Platform Owner/Super Admin

Platform configuration, emergency administration; extremely limited membership.

Company Administrator

Organization-level setup, users and broad operations.

Farm Manager

Farm, block, activity, harvest and operational approvals.

Farm Supervisor

Daily tasks, attendance, resource use and submissions.

Inventory Officer

Stock receipts, issues, counts and movements.

Quality Officer

Quality checks, grading, compliance and release decisions.

Finance Officer

Finance records, invoices, payments and reports.

HR Officer

Employees, workers, attendance and applications.

Sales/CRM Officer

Customers, inquiries, quotations and orders.

Logistics Officer

Vehicles, deliveries and shipments.

Content Editor

Public content drafts and media.

Customer/Buyer

Own portal orders, documents and payments only.

Auditor/Executive Read-only

Authorized read access and reports without mutation.

## 6.3 Permission naming

resource.action\[.scope\]  
Examples:  
farms.read  
farms.update  
dailyActivities.approve  
inventory.issue  
finance.approve  
users.invite  
roles.assign  
documents.download.confidential

## 6.4 Security gates

-   Cloudflare Access should be considered as an additional gate for /admin, not as a substitute for application authorization.
-   Turnstile is required on public forms susceptible to abuse.
-   Privileged accounts require MFA and phishing-resistant methods where supported.
-   Admin invitation links are single-use, short-lived and bound to the intended email/organization.
-   All permission decisions are logged with request and actor context.
-   Sensitive writes require recent authentication and may require second-person approval.
-   No role or permission values supplied by the browser are trusted.
-   Backend returns only fields authorized for that user and purpose.

# 7\. Cloudflare deployment and infrastructure design

## 7.1 Cloudflare resource map

**Resource**

**Purpose**

**Environment separation**

Workers Static Assets

React/Vite public, admin and portal bundle

Separate deployments/config per environment.

Worker API

Hono API under /api/v1

Separate variables, secrets and database bindings.

R2 public media bucket

Published product/news/farm media

Separate prod/staging; custom domain and cache rules.

R2 private documents bucket

CVs, contracts, certificates, invoices, exports

Private; access only through Worker/signed URLs.

Queues

Email, notification, report, indexing, file processing jobs

Separate queues and DLQs.

KV

Feature flags/public settings/cache metadata

Never authoritative; separate namespaces.

Turnstile

Contact, careers, login-risk and public forms

Distinct site keys/secrets.

WAF/rate rules

Protect website and API

Production rules tested in log/challenge mode first.

Cron Triggers

Scheduled reports, cleanup, reminders and backup orchestration

Environment-specific schedules.

Cloudflare Access

Optional additional admin perimeter

Production and staging policies.

## 7.2 Proposed hostnames

**Hostname**

**Purpose**

**Indexing**

www.example.com

Public website

Allowed

app.example.com

Admin and customer portal

Noindex + authentication

api.example.com

API

Not indexed

media.example.com

Published R2 media

Allowed where appropriate

staging.example.com

Staging

Blocked and access-controlled

## 7.3 Required Worker bindings and secrets

-   DATABASE\_URL / Neon connection secret
-   OIDC issuer, audience and client identifiers/secrets as applicable
-   R2 bucket bindings
-   Queue producer bindings
-   KV namespace binding
-   Turnstile secret
-   Sentry DSN/auth configuration
-   Email provider secret
-   Encryption/signing keys
-   Application environment, release and allowed-origin variables

**Secret rule  
**Never put secrets in wrangler.toml committed values, VITE\_\* variables, source code, screenshots or chat logs. Use wrangler secret and GitHub environment secrets.

# 8\. Git, environments and CI/CD

## 8.1 Repository strategy

main -> production  
staging -> staging environment  
feature/\* -> pull request branches  
fix/\* -> normal fixes  
hotfix/\* -> urgent production fixes

A separate long-lived develop branch is optional. For a small team, main + staging + short-lived branches is simpler and safer than maintaining several permanently divergent branches.

## 8.2 Pull request quality gate

-   npm ci
-   Prettier/format verification
-   ESLint
-   TypeScript typecheck
-   Unit tests
-   API integration tests
-   Playwright smoke tests
-   Frontend production build
-   Worker build/type generation
-   Drizzle migration validation
-   Gitleaks secret scan
-   Dependency/security audit
-   CodeQL/SAST
-   Optional accessibility and Lighthouse budgets

## 8.3 Deployment workflow

1.  Developer creates feature branch and pull request.
2.  CI runs all checks and creates a preview build/database branch where configured.
3.  Reviewer approves code, security implications and migrations.
4.  Merge to staging deploys staging and applies staging migrations.
5.  Staging smoke, functional and user-acceptance tests pass.
6.  Production deployment requires protected-environment approval.
7.  CI records release metadata, applies safe migrations and deploys Worker/assets.
8.  Post-deploy health and smoke tests run; alerts trigger rollback procedure on failure.

# 9\. Migration strategy from the current prototype

**Compatibility objective  
**Existing pages should continue calling a familiar base44.entities.<Entity> interface while its implementation changes from localStorage to HTTPS API calls. This lowers regression risk and allows controlled module-by-module migration.

## 9.1 Migration phases

**Phase**

**Outcome**

Phase 0 - Preserve and baseline

Initialize Git, create a clean baseline commit, remove generated/log files, scan secrets, document current screens and run the application.

Phase 1 - Monorepo foundation

Introduce apps/web, apps/api, packages/contracts, packages/database and infrastructure directories while retaining current app behavior.

Phase 2 - Worker API skeleton

Create Hono Worker, health endpoints, error envelope, request IDs, CORS, security headers and environment config.

Phase 3 - Neon foundation

Create Drizzle schemas, migrations, reference data and environment-specific Neon connectivity.

Phase 4 - Identity and RBAC

Integrate OIDC, organizations, memberships, roles, permissions, protected routes and audit events.

Phase 5 - Compatibility adapter

Rewrite base44Client.js methods to call /api/v1 while keeping list/filter/create/update/delete signatures temporarily.

Phase 6 - Public content

Migrate Product, NewsPost, ContentPage, Farm and public inquiry endpoints; add public caching/SEO.

Phase 7 - Farm operations

Migrate farm blocks, crop plans, daily activities, resources, equipment, weather and approvals.

Phase 8 - Inventory/harvest

Migrate stock ledgers, harvest, grading, quality and loss with transactions.

Phase 9 - Commercial/finance/HR

Migrate customers, orders, procurement, finance, employees, attendance and applications.

Phase 10 - R2 and jobs

Migrate documents and media, signed uploads, queues, reports, email and malware/quarantine flow.

Phase 11 - Production controls

Complete tests, monitoring, WAF, rate limits, backups, restore exercise and staging sign-off.

Phase 12 - Cutover

Freeze local prototype writes, migrate approved seed/real data, deploy production, verify and remove localStorage fallback.

## 9.2 Compatibility adapter example

// Existing page remains compatible during migration  
await base44.entities.Farm.list('-created\_date', 50)  
await base44.entities.Farm.create(payload)  
  
// New adapter implementation  
list(sortBy, limit) -> GET /api/v1/farms?sort=...&limit=...  
create(payload) -> POST /api/v1/farms  
update(id, payload) -> PATCH /api/v1/farms/:id  
delete(id) -> DELETE /api/v1/farms/:id

## 9.3 Data migration rule

-   Treat current seed/localStorage data as development data unless the business explicitly confirms it is real and accurate.
-   Export any needed browser data before removing localStorage support.
-   Transform and validate every record through a migration script; do not manually paste into production tables.
-   Create reconciliation reports: source count, imported count, rejected count and checksums/totals.
-   Keep migration scripts in a controlled tools directory and make them idempotent where practical.
-   Do not migrate mock passwords or local sessions.

# 10\. SEO and AI-search implementation

The platform can be engineered for strong discoverability, but no provider or developer can honestly guarantee that it will always rank first for broad terms such as “mango” or “farm.” The correct objective is technical indexability, authoritative content, regional relevance, strong performance and trusted external signals.

## 10.1 Rendering strategy

-   Pre-render all public routes during build or introduce server-side rendering for dynamic public content.
-   Ensure essential title, description, headings, body content, canonical link and JSON-LD are present in rendered HTML.
-   Keep admin and portal as client-side applications behind authentication and noindex controls.
-   Use unique stable URLs for products, mango varieties, farms, services, news and knowledge articles.
-   Return correct 200, 301, 404 and 410 status codes from the edge.

## 10.2 Public content architecture

**Content cluster**

**Suggested pages**

Products

Kent mango, Keitt mango, Julie mango, fresh mango, dried mango, mango pulp, wholesale/export specifications.

Farms

Farm overview, location/region pages, orchard practices, harvest calendar, traceability.

Markets

Ghana local supply, hotels/restaurants, retailers, exporters, international buyers.

Quality

GlobalG.A.P./certification claims only when verified, grading, cold chain, food safety, pesticide records.

Sustainability

Water, soil health, waste, workers, climate and responsible farming evidence.

Knowledge

Mango varieties, seasons in Ghana, storage, ripeness, nutrition, export processes and buyer FAQs.

News

Harvest updates, certifications, partnerships, farm projects and market announcements.

Trust

About, leadership, contact, policies, locations, company registration and verified business details.

## 10.3 Technical SEO checklist

-   robots.txt with explicit exclusions for /admin, /portal, /api and staging.
-   XML sitemap index and specialized image/news sitemaps when applicable.
-   Canonical URLs and redirect policy for duplicate/trailing-slash variants.
-   JSON-LD validated for Organization, Product, Article/NewsArticle and BreadcrumbList; do not add unsupported claims.
-   Open Graph and social cards.
-   Image dimensions, modern formats, descriptive filenames and meaningful alt text.
-   Core Web Vitals budgets and real-user monitoring.
-   Google Search Console and Bing Webmaster Tools ownership and sitemap submission.
-   International/locale strategy only when actual localized content exists.
-   Analytics and conversion events with consent/privacy controls.

## 10.4 AI-search readiness

-   Use clear factual prose, tables, FAQs and definitions that can be cited accurately.
-   Publish original data and expertise rather than copied generic content.
-   Show author/reviewer identity, publication date and last-updated date.
-   Keep company/product/entity names consistent throughout the site and trusted directories.
-   Provide structured data and crawlable HTML; optional llms.txt may be added but is not a universal ranking mechanism.
-   Allow public content crawlers according to business policy while blocking private data and authenticated pages.
-   Earn relevant links and mentions from agriculture, trade, certification, government, buyer and media sources.
-   Monitor queries, impressions, citations and content gaps; update content based on evidence.

# 11\. Testing, observability and disaster recovery

## 11.1 Test pyramid

**Test layer**

**Coverage**

Unit

Validation, permissions, calculations, transformations, services and utility functions.

Database/integration

Migrations, constraints, transactions, repositories and concurrency.

API contract

Status codes, schemas, auth, authorization, pagination, idempotency and errors.

Component

Forms, tables, permissions, loading/error states and accessibility.

End-to-end

Public browsing, login, admin workflows, portal ownership, uploads and critical approvals.

Security

OWASP tests, role escalation, IDOR/BOLA, CSRF, XSS, injection, upload abuse and rate limits.

Performance

Public pages, dashboard queries, bulk operations, queue throughput and database limits.

Recovery

Neon restore, R2 recovery, migration rollback and Worker redeployment.

## 11.2 Service-level indicators

-   Availability of public website and API
-   p50/p95/p99 API latency
-   Error rate by route and release
-   Authentication success/failure rate
-   Database query latency and errors
-   Queue depth, retries and dead letters
-   R2 upload/download failures
-   Core Web Vitals
-   Deployment success and rollback count
-   Backup/restore test status

## 11.3 Recovery runbook minimum

1.  Declare incident severity and incident lead.
2.  Stop or restrict destructive writes when data integrity is uncertain.
3.  Capture release, request IDs, logs, database state and timeline.
4.  Rollback Worker release when application code is the cause.
5.  Restore Neon to a safe branch/point and validate before redirecting or promoting.
6.  Recover private/public objects from retained versions or backup bucket as applicable.
7.  Rotate exposed credentials and invalidate sessions when compromise is suspected.
8.  Run reconciliation and business validation.
9.  Communicate status and resolution to stakeholders.
10.  Complete post-incident review with preventive actions and owners.

# 12\. Folder structure, implementation phases and acceptance checklists

## 12.1 Target repository structure

mango-farm-platform/  
├── apps/  
│ ├── web/ # existing React/Vite application  
│ │ ├── public/  
│ │ ├── src/  
│ │ │ ├── api/ # typed HTTP client + compatibility adapter  
│ │ │ ├── components/  
│ │ │ ├── features/  
│ │ │ ├── layouts/  
│ │ │ ├── pages/  
│ │ │ ├── routes/  
│ │ │ ├── seo/  
│ │ │ └── test/  
│ │ └── vite.config.ts  
│ └── api/ # Cloudflare Worker API  
│ ├── src/  
│ │ ├── index.ts  
│ │ ├── middleware/  
│ │ ├── modules/  
│ │ ├── services/  
│ │ ├── repositories/  
│ │ ├── jobs/  
│ │ ├── security/  
│ │ └── observability/  
│ ├── test/  
│ └── wrangler.toml  
├── packages/  
│ ├── contracts/ # Zod schemas and API types  
│ ├── database/ # Drizzle schema, migrations, repositories  
│ ├── authorization/ # permission constants/policies  
│ ├── config/ # typed config validation  
│ └── shared/  
├── infrastructure/  
│ ├── cloudflare/ # documented rules/config/scripts  
│ ├── neon/ # branch/migration/backup scripts  
│ └── terraform/ # introduced when justified  
├── scripts/ # migration, seed, reconciliation, release tools  
├── docs/  
│ ├── architecture/  
│ ├── api/  
│ ├── security/  
│ ├── runbooks/  
│ └── decisions/ # ADRs  
├── .github/workflows/  
├── .env.example  
├── package.json  
└── README.md

## 12.2 Initial epics and exit criteria

**Epic**

**Exit criteria**

A. Repository baseline

Git initialized, clean ignore rules, secret scan clean, app builds and current screens documented.

B. Monorepo/tooling

Workspace builds web/API/contracts/database; lint/type/test commands work from root.

C. Worker foundation

Health endpoint deployed to staging; security headers, errors, CORS and request IDs verified.

D. Neon foundation

Schema and migrations deploy to dev/staging; least-privilege runtime role works.

E. Identity/RBAC

No public admin registration; MFA-capable login; server authorization and audit tests pass.

F. Public content API

Products/news/farms load from Neon; cache and SEO metadata work.

G. Farm operations

Daily activity and related records use transactions, permissions and audit logs.

H. Inventory/harvest

Ledger integrity and harvest reconciliation tests pass.

I. Files/jobs

Private signed file access, quarantine and queue retry/DLQ verified.

J. CI/CD/security

Protected deployments, scans, staging tests and rollback procedure pass.

K. Production readiness

Load, security, accessibility, backup/restore and SEO checks signed off.

L. Cutover

Production traffic stable, localStorage fallback removed and post-launch monitoring active.

## 12.3 Definition of done for every feature

-   Business requirement and acceptance criteria are documented.
-   Permission and data-classification impact are identified.
-   Frontend, API, database and audit behavior are implemented as applicable.
-   Input validation exists on client for UX and server for trust.
-   Unit/integration/end-to-end tests cover normal, failure and unauthorized paths.
-   Logs and metrics allow operational diagnosis without exposing sensitive data.
-   API/OpenAPI and user/technical documentation are updated.
-   Accessibility and responsive behavior are checked.
-   Migration and rollback implications are reviewed.
-   Code review and CI checks pass; staging verification is complete.

## 12.4 Master production readiness checklist

**Area**

**Status**

**Owner/evidence**

Frontend

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

API/backend

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Neon database

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

R2 storage

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Authentication

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Authorization

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Cloudflare hosting

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Cloud infrastructure

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Git controls

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

CI/CD

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Application security

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Rate limiting

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Caching/CDN

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Scaling

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Logging/monitoring

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Availability/DR

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

SEO/AI search

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Testing

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Documentation

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Operations handover

\[ \] Not started \[ \] In progress \[ \] Verified

Owner: \_\_\_\_\_\_ Evidence: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

# 13\. Operating procedures and reference sources

## 13.1 Required runbooks

-   Production deployment and rollback
-   Neon migration and restore
-   R2 object recovery and cache purge
-   Credential rotation
-   User suspension and access review
-   Security incident response
-   Data export/deletion request
-   Queue failure/dead-letter handling
-   Domain/DNS recovery
-   SEO release and indexing verification

## 13.2 Decision register

**Decision**

**Selected baseline**

**Review trigger**

Frontend

Retain React/Vite

Major UX rewrite or SSR requirements exceed prerender approach.

API

Cloudflare Worker + Hono

Need for unsupported long-running/native runtime workloads.

Database

Neon PostgreSQL

Regulatory/data residency or sustained workload changes.

ORM

Drizzle

Team capability or feature gap demonstrated.

Storage

Cloudflare R2

Compliance, scanning or archival requirements demand another service.

Identity

OIDC provider + app RBAC

Provider cost, compliance or enterprise SSO needs change.

Admin perimeter

Optional Cloudflare Access + application auth

Broader external admin/customer access requirements.

Repository

Monorepo

Independent teams/releases require split repositories.

## 13.3 Official reference sources

**Source**

**Official URL**

Cloudflare React + Vite / Workers guide

https://developers.cloudflare.com/workers/framework-guides/web-apps/react/

Cloudflare R2 overview

https://developers.cloudflare.com/r2/

Cloudflare R2 caching with a custom domain

https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/

Cloudflare R2 lifecycle rules

https://developers.cloudflare.com/r2/buckets/object-lifecycles/

Cloudflare R2 consistency

https://developers.cloudflare.com/r2/reference/consistency/

Neon branching introduction

https://neon.com/docs/guides/branching-intro

Neon backup/restore updates

https://neon.com/docs/changelog/2025-10-31

Google JavaScript SEO basics

https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics

Google sitemap guidance

https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview

Google structured data with JavaScript

https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript

## 13.4 Immediate next actions

1.  Initialize Git in the actual project folder and create a verified baseline commit.
2.  Create the target monorepo skeleton without deleting current source files.
3.  Add a Cloudflare Worker API health endpoint and staging Wrangler configuration.
4.  Create Neon development/staging/production topology and least-privilege credentials.
5.  Design and review IAM plus the first public-content database migrations.
6.  Implement the compatibility API adapter for one low-risk entity (Product) as the migration proof of concept.
7.  Add CI checks and deploy the proof of concept to staging.
8.  Continue module migration according to Phase 6 onward.

**Development control  
**This document is the baseline. Every material architecture change should be recorded as an Architecture Decision Record (ADR) in docs/decisions and reflected in this checklist.