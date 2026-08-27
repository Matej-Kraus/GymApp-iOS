import type { SetLog, WorkoutEntry, WorkoutSession, Exercise } from './types'
import { findExercise } from './exerciseDb'

/**
 * Statistiky a výpočty nad sériemi/tréninky. Vše čisté funkce.
 */

/**
 * Odhad 1RM (maximum na jedno opakování) podle Epleyho vzorce:
 *   1RM = váha × (1 + opakování / 30)
 * Slouží k porovnání výkonu napříč různým počtem opakování (grafy, PR).
 */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/** Počítá se série do progrese / PR / objemu? (jen dokončené a ne warm-up) */
export function countsTowardProgress(set: SetLog): boolean {
  return set.completed && set.role !== 'warmup'
}

/** Objem jedné série = váha × opakování. */
export function setVolume(set: SetLog): number {
  return set.weight * set.reps
}

/** Objem cviku (součet přes započítané série). */
export function entryVolume(entry: WorkoutEntry): number {
  return entry.sets
    .filter(countsTowardProgress)
    .reduce((sum, set) => sum + setVolume(set), 0)
}

/** Objem celého tréninku (Σ váha × opakování přes započítané série). */
export function sessionVolume(session: WorkoutSession): number {
  return session.entries.reduce((sum, entry) => sum + entryVolume(entry), 0)
}

/** Počet započítaných sérií v tréninku (working + backoff, dokončené). */
export function countScoringSets(session: WorkoutSession): number {
  return session.entries.reduce(
    (n, entry) => n + entry.sets.filter(countsTowardProgress).length,
    0,
  )
}

/**
 * Počet po sobě jdoucích kalendářních týdnů (Po–Ne) s ≥1 tréninkem,
 * počítáno dozadu od aktuálního/posledního týdne.
 */
export function workoutStreakWeeks(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0

  function getMonday(dateStr: string): string {
    const d = new Date(dateStr)
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    d.setHours(0, 0, 0, 0)
    return d.toISOString().slice(0, 10)
  }

  const trainingWeeks = new Set(sessions.map((s) => getMonday(s.date)))
  const currentWeek = getMonday(new Date().toISOString())

  const start = new Date(currentWeek)
  if (!trainingWeeks.has(currentWeek)) {
    start.setDate(start.getDate() - 7)
  }

  let streak = 0
  while (trainingWeeks.has(start.toISOString().slice(0, 10))) {
    streak++
    start.setDate(start.getDate() - 7)
  }
  return streak
}

/** Celkový objem (kg) za posledních 30 dní. */
export function volumeLast30Days(sessions: WorkoutSession[]): number {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffStr = cutoff.toISOString()
  return sessions
    .filter((s) => s.date >= cutoffStr)
    .reduce((sum, s) => sum + sessionVolume(s), 0)
}

/**
 * Nejčastěji trénovaná svalová skupina z posledních `n` tréninků.
 * Vrátí null pokud nejsou žádná data.
 */
export function topMuscleGroup(
  sessions: WorkoutSession[],
  customExercises: Exercise[],
  n = 10,
): string | null {
  const recent = [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n)
  if (recent.length === 0) return null

  const counts = new Map<string, number>()
  for (const session of recent) {
    for (const entry of session.entries) {
      const ex = findExercise(entry.exerciseId, customExercises)
      if (!ex) continue
      counts.set(ex.muscleGroup, (counts.get(ex.muscleGroup) ?? 0) + 1)
    }
  }
  if (counts.size === 0) return null
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/** Počet započítaných sérií na svalovou skupinu za posledních `days` dní. */
export interface MuscleSetCount {
  muscle: string
  sets: number
}
export function weeklySetsByMuscle(
  sessions: WorkoutSession[],
  customExercises: Exercise[],
  days = 7,
): MuscleSetCount[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString()

  const counts = new Map<string, number>()
  for (const session of sessions) {
    if (session.date < cutoffStr) continue
    for (const entry of session.entries) {
      const ex = findExercise(entry.exerciseId, customExercises)
      if (!ex) continue
      const scoring = entry.sets.filter(countsTowardProgress).length
      if (scoring === 0) continue
      counts.set(ex.muscleGroup, (counts.get(ex.muscleGroup) ?? 0) + scoring)
      // Vedlejší sval dostane půl série: bench dělá i tricepsy, jen ne tolik
      // jako prsa. Bez toho by objem seděl celý na jedné partii.
      for (const secondary of ex.secondaryMuscles ?? []) {
        counts.set(secondary, (counts.get(secondary) ?? 0) + scoring * 0.5)
      }
    }
  }
  return [...counts.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets)
}
