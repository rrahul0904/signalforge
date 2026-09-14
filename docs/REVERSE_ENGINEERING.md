# Clean-room product reconstruction notes

## Core abstraction

The defensible product is not an image generator. It is the persistent context layer:

`public product evidence -> editable Product Memory -> generation context -> structured assets -> feedback -> preference memory`

## Key product decisions

- Product claims are stored with source evidence instead of silently hallucinated.
- The renderer owns copy, typography, layout and logo placement; image models are optional scene/background providers.
- Refinements mutate structured asset fields rather than regenerating everything blindly.
- Preference learning is inspectable and editable.
- Provider credentials are optional, not runtime blockers.

## Data model for a hosted version

- users / organizations / memberships
- products / product_scans
- product_memory / product_memory_revisions / memory_evidence
- audience_roles / brand_profiles / learned_preferences
- conversations / messages
- creative_projects / assets / asset_versions / design_specs
- competitors / competitor_scans
- usage_events / subscriptions
