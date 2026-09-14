# Release checklist

## Repository gate

Canonical repository: `rrahul0904/signalforge`.

Every release candidate must be present on `main`, and the GitHub Actions `certify (20)`, `certify (22)`, and `docker` jobs must pass on the exact deployed commit.

## Code certification

Run locally:

```bash
npm run certify
```

This validates JavaScript syntax, twelve unit/surface tests, then starts the real HTTP service and verifies:

- readiness reports the deterministic fallback when no AI key is configured;
- home page loads;
- structured generation works;
- selective refinement preserves untouched fields;
- per-route rate limiting returns HTTP 429 and `Retry-After`;
- sanitized metrics count requests/rate-limit events when explicitly enabled;
- private-network scan attempts are rejected.

## Deployment gate

The repository is deployable as a Node service or Docker image. `railway.json` uses `/api/health` as the deployment health check.

A hosted release is truthful when:

1. the exact Git commit deployed is recorded;
2. `/api/health` and `/api/ready` return HTTP 200;
3. the landing page loads from the hosted URL;
4. generation and selective refinement both succeed;
5. a public HTTPS URL can be scanned from the hosting environment;
6. the host cannot scan localhost/private-network targets;
7. rate limiting returns 429 under a controlled low-limit test;
8. request IDs are present in responses and structured request logs are visible in the host logs;
9. SIGTERM drains the HTTP server cleanly.

## Optional production SaaS integrations

These are not required for the self-contained single-user product, but are required before marketing SignalForge as a multi-user paid SaaS:

- managed authentication;
- durable database persistence with row-level ownership controls;
- object storage for generated assets;
- real Stripe entitlements instead of the local Pro demo toggle;
- managed/isolated browser crawling for JS-heavy sites;
- shared per-account rate limiting, durable audit logging and provider cost controls.

Do not reuse an unrelated Supabase/Railway project simply to bypass an account or capacity boundary.
