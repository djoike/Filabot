const DEFAULT_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1MMVqdQe-4Fcl5xj8QYXWP_ajQSOXh2DwaoAss3WQo4Y/export?format=csv";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export const config = {
  sheetCsvUrl: process.env.SHEET_CSV_URL ?? DEFAULT_SHEET_CSV_URL,
  pushcutWebhookUrl: process.env.PUSHCUT_WEBHOOK_URL,
  cooldownMinutes: parsePositiveInt(process.env.COOLDOWN_MINUTES, 10),
  stateFilePath: process.env.STATE_FILE_PATH ?? ".bot-state/state.json",
  userAgent: "Filabot/1.0 (+https://github.com/actions)",
  fetchTimeoutMs: parsePositiveInt(process.env.FETCH_TIMEOUT_MS, 15000),
};
