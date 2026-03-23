# AGENT.md

## Purpose

This file defines repository-specific rules for coding agents working on Filabot.

## Project overview

- Filabot monitors Bambu Lab product variant stock.
- Input comes from a public Google Sheet CSV.
- Alerts are sent to Pushcut via webhook.
- Bot state is persisted as JSON and synced to the `bot-state` branch by GitHub Actions.

## Non-negotiable behavior

- Track stock for the exact variant ID from each row URL (`?id=...`).
- Do not treat product-level or other-variant stock as success.
- Parse per-variant availability from the page JSON-LD (`product-jsonld`).
- Fetch each canonical product page once per execution and reuse parsed variants for all matching rows.
- Send alerts only when status is `in_stock` and either:
  - previous status was not `in_stock`, or
  - cooldown has elapsed.
- Keep default cooldown behavior at 10 minutes unless explicitly changed.

## Data contract (Google Sheet)

Required columns:

- `Name`
- `URL`
- `enabled`

Rules:

- `URL` must include `id` query parameter.
- If URL is invalid or `id` is missing, row is invalid and skipped.
- If `id` is not found among parsed variants, row is invalid and skipped.
- Invalid rows should be reported, not crash the full run.

## Code map

- `src/index.ts`: orchestration, grouping/caching, state updates, alert decision.
- `src/sheets.ts`: CSV fetch + parse + row normalization.
- `src/bambu.ts`: product page fetch + JSON-LD parse + variant mapping.
- `src/pushcut.ts`: webhook payload + send.
- `src/state.ts`: load/save state file.
- `src/config.ts`: env-driven config.

## State and workflow rules

- Local state path defaults to `.bot-state/state.json`.
- Scheduled workflow is `.github/workflows/check-stock.yml`.
- Workflow must keep `bot-state` branch persistence working.
- Do not introduce changes that make repeated scheduled runs non-idempotent.

## Environment and secrets

- Node.js 20+.
- Use `.env` for local development.
- `.env` must never be committed.
- Never hardcode webhook tokens or other secrets in tracked files.
- GitHub Actions should consume secrets via repository secrets.

## Development rules

- Keep dependencies minimal.
- Prefer robust parsing and validation over brittle string matching.
- Keep clear logs per monitored row and an end-of-run summary.
- If upstream markup changes, preserve exact variant matching semantics.
- Avoid broad refactors unless required for correctness/maintainability.
- Commit every iteration or semantic change with a meaningful commit message.
- Do not batch unrelated changes into a single commit.

## Verification checklist

Run before finishing changes:

- `npm run check`
- `npm run build`
- `npm run start` (when safe locally)

Expected outcomes:

- Valid rows resolve to per-variant status.
- Invalid rows are skipped and reported.
- Shared product pages are fetched once per run.
- Notification logic follows transition + cooldown behavior.

## Safe extensions

- Add optional sheet columns (e.g., per-item cooldown) with sensible defaults.
- Add support for additional stores behind isolated adapters.
- Improve summary/reporting without changing stock semantics.

## High-risk changes

- Changing item keying/state format.
- Changing alert transition/cooldown semantics.
- Changing GitHub Actions state persistence flow.
- Replacing exact variant matching with product-level checks.
