import type { Split, WorkoutSession } from './types'

/**
 * DOPORUČENÍ DALŠÍHO TRÉNINKU (rotace v rámci programu).
 *
 * Vezme splity aktivního programu v jejich pořadí (např. Push, Pull, Legs),
 * najde poslední odtrénovaný trénink, který do programu patří, a doporučí
 * NÁSLEDUJÍCÍ split cyklicky. Bez historie → první split programu.
 *
 * @param programSplits splity programu v pořadí
 * @param sessions všechny odtrénované tréninky
 * @returns id doporučeného splitu, nebo null když program nemá splity
 */
export function recommendNextSplit(programSplits: Split[], sessions: WorkoutSession[]): string | null {
  if (programSplits.length === 0) return null
  const ids = programSplits.map((s) => s.id)
  const last = sessions
    .filter((s) => s.splitId != null && ids.includes(s.splitId))
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!last || last.splitId == null) return ids[0]
  const idx = ids.indexOf(last.splitId)
  return ids[(idx + 1) % ids.length]
}
