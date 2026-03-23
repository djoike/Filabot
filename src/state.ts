import fs from "node:fs/promises";
import path from "node:path";
import { BotState } from "./types.js";

const EMPTY_STATE: BotState = {
  items: {},
  updatedAt: null,
};

export async function loadState(stateFilePath: string): Promise<BotState> {
  try {
    const content = await fs.readFile(stateFilePath, "utf8");
    const parsed = JSON.parse(content) as Partial<BotState>;

    return {
      items: parsed.items ?? {},
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return EMPTY_STATE;
    }
    throw error;
  }
}

export async function saveState(stateFilePath: string, state: BotState): Promise<void> {
  const directory = path.dirname(stateFilePath);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(stateFilePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
