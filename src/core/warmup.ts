import { roundToIncrement } from './units'

/**
 * Rozcvičovací série odvozené z pracovní váhy.
 *
 * Klasická pyramida: lehčí váha a víc opakování na začátku, pak méně
 * opakování blíž pracovní váze. Rozcvička se nepočítá do progrese ani do PR
 * (viz `SetRole`), takže tu jde jen o rozehřátí a nacvičení pohybu.
 */

export interface WarmupSet {
  weight: number
  reps: number
}

/** Podíl pracovní váhy a počet opakování pro každý krok. */
const STEPS: { factor: number; reps: number }[] = [
  { factor: 0.4, reps: 10 },
  { factor: 0.6, reps: 5 },
  { factor: 0.8, reps: 3 },
]

/**
 * Návrh rozcvičky pro danou pracovní váhu.
 * Prázdné pole = není z čeho počítat (bodyweight cvik nebo nezadaná váha).
 */
export function warmupSets(workingWeightKg: number, smallestPlateKg: number): WarmupSet[] {
  if (!(workingWeightKg > 0)) return []

  const out: WarmupSet[] = []
  const used = new Set<number>()
  for (const step of STEPS) {
    const weight = roundToIncrement(workingWeightKg * step.factor, smallestPlateKg)
    // U lehkých vah splynou po zaokrouhlení dva kroky do jedné váhy a
    // poslední může vyjít až na pracovní váhu — obojí je jako rozcvička
    // k ničemu, takže takový krok vynecháme.
    if (weight <= 0 || weight >= workingWeightKg || used.has(weight)) continue
    used.add(weight)
    out.push({ weight, reps: step.reps })
  }
  return out
}
