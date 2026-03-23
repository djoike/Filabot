import { SheetRow } from "./types.js";
import { normalizeLineEndings, toBool } from "./utils.js";

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(content: string): string[][] {
  const normalized = normalizeLineEndings(content);
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.map(parseCsvLine);
}

function headerIndex(headers: string[], name: string): number {
  return headers.findIndex((header) => header.trim().toLowerCase() === name.toLowerCase());
}

export async function loadSheetRows(sheetCsvUrl: string): Promise<SheetRow[]> {
  const response = await fetch(sheetCsvUrl, {
    headers: {
      Accept: "text/csv,text/plain;q=0.9,*/*;q=0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet CSV: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];
  const nameIdx = headerIndex(headers, "Name");
  const urlIdx = headerIndex(headers, "URL");
  const enabledIdx = headerIndex(headers, "enabled");

  if (nameIdx === -1 || urlIdx === -1 || enabledIdx === -1) {
    throw new Error("Sheet must include Name, URL, and enabled columns");
  }

  return rows.slice(1).map((row, index) => {
    const name = row[nameIdx] ?? "";
    const url = row[urlIdx] ?? "";
    const enabled = toBool(row[enabledIdx] ?? "");

    return {
      name,
      url,
      enabled,
      rowNumber: index + 2,
    };
  });
}
