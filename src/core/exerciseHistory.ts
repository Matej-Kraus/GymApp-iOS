import type { SetLog, WorkoutSession } from './types'
import { countsTowardProgress, epley1RM } from './stats'

/**
 * Historie jednoho cviku pro panel v tréninku: poslední tréninky se sériemi
 * a osobní rekord. Měřítko PR je stejné jako v `records.ts` (Epley 1RM,
 * warm-upy a nedokončené série se nepočítají).
 */

export interface ExerciseHistoryItem {
  sessionId: string
  /** ISO datum tréninku. */
  date: string
  /** Započítané série (working + backoff), v pořadí zápisu. */
  sets: SetLog[]
}

export interface ExercisePR {
  weight: number
  reps: number
  e1rm: number
  date: string
}

export interface ExerciseHistory {
  /** Od nejnovějšího. Tréninky bez započítané série se přeskakují. */
  recent: ExerciseHistoryItem[]
  /** Nejlepší série napříč CELOU historií (ne jen posledními třemi). */
  pr: ExercisePR | null
}

export function exerciseHistory(
  sessions: WorkoutSession[],
  exerciseId: string,
  limit = 3,
): ExerciseHistory {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  const recent: ExerciseHistoryItem[] = []
  let pr: ExercisePR | null = null

  for (const session of sorted) {
    const sets = session.entries
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets.filter(countsTowardProgress))
    if (sets.length === 0) continue

    if (recent.length < limit) recent.push({ sessionId: session.id, date: session.date, sets })

    for (const set of sets) {
      const e1rm = epley1RM(set.weight, set.reps)
      // Při shodě vyhrává starší výkon (kdo to zvedl první) — jdeme od nejnovějšího,
      // proto >=.
      if (e1rm > 0 && (pr === null || e1rm >= pr.e1rm)) {
        pr = { weight: set.weight, reps: set.reps, e1rm, date: session.date }
      }
    }
  }
  return { recent, pr }
}

/** Procenta 1RM pro tabulku v kalkulačce. */
export const ONE_RM_PERCENTS = [100, 95, 90, 85, 80, 75, 70, 65, 60] as const

export interface PercentRow {
  percent: number
  weight: number
  /** Přibližný počet opakování při téhle váze (inverzní Epley), min. 1. */
  reps: number
}

/** Zaokrouhlí na nejbližší krok (např. 2,5 kg). */
export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value
  return Math.round(value / step) * step
}

/** Tabulka vah pro procenta z odhadnutého 1RM. */
export function percentTable(e1rm: number, stepKg = 2.5): PercentRow[] {
  if (!(e1rm > 0)) return []
  return ONE_RM_PERCENTS.map((percent) => {
    const weight = roundToStep((e1rm * percent) / 100, stepKg)
    const reps = weight >= e1rm ? 1 : Math.max(1, Math.round(30 * (e1rm / weight - 1)))
    return { percent, weight, reps }
  })
}
