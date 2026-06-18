/**
 * KALKULAČKA KOTOUČŮ — co naložit na osu pro cílovou váhu.
 * Čistá funkce, žádné React/DOM závislosti (jako zbytek /core).
 */

/** Standardní sada kotoučů (kg), od největšího. */
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const

/** Výchozí hmotnost osy (kg) — olympijská osa. */
export const DEFAULT_BAR_KG = 20

export interface PlateCount {
  /** Hmotnost jednoho kotouče (kg). */
  plate: number
  /** Kolik jich jde NA JEDNU stranu. */
  count: number
}

export interface PlateResult {
  /** Hmotnost osy (kg). */
  barKg: number
  /** Kotouče na jednu stranu (od největšího). */
  perSide: PlateCount[]
  /** Skutečně naložitelná váha (kg) = osa + 2 × součet kotoučů na stranu. */
  achievableKg: number
  /** Kolik kg chybí do cíle (>0 = nejde přesně naložit dostupnými kotouči). */
  remainderKg: number
  /** true = cíl je menší než samotná osa. */
  belowBar: boolean
}

/**
 * Spočítá naložení osy pro cílovou váhu (greedy od největšího kotouče).
 * `plates` musí být seřazené sestupně; default = běžná kg sada.
 */
export function platesForBarbell(
  targetKg: number,
  barKg: number = DEFAULT_BAR_KG,
  plates: readonly number[] = DEFAULT_PLATES_KG,
): PlateResult {
  if (targetKg < barKg) {
    return { barKg, perSide: [], achievableKg: barKg, remainderKg: 0, belowBar: true }
  }

  let perSideRemaining = (targetKg - barKg) / 2
  const perSide: PlateCount[] = []
  // Drobná tolerance kvůli desetinné aritmetice (0.1 + 0.2 apod.).
  const EPS = 1e-6

  for (const plate of plates) {
    if (plate <= 0) continue
    const count = Math.floor((perSideRemaining + EPS) / plate)
    if (count > 0) {
      perSide.push({ plate, count })
      perSideRemaining -= count * plate
    }
  }

  const loadedPerSide = perSide.reduce((sum, p) => sum + p.plate * p.count, 0)
  const achievableKg = Math.round((barKg + loadedPerSide * 2) * 1000) / 1000
  const remainderKg = Math.round((targetKg - achievableKg) * 1000) / 1000

  return { barKg, perSide, achievableKg, remainderKg, belowBar: false }
}
