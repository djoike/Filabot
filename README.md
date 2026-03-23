# Filabot

A lightweight stock-monitor bot for Bambu Lab product variants.

It reads a public Google Sheet, checks stock for each exact variant ID (`?id=...`), and sends Pushcut notifications when a variant comes in stock.

## How it works

- Reads rows from a public Google Sheet CSV export.
- Uses each row URL's `id` query parameter as the exact variant target.
- Fetches each unique product page once per run and reuses parsed variant stock for all matching rows.
- Tracks previous state in `state.json` on a dedicated `bot-state` branch.
- Sends Pushcut webhook alerts when status transitions to in stock, with a 10-minute cooldown.

## Required sheet columns

- `Name`
- `URL`
- `enabled`

Example row:

| Name | URL | enabled |
|---|---|---|
| Hvid PETG | https://eu.store.bambulab.com/products/petg-hf?id=49068714787164 | 1 |

`enabled` accepts `1`, `true`, `yes`, `y`, or `on`.

## Local development

Install dependencies:

```bash
npm ci
```

Create local env file:

```bash
cp .env.example .env
```

Then set at least `PUSHCUT_WEBHOOK_URL` in `.env`.

Run once:

```bash
npm run start
```

Useful scripts:

- `npm run check` - typecheck
- `npm run build` - compile to `dist/`
- `npm run start` - run bot

## GitHub Actions setup

1. Add repository secret:
   - `PUSHCUT_WEBHOOK_URL`
2. Confirm the workflow file exists at:
   - `.github/workflows/check-stock.yml`
3. Optional: run once manually via **Actions -> Check stock -> Run workflow**

The workflow runs every 5 minutes and persists state to branch `bot-state` as `state.json`.

## Environment variables

- `SHEET_CSV_URL` (optional)
  - Defaults to your current sheet export URL.
- `PUSHCUT_WEBHOOK_URL` (optional but required for alerts)
  - If missing, bot still checks stock but does not send notifications.
- `COOLDOWN_MINUTES` (optional)
  - Default: `10`
- `STATE_FILE_PATH` (optional)
  - Default: `.bot-state/state.json`

## Notes

- The bot checks stock for the exact variant ID from each row URL, not for all variants.
- If URL has no `id` or if `id` does not exist on the product page, the row is marked invalid and skipped.
- `.env` files are ignored by git; use `.env.example` as template.
