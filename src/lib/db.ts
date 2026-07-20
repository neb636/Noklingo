import Dexie, { type EntityTable } from "dexie";
import type { PersistedAppData } from "@/src/domain/types";

type AppRecord = {
  id: "app";
  data: PersistedAppData;
  updatedAt: string;
};

class NoklingoDatabase extends Dexie {
  app!: EntityTable<AppRecord, "id">;

  constructor() {
    super("noklingo");
    this.version(1).stores({
      app: "&id, updatedAt",
    });
  }
}

export const db = new NoklingoDatabase();

export const loadAppData = async () => (await db.app.get("app"))?.data ?? null;

export const saveAppData = async (data: PersistedAppData) => {
  await db.app.put({ id: "app", data, updatedAt: new Date().toISOString() });
};

export const clearAppData = async () => {
  await db.delete();
  await db.open();
};

export const exportAppData = async () => {
  const data = await loadAppData();
  return JSON.stringify(data, null, 2);
};

export const importAppData = async (raw: string) => {
  const parsed = JSON.parse(raw) as PersistedAppData;
  if (
    parsed.version !== 1 ||
    !parsed.profile ||
    !parsed.progress ||
    !parsed.settings
  ) {
    throw new Error("That file is not a valid Noklingo progress export.");
  }
  await saveAppData(parsed);
  return parsed;
};
