# SignalForge

SignalForge is an evidence-backed Product Memory and AI marketing workspace inspired by the strongest ideas identified while reverse-engineering SiteSyn.

It turns a product URL into a reusable marketing context that can drive structured social creatives, copy, refinements and competitor intelligence without requiring the user to restate the product on every prompt.

## What works

- URL scanning with SSRF protection and redirect-by-redirect validation
- Evidence-backed Product Memory extraction
- Brand palette and messaging extraction
- Audience, feature, positioning and preference memory
- Structured creative generation
- Selective creative refinement without regenerating untouched fields
- Multiple output formats (1:1, 4:5, 9:16, 16:9)
- PNG and copy export
- Competitor scan/comparison
- Product Memory revision history + restore
- Recent creative persistence
- Free/Pro usage metering
- Deterministic fallback generation when no AI API key is configured
- Optional external LLM integration
- Docker + Railway deployment configuration
- Automated unit, surface, smoke, and Docker CI checks

## Run locally

Requirements: Node.js 20+

```bash
npm start
```

Then open `http://localhost:3000`.

No install step is required because the core runtime intentionally has zero external npm dependencies.

## Certification

```bash
npm run certify
```

That runs syntax checks, the Node test suite, and an HTTP smoke test against a real server process.

## Environment

Copy `.env.example` and set optional provider credentials as needed.

The application remains functional without an AI key by using the local deterministic generation engine.

## Architecture

```text
Product URL
   ↓
Safe scanner + evidence extractor
   ↓
Product Memory
   ├── facts
   ├── positioning
   ├── audiences
   ├── features
   ├── brand palette
   └── learned preferences
   ↓
Creative generation / refinement / competitor intelligence
   ↓
Structured DesignSpec-style output
   ↓
Canvas preview + export
```

## Production notes

See:

- `docs/PRODUCTION.md`
- `docs/RELEASE_CHECKLIST.md`
- `SECURITY.md`
- `docs/REVERSE_ENGINEERING.md`

## Current release

`v1.1.0`

This repository is an independently built product reconstruction based on publicly observable product behavior and does not contain SiteSyn source code or proprietary assets.
