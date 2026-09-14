# Production hardening

## Already handled

- SSRF guard for localhost, RFC1918/private networks, CGNAT/link-local ranges and metadata host.
- DNS resolution validation before remote fetch.
- Manual redirect handling with safety revalidation on every hop.
- 12-second upstream timeout.
- Streamed 2 MB HTML processing cap (oversized responses are terminated instead of fully buffered).
- 1 MB JSON body limit.
- Static path traversal guard.
- Content Security Policy, nosniff and referrer policy.
- LLM provider fallback instead of hard failure.
- No client-side API keys.
- User-editable evidence-backed Product Memory.
- Structured selective refinement that preserves untouched creative fields.
- CI certification on Node 20/22 plus Docker build verification.

## Integration adapters to add for multi-user SaaS

1. Replace localStorage persistence with Postgres tables protected by row-level ownership rules.
2. Add OAuth/magic-link authentication and an organization/workspace layer.
3. Move generated PNGs to object storage and store immutable asset versions.
4. Wire Stripe checkout/webhooks to plan entitlements instead of the local demo toggle.
5. Add a managed browser/crawler for JS-heavy sites and robots-policy handling.
6. Add a dedicated image model adapter. Keep typography and final composition in the structured renderer.
7. Add background jobs for long scans and video rendering.
8. Add observability, provider cost tracking, abuse/rate limiting and audit events.

None of these are required to run or evaluate the end-to-end core product locally.
