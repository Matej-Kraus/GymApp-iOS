import {
  backoffWeight,
  createId,
  lastPerformance,
  recentWorkingSets,
  suggestWorkingSet,
} from '@/core'
import type { Exercise, SetLog, WorkoutSession } from '@/core'
import type { DraftEntry, DraftSet } from '@/lib/workoutDraft'

/**
 * Výroba prázdných sérií a celých položek tréninku.
 *
 * Draft drží vstupy jako TEXT (uživatel píše do inputu), zatímco jádro počítá
 * s čísly — převod je tady, aby ho obrazovka neřešila.
 */

function blank(role: DraftSet['role']): DraftSet {
  return {
    id: createId(),
    weight: '',
    reps: '',
    rpe: '',
    role,
    completed: false,
    isPR: false,
    skipped: false,
    suggestion: null,
    lastPerf: null,
  }
}

export function blankWarmup(): DraftSet {
  return blank('warmup')
}

export function blankWorking(
  suggestion: DraftSet['suggestion'],
  lastPerf: DraftSet['lastPerf'],
): DraftSet {
  return { ...blank('working'), suggestion, lastPerf }
}

export function blankBackoff(
  workingWeight: number | null,
  lastPerf: DraftSet['lastPerf'],
  smallestPlateKg: number,
): DraftSet {
  const bw = workingWeight ? backoffWeight(workingWeight, { unit: 'kg', smallestPlateKg }) : null
  return {
    ...blank('backoff'),
    weight: bw ? String(bw) : '',
    suggestion: bw && lastPerf ? { weight: bw, reps: lastPerf.reps + 1, reason: '' } : null,
    lastPerf,
  }
}

/** Draft série → záznam pro uložení. Prázdný vstup je 0, ne NaN. */
export function setToLog(s: DraftSet): SetLog {
  return {
    weight: parseFloat(s.weight) || 0,
    reps: parseInt(s.reps) || 0,
    rpe: s.rpe ? parseFloat(s.rpe) : null,
    completed: s.completed,
    role: s.role,
    isPR: s.isPR,
  }
}

/**
 * Celá položka tréninku pro jeden cvik: dvě rozcvičky, pracovní série s
 * návrhem podle historie a back-off.
 *
 * Jedno místo pro start tréninku i pro pozdější přidání cviku — dřív to byl
 * dvakrát ten samý kód a lišil se jen tím, odkud se bere `exercise`.
 */
export function buildEntry(
  exercise: Exercise,
  sessions: WorkoutSession[],
  smallestPlateKg: number,
): DraftEntry {
  const { working, backoff } = lastPerformance(sessions, exercise.id)
  const lastW = working[0] ?? null
  // Starší tréninky (bez toho posledního) — motor z nich pozná stagnaci.
  const previous = recentWorkingSets(sessions, exercise.id).slice(1)
  const suggestion = suggestWorkingSet(
    lastW,
    exercise,
    { unit: 'kg', smallestPlateKg },
    previous,
  )
  const workingSet = blankWorking(
    suggestion,
    lastW ? { weight: lastW.weight, reps: lastW.reps } : null,
  )
  const lastB = backoff[0] ?? null
  const backoffSet = blankBackoff(
    workingSet.suggestion?.weight ?? null,
    lastB ? { weight: lastB.weight, reps: lastB.reps } : null,
    smallestPlateKg,
  )
  return {
    exerciseId: exercise.id,
    sets: [blankWarmup(), blankWarmup(), workingSet, backoffSet],
  }
}
