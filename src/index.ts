import "dotenv/config";
import { appendFile } from "node:fs/promises";
import { fetchBambuProductStock } from "./bambu.js";
import { config } from "./config.js";
import { buildPushcutPayload, sendPushcutNotification } from "./pushcut.js";
import { loadSheetRows } from "./sheets.js";
import { loadState, saveState } from "./state.js";
import { BotState, CheckResult, MonitorItem, RunStats } from "./types.js";
import { canonicalProductUrl, extractVariantId, formatNowIso, stableItemKey } from "./utils.js";

function toMonitorItems(rows: Awaited<ReturnType<typeof loadSheetRows>>): {
  items: MonitorItem[];
  invalidRows: number;
} {
  const items: MonitorItem[] = [];
  let invalidRows = 0;

  for (const row of rows) {
    if (!row.enabled) {
      continue;
    }

    const variantId = extractVariantId(row.url);
    const productUrl = canonicalProductUrl(row.url);

    if (!variantId || !productUrl) {
      invalidRows += 1;
      console.warn(`Row ${row.rowNumber}: invalid URL or missing id parameter (${row.url})`);
      continue;
    }

    items.push({
      key: stableItemKey(row.url),
      name: row.name.trim() || `Row ${row.rowNumber}`,
      url: row.url,
      productUrl,
      variantId,
      rowNumber: row.rowNumber,
    });
  }

  return { items, invalidRows };
}

function shouldNotify(
  result: CheckResult,
  previousState: BotState["items"][string] | undefined,
  cooldownMinutes: number,
): boolean {
  if (result.status !== "in_stock") {
    return false;
  }

  const lastStatus = previousState?.lastStatus;
  if (lastStatus !== "in_stock") {
    return true;
  }

  if (!previousState?.lastAlertAt) {
    return true;
  }

  const lastAlert = Date.parse(previousState.lastAlertAt);
  if (Number.isNaN(lastAlert)) {
    return true;
  }

  const cooldownMs = cooldownMinutes * 60 * 1000;
  return Date.now() - lastAlert >= cooldownMs;
}

function summarizeResults(results: CheckResult[]): RunStats {
  const stats: RunStats = {
    checked: results.length,
    fetchedPages: 0,
    alertsSent: 0,
    invalidRows: 0,
    errors: 0,
  };

  for (const result of results) {
    if (result.status === "error") {
      stats.errors += 1;
    }
    if (result.status === "invalid_config") {
      stats.invalidRows += 1;
    }
  }

  return stats;
}

async function writeSummary(lines: string[]): Promise<void> {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  await appendFile(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  console.log("Loading sheet rows...");
  const rows = await loadSheetRows(config.sheetCsvUrl);
  const { items, invalidRows } = toMonitorItems(rows);
  console.log(`Loaded ${rows.length} rows, ${items.length} enabled and valid items`);

  const state = await loadState(config.stateFilePath);
  const checkResults: CheckResult[] = [];
  const pageCache = new Map<string, Awaited<ReturnType<typeof fetchBambuProductStock>>>();

  for (const item of items) {
    const checkedAt = formatNowIso();

    try {
      let pageData = pageCache.get(item.productUrl);
      if (!pageData) {
        pageData = await fetchBambuProductStock(item.productUrl);
        pageCache.set(item.productUrl, pageData);
      }

      const variant = pageData.variants.get(item.variantId);
      if (!variant) {
        checkResults.push({
          item,
          status: "invalid_config",
          checkedAt,
          error: `Variant id ${item.variantId} not found on product page`,
        });
        continue;
      }

      checkResults.push({
        item,
        status: variant.status,
        checkedAt,
        variantName: variant.variantName,
        rawAvailability: variant.rawAvailability,
      });
    } catch (error) {
      checkResults.push({
        item,
        status: "error",
        checkedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const stats = summarizeResults(checkResults);
  stats.fetchedPages = pageCache.size;
  stats.invalidRows += invalidRows;

  for (const result of checkResults) {
    const previous = state.items[result.item.key];
    const notify = config.pushcutWebhookUrl
      ? shouldNotify(result, previous, config.cooldownMinutes)
      : false;

    if (notify && config.pushcutWebhookUrl) {
      const payload = buildPushcutPayload(result.item, result.checkedAt);
      await sendPushcutNotification(config.pushcutWebhookUrl, payload);
      stats.alertsSent += 1;
      console.log(`Alert sent: ${result.item.name}`);
    }

    state.items[result.item.key] = {
      name: result.item.name,
      url: result.item.url,
      productUrl: result.item.productUrl,
      variantId: result.item.variantId,
      lastStatus: result.status,
      lastCheckedAt: result.checkedAt,
      lastAlertAt: notify ? result.checkedAt : previous?.lastAlertAt,
      lastError: result.error,
    };

    const summaryLine = `${result.item.name} (${result.item.variantId}): ${result.status}`;
    if (result.error) {
      console.warn(`${summaryLine} - ${result.error}`);
    } else {
      console.log(summaryLine);
    }
  }

  state.updatedAt = formatNowIso();
  await saveState(config.stateFilePath, state);

  const summaryLines = [
    "## Stock Bot Run",
    "",
    `- Items checked: ${stats.checked}`,
    `- Unique product pages fetched: ${stats.fetchedPages}`,
    `- Alerts sent: ${stats.alertsSent}`,
    `- Invalid rows: ${stats.invalidRows}`,
    `- Errors: ${stats.errors}`,
  ];

  await writeSummary(summaryLines);
  console.log(summaryLines.join("\n"));

  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
