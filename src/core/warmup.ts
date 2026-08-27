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
interface WarmupStep {
  factor: number
  reps: number
}

/**
 * Schémata rozcvičky. Krátké na lehké dny a doplňkové cviky, důkladné na
 * těžké základní tahy, kde je rozehřátí a nacvičení pohybu důležitější.
 */
export const WARMUP_SCHEMES: Record<'short' | 'standard' | 'thorough', WarmupStep[]> = {
  short: [
    { factor: 0.5, reps: 8 },
    { factor: 0.8, reps: 3 },
  ],
  standard: [
    { factor: 0.4, reps: 10 },
    { factor: 0.6, reps: 5 },
    { factor: 0.8, reps: 3 },
  ],
  thorough: [
    { factor: 0.3, reps: 12 },
    { factor: 0.5, reps: 8 },
    { factor: 0.7, reps: 5 },
    { factor: 0.85, reps: 2 },
  ],
}

export type WarmupScheme = keyof typeof WARMUP_SCHEMES

/**
 * Návrh rozcvičky pro danou pracovní váhu.
 * Prázdné pole = není z čeho počítat (bodyweight cvik nebo nezadaná váha).
 */
export function warmupSets(
  workingWeightKg: number,
  smallestPlateKg: number,
  scheme: WarmupScheme = 'standard',
): WarmupSet[] {
  if (!(workingWeightKg > 0)) return []

  const out: WarmupSet[] = []
  const used = new Set<number>()
  for (const step of WARMUP_SCHEMES[scheme] ?? WARMUP_SCHEMES.standard) {
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
