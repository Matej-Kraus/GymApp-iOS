import type { AppData, Settings } from './types'
import { migrateLegacyMuscle, type LegacyMuscleGroup } from './muscles'

/**
 * UKLÁDÁNÍ — přenositelná vrstva.
 *
 * Core neví NIC o localStorage. Definuje jen "port" `KeyValueStore`
 * (umí číst/zapsat řetězec pod klíčem) a nad ním repozitář. Web dodá
 * adaptér postavený na localStorage, mobil později třeba na MMKV.
 */

/** Aktuální verze datového formátu (pro budoucí migrace). */
export const DATA_VERSION = 2

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
    measurements: [],
  }
}

/**
 * Stepwise migrace formátu dat. Klíč = výchozí verze, funkce ji povýší o 1.
 * Přidaná (volitelná) pole řeší samo `deserialize` (doplní default), sem patří
 * jen BREAKING změny tvaru (přejmenování/rozdělení polí).
 */
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  // 1 → 2: šest svalových skupin se rozpadlo na třináct.
  //
  // Migrují se JEN vlastní cviky. Uložené tréninky drží `exerciseId` +
  // `exerciseName` + série a splity jen `exerciseIds`, takže svalovou
  // skupinu v sobě vůbec nenesou — vestavěné cviky ji mají v kódu.
  1: (d) => ({
    ...d,
    version: 2,
    customExercises: Array.isArray(d.customExercises)
      ? d.customExercises.map((raw) => {
          const e = raw as Record<string, unknown>
          return {
            ...e,
            muscleGroup: migrateLegacyMuscle(
              e.muscleGroup as LegacyMuscleGroup,
              String(e.name ?? ''),
            ),
          }
        })
      : [],
  }),
}

function runMigrations(parsed: Record<string, unknown>): Record<string, unknown> {
  let d = parsed
  let guard = 0
  while (((d.version as number) ?? DATA_VERSION) < DATA_VERSION && guard++ < 50) {
    const migrate = MIGRATIONS[(d.version as number) ?? DATA_VERSION]
    if (!migrate) break
    d = migrate(d)
  }
  return d
}

/** Bezpečně rozparsuje uložený JSON na AppData (chybějící pole doplní). */
export function deserialize(raw: string | null): AppData {
  if (!raw) return emptyData()
  try {
    const parsed = runMigrations(JSON.parse(raw) as Record<string, unknown>) as Partial<AppData>
    return {
      version: DATA_VERSION,
      customExercises: parsed.customExercises ?? [],
      splits: parsed.splits ?? [],
      sessions: parsed.sessions ?? [],
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
      bodyWeightLog: parsed.bodyWeightLog ?? [],
      goals: parsed.goals ?? [],
      measurements: parsed.measurements ?? [],
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
