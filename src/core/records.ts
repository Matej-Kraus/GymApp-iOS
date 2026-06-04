import type { WorkoutSession } from './types'
import { countsTowardProgress, epley1RM } from './stats'

/**
 * Detekce osobních rekordů (PR). Bereme jen working/backoff série
 * (warm-upy se ignorují). Měřítkem je odhadované 1RM (Epley) — porovná
 * výkon i při různém počtu opakování.
 */

/** Nejlepší odhadované 1RM pro daný cvik napříč zadanými tréninky. */
export function bestE1RM(sessions: WorkoutSession[], exerciseId: string): number {
  let best = 0
  for (const session of sessions) {
    for (const entry of session.entries) {
      if (entry.exerciseId !== exerciseId) continue
      for (const set of entry.sets) {
        if (!countsTowardProgress(set)) continue
        best = Math.max(best, epley1RM(set.weight, set.reps))
      }
    }
  }
  return best
}

/**
 * Vrátí KOPII tréninku, kde jsou série označené isPR=true tam, kde
 * překonaly dosavadní nejlepší 1RM daného cviku.
 *
 * @param session  právě dokončený trénink
 * @param history  všechny PŘEDCHOZÍ tréninky (bez tohoto)
 */
export function markPRs(session: WorkoutSession, history: WorkoutSession[]): WorkoutSession {
  // Výchozí "laťka" pro každý cvik = nejlepší 1RM z historie.
  const best = new Map<string, number>()

  const entries = session.entries.map((entry) => {
    let bar = best.get(entry.exerciseId)
    if (bar === undefined) {
      bar = bestE1RM(history, entry.exerciseId)
    }

    const sets = entry.sets.map((set) => {
      if (!countsTowardProgress(set)) return { ...set, isPR: false }
      const e1rm = epley1RM(set.weight, set.reps)
      if (e1rm > bar! && e1rm > 0) {
        bar = e1rm // posuneme laťku, aby PR byla jen ta nejlepší série
        return { ...set, isPR: true }
      }
      return { ...set, isPR: false }
    })

    best.set(entry.exerciseId, bar!)
    return { ...entry, sets }
  })

  return { ...session, entries }
}
