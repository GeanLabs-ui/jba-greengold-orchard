# Production operations

## Cloudflare WAF rate-limit rules (configure in Cloudflare dashboard)

Add the following WAF custom rate-limit rules in the Cloudflare dashboard under **Security → WAF → Rate limiting rules** as edge-layer defence in depth. These rules complement the application-layer limits already in code.

| Rule name | Expression | Rate | Period | Action |
|---|---|---|---|---|
| Auth endpoint rate limit | `http.request.uri.path matches "^/api/v1/auth/"` | 20 req | 60 s | Block (duration: 10 min) |
| Inquiry form rate limit | `http.request.uri.path eq "/api/v1/entities/Inquiry" and http.request.method eq "POST"` | 10 req | 60 s | Block (duration: 10 min) |
| Application upload rate limit | `http.request.uri.path eq "/api/v1/applications" and http.request.method eq "POST"` | 5 req | 60 s | Block (duration: 30 min) |
| General API rate limit | `http.request.uri.path matches "^/api/"` | 200 req | 60 s | Block (duration: 5 min) |

## Cloudflare Logpush configuration

Configure a Logpush job in the Cloudflare dashboard under **Analytics → Logs → Logpush**:
1. Select **Workers Trace Events** and **HTTP requests** datasets.
2. Push to an R2 bucket (e.g., `jba-greengold-logs`) or a third-party provider (e.g., Datadog, Logtail).
3. Set a retention lifecycle of at least 90 days.
4. Create a Cloudflare notification under **Notifications** for: Worker error rate >1%, 5xx spike, health-check failure, R2 storage limit >80%.

## GitHub plan requirement for branch protection

> ⚠️ **Required before production launch**: Upgrade the GitHub account to **GitHub Pro** (minimum) or **GitHub Team** to enable branch protection rules, required reviewers, and dismiss-stale-review policies on private repositories. Without this, any team member can push directly to `main` without code review, bypassing CI.

Steps after upgrading:
1. Settings → Branches → Add rule for `main`: require PR, require 1 reviewer, require status checks (CI verify), dismiss stale reviews, do not allow bypassing.
2. Repeat for `staging`.
3. Enable "Require signed commits" if possible.

## Monitoring and alerts

Enable Cloudflare alerts for elevated Worker errors, availability, traffic anomalies, and usage limits. Send structured Worker logs to a retained log destination and alert on repeated `5xx`, authentication spikes, rate-limit spikes, R2 failures, and Neon connection exhaustion. Keep health checks external to Cloudflare and target the public `/api/v1/health` endpoint every minute.

Review dependency updates weekly, CodeQL findings on every pull request, access roles monthly, and Cloudflare/GitHub/Neon administrator membership quarterly. Rotate deployment and email credentials immediately after staff departures or suspected exposure.

## Incident response

1. Declare an owner and record timestamps, symptoms, and affected users.
2. Contain the issue: disable a compromised secret, roll back the affected release, or enable a maintenance response at the edge.
3. Preserve Cloudflare, GitHub audit, and database logs. Do not delete evidence.
4. Recover using the last verified deployment and, when required, a Neon point-in-time branch.
5. Validate authentication, writes, uploads, and customer isolation before reopening traffic.
6. Write a blameless post-incident review with corrective owners and due dates.

## Recovery objectives

Adopt an initial target of RTO 60 minutes and RPO 15 minutes, then validate it with a quarterly restore exercise. Availability depends on Cloudflare's global edge and Neon's regional database; a real disaster-recovery claim requires an observed restore drill, documented DNS/access ownership, and a verified offline copy of configuration and runbooks.
