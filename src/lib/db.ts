import Dexie, { type EntityTable } from "dexie";
import { curriculum } from "@/src/content/curriculum";
import { PersistedAppDataSchema } from "@/src/domain/schemas";
import type { PersistedAppDataV3 } from "@/src/domain/types";
import {
  createInitialAppData,
  reconcilePersistedAppData,
} from "@/src/engine/study";

type AppRecord = {
  id: "app";
  data: unknown;
  updatedAt: string;
};

class NoklingoDatabase extends Dexie {
  app!: EntityTable<AppRecord, "id">;

  constructor() {
    super("noklingo");
    this.version(1).stores({ app: "&id, updatedAt" });
    this.version(2).stores({ app: "&id, updatedAt" });
    this.version(3).stores({ app: "&id, updatedAt" });
  }
}

export const db = new NoklingoDatabase();

export type LoadedAppData = {
  data: PersistedAppDataV3;
  resetLegacyData: boolean;
};

export function normalizeStoredAppData(value: unknown): LoadedAppData | null {
  if (!value) return null;

  const current = PersistedAppDataSchema.safeParse(value);
  if (current.success) {
    return {
      data: reconcilePersistedAppData(curriculum, current.data),
      resetLegacyData: false,
    };
  }

  const legacyVersion =
    value && typeof value === "object" && "version" in value
      ? (value as { version?: unknown }).version
      : undefined;
  if (legacyVersion === 1 || legacyVersion === 2) {
    return {
      data: {
        ...createInitialAppData(curriculum),
        redesignNoticeSeen: false,
      },
      resetLegacyData: true,
    };
  }

  if (legacyVersion === 3 && value && typeof value === "object") {
    // Preserve valid v3 learning history if only its resumable session was
    // interrupted or came from content that no longer exists.
    const withoutSession = PersistedAppDataSchema.safeParse({
      ...value,
      activeSession: null,
    });
    if (withoutSession.success) {
      return {
        data: reconcilePersistedAppData(curriculum, withoutSession.data),
        resetLegacyData: false,
      };
    }
  }

  throw new Error(
    "Saved Noklingo data is unreadable. Reset the app from Settings to start again.",
  );
}

export async function loadAppData(): Promise<LoadedAppData | null> {
  return normalizeStoredAppData((await db.app.get("app"))?.data);
}

let saveChain: Promise<void> = Promise.resolve();

export async function saveAppData(data: PersistedAppDataV3) {
  const parsed = PersistedAppDataSchema.parse(data);
  const validated = PersistedAppDataSchema.parse(
    reconcilePersistedAppData(curriculum, parsed),
  );
  saveChain = saveChain
    .catch(() => undefined)
    .then(() =>
      db.app.put({
        id: "app",
        data: validated,
        updatedAt: new Date().toISOString(),
      }),
    )
    .then(() => undefined);
  await saveChain;
}

export async function clearAppData() {
  saveChain = saveChain
    .catch(() => undefined)
    .then(async () => {
      await db.delete();
      await db.open();
    });
  await saveChain;
}

export async function exportAppData() {
  const loaded = await loadAppData();
  const data = loaded?.data ?? {
    ...createInitialAppData(curriculum),
    redesignNoticeSeen: true,
  };
  return JSON.stringify(data, null, 2);
}

export async function importAppData(raw: string) {
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new Error("That file is not valid JSON.");
  }

  const parsed = PersistedAppDataSchema.safeParse(input);
  if (!parsed.success) {
    const version =
      input && typeof input === "object" && "version" in input
        ? (input as { version?: unknown }).version
        : undefined;
    if (version === 1 || version === 2) {
      throw new Error(
        "That progress file belongs to Noklingo's previous learning system and cannot be imported into v3.",
      );
    }
    throw new Error("That file is not a valid Noklingo v3 progress export.");
  }

  const reconciled = reconcilePersistedAppData(curriculum, parsed.data);
  await saveAppData(reconciled);
  return reconciled;
}
