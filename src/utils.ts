import crypto from "node:crypto";

export function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function toBool(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

export function stableItemKey(url: string): string {
  return crypto.createHash("sha1").update(url.trim()).digest("hex");
}

export function extractVariantId(urlValue: string): string | null {
  try {
    const parsed = new URL(urlValue);
    const id = parsed.searchParams.get("id");
    if (!id || !id.trim()) {
      return null;
    }
    return id.trim();
  } catch {
    return null;
  }
}

export function canonicalProductUrl(urlValue: string): string | null {
  try {
    const parsed = new URL(urlValue);
    parsed.searchParams.delete("id");
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function availabilityToStatus(rawAvailability: unknown):
  | "in_stock"
  | "out_of_stock"
  | "unknown" {
  if (typeof rawAvailability !== "string") {
    return "unknown";
  }

  if (rawAvailability.includes("InStock")) {
    return "in_stock";
  }
  if (rawAvailability.includes("OutOfStock")) {
    return "out_of_stock";
  }

  return "unknown";
}

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function formatNowIso(): string {
  return new Date().toISOString();
}
