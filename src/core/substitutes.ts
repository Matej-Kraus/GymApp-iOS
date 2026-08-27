import type { Exercise } from './types'

/**
 * Náhrada cviku — když je stojan obsazený nebo něco bolí.
 *
 * Skóre je schválně hrubé a čitelné: hlavní je stejný primární sval, zbytek
 * jen ladí pořadí. Cvik s nulovým skóre se nenabídne vůbec — nabídnout
 * biceps curl místo benche je horší než nenabídnout nic.
 */

/** Stejný hlavní sval — bez toho to není náhrada. */
const SAME_PRIMARY = 3
/** Za každý společný vedlejší sval. */
const SHARED_SECONDARY = 1
/** Stejná kategorie (Push/Pull/Legs/Core). */
const SAME_CATEGORY = 1
/** Stejné vybavení — sedí do stejného místa v posilovně. */
const SAME_EQUIPMENT = 1

export function substituteScore(original: Exercise, candidate: Exercise): number {
  if (candidate.id === original.id) return 0

  let score = 0
  if (candidate.muscleGroup === original.muscleGroup) score += SAME_PRIMARY

  const originalSecondary = new Set(original.secondaryMuscles ?? [])
  for (const m of candidate.secondaryMuscles ?? []) {
    if (originalSecondary.has(m)) score += SHARED_SECONDARY
  }
  // Náhrada, která dělá to, co původní cvik jen mimochodem, je pořád náhrada.
  if (originalSecondary.has(candidate.muscleGroup)) score += SHARED_SECONDARY
  if ((candidate.secondaryMuscles ?? []).includes(original.muscleGroup)) score += SHARED_SECONDARY

  if (candidate.category === original.category) score += SAME_CATEGORY
  if (candidate.equipment === original.equipment) score += SAME_EQUIPMENT

  // Bez zásahu do stejného svalu (ať primárně nebo vedlejšně) to náhrada není,
  // i kdyby seděla kategorie i vybavení.
  const touchesSameMuscle =
    candidate.muscleGroup === original.muscleGroup ||
    originalSecondary.has(candidate.muscleGroup) ||
    (candidate.secondaryMuscles ?? []).some((m) => m === original.muscleGroup || originalSecondary.has(m))
  return touchesSameMuscle ? score : 0
}

/** Nejlepší náhrady, od nejvhodnější. Nikdy nevrací nesouvisející cviky. */
export function findSubstitutes(
  original: Exercise,
  pool: Exercise[],
  limit = 6,
): Exercise[] {
  return pool
    .map((candidate) => ({ candidate, score: substituteScore(original, candidate) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map((row) => row.candidate)
}
