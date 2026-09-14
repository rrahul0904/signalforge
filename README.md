# SignalForge

A clean-room, evidence-backed implementation of the **persistent Product Memory → marketing chat → structured creative** product pattern.

SignalForge is inspired by the workflow observed in products such as SiteSyn, but does **not** copy proprietary source code, private prompts, branding, or assets.

## What works now

- Public URL scanning with SSRF protections, timeouts, content-type validation, title/meta/heading/CTA extraction, visual color token extraction, and source evidence.
- Persistent editable Product Memory in the browser with revision history UI and one-click restore.
- Audience, features, brand palette, learned-preference editing.
- Marketing chat with deterministic no-key fallback and optional OpenAI Responses adapter.
- Structured social creative generation in 1:1, 4:5, 9:16, and 16:9 formats.
- True selective refinement flow: format, palette, headline and other structured fields can change without rebuilding untouched fields.
- Preference learning from refinements (dark, short/punchy, minimal).
- Real PNG export rendered in-browser from structured creative data.
- Copy-to-clipboard marketing copy.
- Competitor URL scanning and side-by-side evidence comparison.
- Daily usage metering with Free/Pro demo plans.
- Recent creative history with one-click restore.
- Responsive polished dashboard.
- No package dependencies required for the core app.

## Run

```bash
npm start
# open http://localhost:3000
```

Optional demo Product Memory:

```text
http://localhost:3000/?demo=1#studio
```

## Verify

```bash
npm run certify
```

GitHub Actions repeats certification on Node 20 and 22 and also verifies the production Docker image builds.

## Optional real LLM generation

The product works without credentials. To use the provider adapter:

```bash
cp .env.example .env
export OPENAI_API_KEY=...
export AI_MODEL=gpt-5.6
npm start
```

If the provider errors, SignalForge automatically falls back to deterministic generation so the product does not become unusable.

## Architecture

```text
Browser
 ├── Overview / scanner
 ├── Product Memory editor
 ├── Marketing chat
 ├── Structured creative renderer
 ├── PNG exporter
 └── Competitor intelligence
        │
        ▼
Node HTTP service (zero dependency)
 ├── URL safety / DNS checks
 ├── Website fetch + evidence extraction
 ├── Product Memory synthesis
 └── Generation adapter
      ├── OpenAI (optional)
      └── deterministic fallback
```

## Production boundary

The repo deliberately separates **core product functionality** from credential-dependent integrations. The following integrations are adapters, not blockers:

- OAuth / managed auth
- durable Postgres persistence / RLS
- Stripe billing
- managed object storage
- external image-generation provider

The current application is fully runnable and testable without any of them. See `docs/PRODUCTION.md` for the production hardening path.
