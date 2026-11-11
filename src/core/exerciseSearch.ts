import type { Exercise } from './types'
import { MUSCLE_REGION, type MuscleRegion } from './muscles'

/** Malá písmena bez diakritiky — „dřep" najde i „drep". */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export interface ExerciseFilter {
  query?: string
  region?: MuscleRegion | null
  /** Druhý název, ve kterém se má hledat (překlad). */
  altName?: (exercise: Exercise) => string | undefined
}

/**
 * Filtr knihovny cviků. Všechna slova dotazu musí být v názvu (původním nebo
 * přeloženém), v libovolném pořadí. Cviky, jejichž název dotazem začíná,
 * jdou první; jinak se zachovává pořadí vstupu.
 */
export function searchExercises(exercises: Exercise[], filter: ExerciseFilter): Exercise[] {
  const words = normalizeText(filter.query ?? '').split(/\s+/).filter(Boolean)
  const first = words[0]
  const starts: Exercise[] = []
  const rest: Exercise[] = []

  for (const exercise of exercises) {
    if (filter.region && MUSCLE_REGION[exercise.muscleGroup] !== filter.region) continue
    if (words.length === 0) {
      rest.push(exercise)
      continue
    }
    const names = [exercise.name, filter.altName?.(exercise) ?? ''].map(normalizeText)
    const hit = names.find((name) => name && words.every((w) => name.includes(w)))
    if (hit === undefined) continue
    if (names.some((name) => name.startsWith(first))) starts.push(exercise)
    else rest.push(exercise)
  }
  return [...starts, ...rest]
}

/** ID cviků od naposledy použitého, bez opakování. */
export function recentExerciseIds(
  sessions: { date: string; entries: { exerciseId: string }[] }[],
  limit = 8,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const session of [...sessions].sort((a, b) => b.date.localeCompare(a.date))) {
    for (const entry of session.entries) {
      if (seen.has(entry.exerciseId)) continue
      seen.add(entry.exerciseId)
      out.push(entry.exerciseId)
      if (out.length >= limit) return out
    }
  }
  return out
}
