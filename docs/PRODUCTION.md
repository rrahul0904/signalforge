# Production hardening

## Already handled

- SSRF guard for localhost, RFC1918/private networks, CGNAT/link-local ranges and metadata host.
- DNS resolution validation before remote fetch.
- Manual redirect handling with safety revalidation on every hop.
- 12-second upstream timeout.
- Streamed 2 MB HTML processing cap (oversized responses are terminated instead of fully buffered).
- 1 MB JSON body limit.
- Static path traversal guard.
- Content Security Policy, nosniff, permissions policy and referrer policy.
- LLM provider fallback instead of hard failure.
- No client-side API keys.
- User-editable evidence-backed Product Memory.
- Structured selective refinement that preserves untouched creative fields.
- Health (`/api/health`) and readiness (`/api/ready`) endpoints.
- Correlatable `X-Request-ID` responses and JSON access/error logs.
- Bounded in-memory per-client/per-route API rate limiting with `Retry-After` and `X-RateLimit-*` headers.
- Sanitized operational/provider counters behind an explicit `METRICS_PUBLIC=1` switch.
- Graceful SIGTERM/SIGINT shutdown with a bounded drain timeout.
- CI certification on Node 20/22 plus Docker build verification.

## Operational configuration

Defaults are safe for a single-instance public preview and can be overridden with environment variables:

- `RATE_WINDOW_MS=60000`
- `RATE_LIMIT_API=120`
- `RATE_LIMIT_SCAN=20`
- `RATE_LIMIT_GENERATE=60`
- `SHUTDOWN_TIMEOUT_MS=10000`
- `METRICS_PUBLIC=0`

The built-in limiter is deliberately process-local and bounded. For horizontally scaled production, replace it with a shared Redis/edge limiter keyed by authenticated account + IP as appropriate.

## Integration adapters to add for multi-user SaaS

1. Replace localStorage persistence with Postgres tables protected by row-level ownership rules.
2. Add OAuth/magic-link authentication and an organization/workspace layer.
3. Move generated PNGs to object storage and store immutable asset versions.
4. Wire Stripe checkout/webhooks to plan entitlements instead of the local demo toggle.
5. Add a managed browser/crawler for JS-heavy sites and robots-policy handling.
6. Add a dedicated image model adapter. Keep typography and final composition in the structured renderer.
7. Add background jobs for long scans and video rendering.
8. Replace process-local rate limiting/metrics with shared observability, account quotas, provider cost attribution and durable audit events.

None of these are required to run or evaluate the end-to-end core product locally.
