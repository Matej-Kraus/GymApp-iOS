import type {
  Exercise,
  SetLog,
  SetRole,
  Settings,
  WorkoutEntry,
  WorkoutSession,
} from './types'
import { roundToIncrement } from './units'
import { nextWorkingTarget, rirFromRpe, type PerformedSet, type ProgressionAction } from './rir'

/**
 * ENGINE PROGRESIVNÍHO PŘETÍŽENÍ — srdce aplikace. Čistě deterministické,
 * ŽÁDNÁ AI, funguje offline.
 *
 *  WORKING (pracovní/těžká série):
 *    - o tom, co se navrhne, rozhoduje RIR z minulé série (viz `rir.ts`).
 *      Lehké → přidat víc, těžké → přidat míň, selhání → nepřidat nic.
 *    - opakování se drží v `exercise.defaultRepRange`; při přidání váhy
 *      se spadne na dolní mez rozsahu.
 *    - platí tvrdé stropy: nejvýš 2 kroky a nejvýš +10 % na trénink.
 *
 *  BACKOFF (odlehčená série):
 *    - váha = dnešní working × 0,8 (−20 %), zaokrouhleno na kotouč (předvyplníme)
 *    - cíl: CO NEJVÍC opakování, žádný strop → překonávej počtem opakování
 */

export interface ProgressionConfig {
  /** Násobek váhy pro back-off (0,8 = −20 %). */
  backoffFactor: number
}

export const defaultProgressionConfig: ProgressionConfig = {
  backoffFactor: 0.8,
}

/** Předchozí výkon série (zjednodušený pohled na SetLog). */
export type LastSet = PerformedSet

/** Návrh pro jednu sérii (placeholder + zdůvodnění/cíl). */
export interface Suggestion {
  weight: number
  reps: number
  reason: string
  /** Co se s návrhem děje — aby to UI mohlo pojmenovat. Backoff ho nemá. */
  action?: ProgressionAction
}

/** Velikost přírůstku váhy pro cvik (kg): velké/dolní partie větší krok. */
export function weightIncrementKg(exercise: Exercise): number {
  const isBig = exercise.category === 'Legs' || exercise.muscleGroup === 'Legs' || exercise.muscleGroup === 'Back'
  return isBig ? 5 : 2.5
}

/** Naformátuje váhu pro text cíle (42.5 → "42.5", 40 → "40"). */
function formatKg(n: number): string {
  return (Math.round(n * 100) / 100).toString()
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
 * Nejtěžší working série z každého z posledních `limit` tréninků, od
 * NEJNOVĚJŠÍHO. Slouží k detekci stagnace — na tu jeden trénink nestačí.
 */
export function recentWorkingSets(
  sessions: WorkoutSession[],
  exerciseId: string,
  limit = 4,
): LastSet[] {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  const out: LastSet[] = []
  for (const session of sorted) {
    if (out.length >= limit) break
    const entry = session.entries.find((e) => e.exerciseId === exerciseId)
    const working = setsByRole(entry ?? null, 'working')
    if (working.length === 0) continue
    // Nejtěžší série tréninku reprezentuje ten trénink (top set).
    const top = working.reduce((a, b) => (b.weight > a.weight ? b : a))
    out.push({ weight: top.weight, reps: top.reps, rpe: top.rpe })
  }
  return out
}

/** Vysvětlení návrhu pro uživatele. UI appky je anglicky. */
function explain(action: ProgressionAction, target: { weight: number; reps: number }, last: LastSet, exercise: Exercise): string {
  const [lo, hi] = exercise.defaultRepRange
  const goal = `${target.reps}×${formatKg(target.weight)} kg`
  const rir = rirFromRpe(last.rpe)
  switch (action) {
    case 'jump':
      return `Last time left ${rir} reps in reserve — that was easy. Go for ${goal}.`
    case 'step':
      return `Last time ${last.reps}×${formatKg(last.weight)} kg → step up to ${goal}.`
    case 'addRep':
      return `That was heavy. Same weight, one more rep: ${goal}.`
    case 'hold':
      return `You hit failure last time. Repeat ${goal} to consolidate.`
    case 'buildReps':
      return `Below the ${lo}–${hi} rep range. Hold the weight and build back to ${goal}.`
    case 'deload':
      return `No progress for three sessions. Micro-deload to ${goal}, then climb again.`
  }
}

/**
 * Návrh pro WORKING sérii podle minulého výkonu.
 *
 * @param last     stejná working série z minula (párováno podle pořadí); null = poprvé
 * @param previous starší tréninky téhož cviku od nejnovějšího (bez `last`) — pro stagnaci
 */
export function suggestWorkingSet(
  last: LastSet | null,
  exercise: Exercise,
  settings: Settings,
  previous: LastSet[] = [],
): Suggestion | null {
  if (!last) return null // baseline – necháme zadat volně, uložíme jako výchozí

  const target = nextWorkingTarget(last, exercise, settings, previous)
  return {
    weight: target.weight,
    reps: target.reps,
    action: target.action,
    reason: explain(target.action, target, last, exercise),
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
      reason: `Back-off at ${formatKg(weight)} kg (−20%). Goal: as many reps as possible.`,
    }
  }
  return {
    weight,
    reps: last.reps + 1,
    reason: `Last time ${last.reps}×${formatKg(last.weight)} kg → today ${formatKg(weight)} kg, beat ${last.reps} reps.`,
  }
}
