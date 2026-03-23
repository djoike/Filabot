export type StockStatus =
  | "in_stock"
  | "out_of_stock"
  | "unknown"
  | "invalid_config"
  | "error";

export interface SheetRow {
  name: string;
  url: string;
  enabled: boolean;
  rowNumber: number;
}

export interface MonitorItem {
  key: string;
  name: string;
  url: string;
  productUrl: string;
  variantId: string;
  rowNumber: number;
}

export interface VariantStock {
  variantId: string;
  variantName: string;
  status: StockStatus;
  rawAvailability?: string;
}

export interface ProductStockData {
  productUrl: string;
  productName: string;
  variants: Map<string, VariantStock>;
}

export interface CheckResult {
  item: MonitorItem;
  status: StockStatus;
  checkedAt: string;
  variantName?: string;
  rawAvailability?: string;
  error?: string;
}

export interface ItemState {
  name: string;
  url: string;
  productUrl: string;
  variantId: string;
  lastStatus: StockStatus;
  lastCheckedAt: string;
  lastAlertAt?: string;
  lastError?: string;
}

export interface BotState {
  items: Record<string, ItemState>;
  updatedAt: string | null;
}

export interface RunStats {
  checked: number;
  fetchedPages: number;
  alertsSent: number;
  invalidRows: number;
  errors: number;
}
