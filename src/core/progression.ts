import type {
  Exercise,
  SetLog,
  SetRole,
  Settings,
  WorkoutEntry,
  WorkoutSession,
} from './types'
import { roundToIncrement } from './units'

/**
 * ENGINE PROGRESIVNÍHO PŘETÍŽENÍ — srdce aplikace. Čistě deterministické,
 * ŽÁDNÁ AI, funguje offline. Pravidla podle zadání uživatele:
 *
 *  WORKING (pracovní/těžká série):
 *    - těžká váha, málo opakování, STROP 9
 *    - dokud nejsi na stropu → stejná váha, +1 opakování
 *    - jakmile dáš 9 → příště PŘIDEJ VÁHU a spadni na spodní počet opakování
 *    - preferuj cestu váhy, opakování drž nízko
 *
 *  BACKOFF (odlehčená série):
 *    - váha = dnešní working × 0,8 (−20 %), zaokrouhleno na kotouč (předvyplníme)
 *    - cíl: CO NEJVÍC opakování, žádný strop → překonávej počtem opakování
 */

export interface ProgressionConfig {
  /** Spodní cíl opakování po přidání váhy. */
  workingRepMin: number
  /** Strop opakování u working série → po dosažení přidat váhu. */
  workingRepCeiling: number
  /** Násobek váhy pro back-off (0,8 = −20 %). */
  backoffFactor: number
}

export const defaultProgressionConfig: ProgressionConfig = {
  workingRepMin: 5,
  workingRepCeiling: 9,
  backoffFactor: 0.8,
}

/** Předchozí výkon série (zjednodušený pohled na SetLog). */
export interface LastSet {
  weight: number
  reps: number
  rpe?: number | null
}

/** Návrh pro jednu sérii (placeholder + zdůvodnění/cíl). */
export interface Suggestion {
  weight: number
  reps: number
  reason: string
}

/** Velikost přírůstku váhy pro cvik (kg): velké/dolní partie větší krok. */
export function weightIncrementKg(exercise: Exercise): number {
  const isBig = exercise.category === 'Legs' || exercise.muscleGroup === 'Legs' || exercise.muscleGroup === 'Back'
  return isBig ? 5 : 2.5
}

/** Naformátuje váhu pro text cíle (42.5 → "42,5", 40 → "40"). */
function formatKg(n: number): string {
  return (Math.round(n * 100) / 100).toString().replace('.', ',')
}

/** Najde poslední trénink, kde se cvik objevil, a vrátí jeho záznam. */
export function lastEntryForExercise(
  sessions: WorkoutSession[],
  exerciseId: string,
): WorkoutEntry | null {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  for (const session of sorted) {
    const entry = session.entries.find((e) => e.exerciseId === exerciseId)
    if (entry) return entry
  }
  return null
}

function setsByRole(entry: WorkoutEntry | null, role: SetRole): SetLog[] {
  if (!entry) return []
  return entry.sets.filter((s) => s.role === role)
}

/** Minulé working a backoff série daného cviku (v pořadí, warm-upy vynechané). */
export function lastPerformance(
  sessions: WorkoutSession[],
  exerciseId: string,
): { working: SetLog[]; backoff: SetLog[] } {
  const entry = lastEntryForExercise(sessions, exerciseId)
  return {
    working: setsByRole(entry, 'working'),
    backoff: setsByRole(entry, 'backoff'),
  }
}

/**
 * Návrh pro WORKING sérii podle minulého výkonu.
 * `last` = stejná working série z minula (párováno podle pořadí). null = poprvé.
 */
export function suggestWorkingSet(
  last: LastSet | null,
  exercise: Exercise,
  settings: Settings,
  config: ProgressionConfig = defaultProgressionConfig,
): Suggestion | null {
  if (!last) return null // baseline – necháme zadat volně, uložíme jako výchozí

  // Dosáhl jsem stropu → přidat váhu a spadnout na spodní počet opakování.
  if (last.reps >= config.workingRepCeiling) {
    const inc = weightIncrementKg(exercise)
    const weight = roundToIncrement(last.weight + inc, settings.smallestPlateKg)
    return {
      weight,
      reps: config.workingRepMin,
      reason: `Minule ${last.reps}×${formatKg(last.weight)} → přidej váhu na ${formatKg(weight)} kg a jeď od ${config.workingRepMin} opakování.`,
    }
  }

  // Pod stropem → stejná váha, o jedno opakování víc (až do stropu).
  const reps = Math.min(last.reps + 1, config.workingRepCeiling)
  return {
    weight: last.weight,
    reps,
    reason: `Minule ${last.reps}×${formatKg(last.weight)} → cíl ${reps}×${formatKg(last.weight)} kg (strop ${config.workingRepCeiling}).`,
  }
}

/** Váha back-off série z dnešní working váhy (−20 %, zaokrouhleno na kotouč). */
export function backoffWeight(
  workingWeightToday: number,
  settings: Settings,
  config: ProgressionConfig = defaultProgressionConfig,
): number {
  return roundToIncrement(workingWeightToday * config.backoffFactor, settings.smallestPlateKg)
}

/**
 * Návrh pro BACKOFF sérii. Váhu spočítáme z DNEŠNÍ working váhy, cíl je
 * překonat minulý počet opakování (žádný strop).
 */
export function suggestBackoffSet(
  last: LastSet | null,
  workingWeightToday: number,
  settings: Settings,
  config: ProgressionConfig = defaultProgressionConfig,
): Suggestion {
  const weight = backoffWeight(workingWeightToday, settings, config)
  if (!last) {
    return {
      weight,
      reps: 0,
      reason: `Back-off ${formatKg(weight)} kg (−20 %). Cíl: co nejvíc opakování.`,
    }
  }
  return {
    weight,
    reps: last.reps + 1,
    reason: `Minule ${last.reps}×${formatKg(last.weight)} → dnes ${formatKg(weight)} kg, cíl víc než ${last.reps} opakování.`,
  }
}
