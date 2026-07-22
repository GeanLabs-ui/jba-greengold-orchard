# Production operations

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
