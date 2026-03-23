import { MonitorItem } from "./types.js";

export interface PushcutPayload {
  title: string;
  text: string;
  item: {
    name: string;
    url: string;
    variantId: string;
  };
  checkedAt: string;
}

export function buildPushcutPayload(item: MonitorItem, checkedAt: string): PushcutPayload {
  return {
    title: `In stock: ${item.name}`,
    text: `${item.name} is in stock now.`,
    item: {
      name: item.name,
      url: item.url,
      variantId: item.variantId,
    },
    checkedAt,
  };
}

export async function sendPushcutNotification(
  webhookUrl: string,
  payload: PushcutPayload,
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json,text/plain,*/*",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Pushcut request failed: ${response.status} ${response.statusText} (${body})`);
  }
}
