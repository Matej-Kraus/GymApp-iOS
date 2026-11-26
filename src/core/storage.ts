import type { AppData, Settings } from './types'

/**
 * UKLÁDÁNÍ — přenositelná vrstva.
 *
 * Core neví NIC o localStorage. Definuje jen "port" `KeyValueStore`
 * (umí číst/zapsat řetězec pod klíčem) a nad ním repozitář. Web dodá
 * adaptér postavený na localStorage, mobil později třeba na MMKV.
 */

/** Aktuální verze datového formátu (pro budoucí migrace). */
export const DATA_VERSION = 1

/** Klíč, pod kterým držíme všechna data. */
export const STORAGE_KEY = 'workout-tracker:data'

/** Výchozí nastavení. */
export const defaultSettings: Settings = {
  unit: 'kg',
  smallestPlateKg: 2.5,
  restTimerSecs: 90,
  showPlateCalc: false,
}

/** Prázdný počáteční stav (úplně první spuštění). */
export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    customExercises: [],
    splits: [],
    sessions: [],
    settings: { ...defaultSettings },
    bodyWeightLog: [],
    goals: [],
    measurements: [],
  }
}

// Migrace dat mezi verzemi. Každý klíč = verze ZE KTERÉ migrujeme (→ verze+1).
// Při změně schématu přidej novou migraci a zvyšuj DATA_VERSION.
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  // Příklad budoucí migrace:
  // 1: (d) => ({ ...d, newField: 'defaultValue' }),
}

function runMigrations(raw: Record<string, unknown>): Record<string, unknown> {
  let data = raw
  let v = typeof data.version === 'number' ? data.version : 0
  while (v < DATA_VERSION) {
    const migrate = MIGRATIONS[v]
    if (migrate) data = migrate(data)
    v++
  }
  return { ...data, version: DATA_VERSION }
}

/** Bezpečně rozparsuje uložený JSON na AppData (chybějící pole doplní, spustí migrace). */
export function deserialize(raw: string | null): AppData {
  if (!raw) return emptyData()
  try {
    const parsed = runMigrations(JSON.parse(raw) as Record<string, unknown>)
    return {
      version: DATA_VERSION,
      customExercises: (parsed.customExercises as AppData['customExercises']) ?? [],
      splits: (parsed.splits as AppData['splits']) ?? [],
      sessions: (parsed.sessions as AppData['sessions']) ?? [],
      settings: { ...defaultSettings, ...((parsed.settings as AppData['settings']) ?? {}) },
      bodyWeightLog: (parsed.bodyWeightLog as AppData['bodyWeightLog']) ?? [],
      goals: (parsed.goals as AppData['goals']) ?? [],
      measurements: (parsed.measurements as AppData['measurements']) ?? [],
    }
  } catch {
    return emptyData()
  }
}

/** Serializuje AppData na řetězec k uložení. */
export function serialize(data: AppData): string {
  return JSON.stringify(data)
}

/** Minimální "port" úložiště. Web = localStorage, RN = MMKV/AsyncStorage. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

/** Repozitář dat postavený nad libovolným KeyValueStore. */
export function createRepository(store: KeyValueStore, key: string = STORAGE_KEY) {
  return {
    load(): AppData {
      try {
        return deserialize(store.getItem(key))
      } catch {
        return emptyData()
      }
    },
    save(data: AppData): boolean {
      try {
        store.setItem(key, serialize(data))
        return true
      } catch {
        // Úložiště plné nebo zakázané (privátní režim) — appka jede dál.
        return false
      }
    },
  }
}
