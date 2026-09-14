# Security

SignalForge scans URLs supplied by users, so the scanner is treated as an SSRF-sensitive boundary.

Implemented controls:

- HTTP/HTTPS allowlist only.
- Credential-bearing URLs rejected.
- DNS resolution checked for loopback, RFC1918/private, link-local, CGNAT, benchmark and local IPv6 ranges.
- Redirects are handled manually and every hop is revalidated before fetching.
- Redirect chain capped at five hops.
- Twelve-second total scan timeout.
- HTML response types only.
- Two-megabyte streamed response cap, so oversized pages are stopped instead of fully buffered.
- One-megabyte JSON request cap.
- Static path traversal guard.
- CSP, frame-ancestor blocking, no-sniff, referrer and permissions policies.
- API keys remain server-side.

For an internet-facing multi-tenant deployment, add per-account rate limits, abuse controls, managed browser isolation for JavaScript-heavy crawling, durable audit logs, and egress/network policy where supported by the host.
