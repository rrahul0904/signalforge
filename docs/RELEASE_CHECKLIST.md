# Release checklist

## Repository gate

SignalForge must live in its own GitHub repository before hosted CI or Git-based deployment can be certified.

Create the repository:

```bash
gh repo create rrahul0904/signalforge --public --description "Evidence-backed Product Memory and AI marketing workspace"
```

After the repository exists, push the current `main` head and require the `CI / certify` and `CI / docker` jobs to pass.

## Code certification

Run locally:

```bash
npm run certify
```

This validates JavaScript syntax, ten unit/surface tests, then starts the real HTTP service and verifies:

- home page loads;
- structured generation works;
- selective refinement preserves untouched fields;
- private-network scan attempts are rejected.

## Deployment gate

The repository is deployable as a Node service or Docker image. `railway.json` uses `/api/health` as the deployment health check.

A hosted release is truthful when:

1. the exact Git commit deployed is recorded;
2. `/api/health` returns HTTP 200;
3. the landing page loads from the hosted URL;
4. generation and selective refinement both succeed;
5. a public HTTPS URL can be scanned from the hosting environment;
6. the host cannot scan localhost/private-network targets.

## Optional production SaaS integrations

These are not required for the self-contained single-user product, but are required before marketing SignalForge as a multi-user paid SaaS:

- managed authentication;
- durable database persistence with row-level ownership controls;
- object storage for generated assets;
- real Stripe entitlements instead of the local Pro demo toggle;
- managed/isolated browser crawling for JS-heavy sites;
- per-account rate limiting, audit logging and provider cost controls.

No SignalForge-specific Supabase project currently exists in the connected account. Do not reuse an unrelated project simply to bypass that setup boundary.
