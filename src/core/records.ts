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
  // Výchozí "bar" pro každý cvik = nejlepší 1RM z historie.
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

/**
 * Přepočítá příznak PR ve VŠECH trénincích, chronologicky.
 *
 * Potřeba po úpravě, doplnění nebo smazání staršího tréninku: rekord se
 * mohl přesunout na jiný den. Jeden průchod s průběžným maximem na cvik —
 * `markPRs` v cyklu by historii procházel pro každý trénink znovu.
 *
 * Vrací nové pole ve STEJNÉM pořadí jako vstup; tréninky, kde se nic
 * nezměnilo, zůstávají stejnou referencí (kvůli ukládání rozdílů).
 */
export function recomputeAllPRs(sessions: WorkoutSession[]): WorkoutSession[] {
  const best = new Map<string, number>()
  const updated = new Map<string, WorkoutSession>()
  const chronological = [...sessions].sort((a, b) => a.date.localeCompare(b.date))

  for (const session of chronological) {
    let changed = false
    const entries = session.entries.map((entry) => {
      let bar = best.get(entry.exerciseId) ?? 0
      const sets = entry.sets.map((set) => {
        let isPR = false
        if (countsTowardProgress(set)) {
          const e1rm = epley1RM(set.weight, set.reps)
          if (e1rm > bar && e1rm > 0) {
            bar = e1rm
            isPR = true
          }
        }
        if (isPR === set.isPR) return set
        changed = true
        return { ...set, isPR }
      })
      best.set(entry.exerciseId, bar)
      return changed ? { ...entry, sets } : entry
    })
    if (changed) updated.set(session.id, { ...session, entries })
  }
  return updated.size === 0 ? sessions : sessions.map((s) => updated.get(s.id) ?? s)
}
