import { config } from "./config.js";
import { ProductStockData, VariantStock } from "./types.js";
import { availabilityToStatus, decodeHtmlEntities } from "./utils.js";

interface JsonLdVariant {
  sku?: unknown;
  name?: unknown;
  offers?: {
    availability?: unknown;
  };
}

interface ProductJsonLd {
  name?: unknown;
  hasVariant?: unknown;
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.fetchTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": config.userAgent,
        Accept: "text/html,*/*;q=0.1",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product page: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseProductJsonLd(html: string): ProductJsonLd {
  const match = html.match(
    /<script\s+id=["']product-jsonld["']\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i,
  );

  if (!match?.[1]) {
    throw new Error("Could not find product-jsonld script in product page");
  }

  const raw = match[1].trim();

  try {
    return JSON.parse(raw) as ProductJsonLd;
  } catch {
    const decoded = decodeHtmlEntities(raw);
    return JSON.parse(decoded) as ProductJsonLd;
  }
}

function parseVariants(data: ProductJsonLd): Map<string, VariantStock> {
  const variants = new Map<string, VariantStock>();
  if (!Array.isArray(data.hasVariant)) {
    return variants;
  }

  for (const rawVariant of data.hasVariant as JsonLdVariant[]) {
    const variantId = typeof rawVariant.sku === "string" ? rawVariant.sku.trim() : "";
    if (!variantId) {
      continue;
    }

    const variantName =
      typeof rawVariant.name === "string" && rawVariant.name.trim().length > 0
        ? rawVariant.name.trim()
        : variantId;

    const rawAvailability =
      typeof rawVariant.offers?.availability === "string"
        ? rawVariant.offers.availability
        : undefined;

    variants.set(variantId, {
      variantId,
      variantName,
      status: availabilityToStatus(rawAvailability),
      rawAvailability,
    });
  }

  return variants;
}

export async function fetchBambuProductStock(productUrl: string): Promise<ProductStockData> {
  const html = await fetchHtml(productUrl);
  const jsonLd = parseProductJsonLd(html);
  const variants = parseVariants(jsonLd);
  const productName =
    typeof jsonLd.name === "string" && jsonLd.name.trim().length > 0
      ? jsonLd.name.trim()
      : productUrl;

  return {
    productUrl,
    productName,
    variants,
  };
}
