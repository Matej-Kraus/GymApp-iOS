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
  }
}

/** Bezpečně rozparsuje uložený JSON na AppData (chybějící pole doplní). */
export function deserialize(raw: string | null): AppData {
  if (!raw) return emptyData()
  try {
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      version: parsed.version ?? DATA_VERSION,
      customExercises: parsed.customExercises ?? [],
      splits: parsed.splits ?? [],
      sessions: parsed.sessions ?? [],
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
      bodyWeightLog: parsed.bodyWeightLog ?? [],
      goals: parsed.goals ?? [],
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
    save(data: AppData): void {
      try {
        store.setItem(key, serialize(data))
      } catch {
        // Úložiště plné nebo zakázané (privátní režim) — appka jede dál.
      }
    },
  }
}
