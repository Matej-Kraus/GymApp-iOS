import type { Exercise, Settings, Split, WorkoutSession } from './types'
import { findExercise } from './exerciseDb'
import {
  lastPerformance,
  recentWorkingSets,
  suggestWorkingSet,
  type LastSet,
} from './progression'

/**
 * Náhled plánu na dnešek: u každého cviku splitu minulý pracovní výkon a
 * cíl, který motor progrese navrhne. Stejný výpočet jako při startu tréninku
 * (`features/workout/draftFactories.ts`), jen bez výroby draftu — obrazovka
 * Dnes tak ukazuje přesně ta čísla, která pak uživatel uvidí v tréninku.
 */
export interface PlanRow {
  exercise: Exercise
  /** Minulá první pracovní série; null = cvik se ještě necvičil. */
  last: LastSet | null
  /** Navržený cíl; null, když není z čeho vycházet. */
  target: { weight: number; reps: number } | null
}

export function planPreview(
  split: Split,
  sessions: WorkoutSession[],
  customExercises: Exercise[],
  settings: Pick<Settings, 'unit' | 'smallestPlateKg'>,
): PlanRow[] {
  const rows: PlanRow[] = []
  for (const id of split.exerciseIds) {
    const exercise = findExercise(id, customExercises)
    if (!exercise) continue
    const last = lastPerformance(sessions, id).working[0] ?? null
    const previous = recentWorkingSets(sessions, id).slice(1)
    const suggestion = suggestWorkingSet(
      last,
      exercise,
      { unit: settings.unit, smallestPlateKg: settings.smallestPlateKg },
      previous,
    )
    rows.push({
      exercise,
      last: last ? { weight: last.weight, reps: last.reps, rpe: last.rpe } : null,
      target: suggestion ? { weight: suggestion.weight, reps: suggestion.reps } : null,
    })
  }
  return rows
}

/** Rozdíl cíle proti minulu: nejdřív váha, při shodě opakování. */
export type PlanDelta =
  | { kind: 'weight'; kg: number }
  | { kind: 'reps'; reps: number }
  | { kind: 'same' }

export function planDelta(row: PlanRow): PlanDelta | null {
  if (!row.last || !row.target) return null
  const kg = Math.round((row.target.weight - row.last.weight) * 100) / 100
  if (kg !== 0) return { kind: 'weight', kg }
  const reps = row.target.reps - row.last.reps
  if (reps !== 0) return { kind: 'reps', reps }
  return { kind: 'same' }
}
