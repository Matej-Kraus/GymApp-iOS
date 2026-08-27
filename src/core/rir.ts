import type { Exercise, Settings } from './types'
import { floorToIncrement } from './units'
import { isLargeMuscleGroup } from './muscles'

/**
 * RIR (reps in reserve) = kolik opakování zbývalo do selhání.
 *
 * Kanonické uložené pole zůstává `SetLog.rpe`, RIR se z něj jen dopočítá
 * (RIR = 10 − RPE). Díky tomu nepotřebuje historie žádnou migraci.
 *
 * RIR je BRZDA progrese: čím míň sil zbylo, tím opatrnější návrh.
 *
 *   RIR ≥ 3 (RPE ≤ 7)  bylo to lehké      → skok o 2 kroky váhy
 *   RIR 2   (RPE 8)    přesně na plán     → 1 krok váhy
 *   RIR 1   (RPE 9)    těžké              → stejná váha, +1 opakování
 *   RIR 0   (RPE 10)   selhání            → stejná váha i opakování
 *   nezadáno                              → jako RIR 2 (stropy platí vždy)
 */

/** Minulý výkon jedné série — jen to, co progrese potřebuje. */
export interface PerformedSet {
  weight: number
  reps: number
  rpe?: number | null
}

/** Co se má stát příště. Popisek pro uživatele skládá `progression.ts`. */
export type ProgressionAction =
  /** Skok o 2 kroky váhy — minule zbývalo hodně sil. */
  | 'jump'
  /** Standardní krok váhy. */
  | 'step'
  /** Stejná váha, o opakování navíc. */
  | 'addRep'
  /** Konsolidace — zopakovat totéž. */
  | 'hold'
  /** Návrat do rozsahu opakování, než se přidá váha. */
  | 'buildReps'
  /** Mikro-deload po stagnaci. */
  | 'deload'

export interface WorkingTarget {
  weight: number
  reps: number
  action: ProgressionAction
}

/** Násobek váhy při mikro-deloadu po stagnaci. */
const DELOAD_FACTOR = 0.9
/** Relativní strop jednoho skoku (nikdy víc než +10 %). */
const MAX_RELATIVE_JUMP = 1.1
/** Kolik tréninků po sobě musí být bez zlepšení, aby šlo o stagnaci. */
const STAGNATION_SESSIONS = 3

/** RPE → RIR. Nezadané RPE zůstává nezadané (null), NE 10. */
export function rirFromRpe(rpe: number | null | undefined): number | null {
  if (rpe == null || Number.isNaN(rpe)) return null
  return Math.min(10, Math.max(0, 10 - rpe))
}

/**
 * Nejvyšší váha, kterou smí progrese navrhnout. Platí OBĚ brzdy zároveň:
 * nejvýš 2 kroky a nejvýš +10 %. U lehkých vah bere 10 %, u těžkých 2 kroky.
 *
 * Výjimka: JEDEN krok projde vždycky. U lehkých vah je totiž 10 % míň než
 * nejmenší kotouč (15 kg → 1,5 kg) a strop by spadl zpátky na minulou váhu —
 * cvik by se na stropu rozsahu opakování zasekl napořád. Menší kotouč
 * neexistuje, takže jediná alternativa k velkému relativnímu skoku je
 * nepostoupit vůbec. Skok vyváží pád opakování na dolní mez rozsahu.
 */
export function weightCeiling(lastWeight: number, increment: number): number {
  const braked = Math.min(lastWeight + 2 * increment, lastWeight * MAX_RELATIVE_JUMP)
  return Math.max(braked, lastWeight + increment)
}

/** Váha po zaokrouhlení na kotouče, nikdy nad stropem a nikdy pod minulou. */
function cappedWeight(
  lastWeight: number,
  desired: number,
  increment: number,
  settings: Settings,
): number {
  const ceiling = weightCeiling(lastWeight, increment)
  const allowed = floorToIncrement(Math.min(desired, ceiling), settings.smallestPlateKg)
  return Math.max(lastWeight, allowed)
}

/**
 * Stagnace = 2 přechody po sobě bez zlepšení objemu (tj. 3 tréninky).
 * `recent` jsou minulé série téhož cviku od NEJNOVĚJŠÍ.
 */
export function isStagnating(recent: PerformedSet[]): boolean {
  if (recent.length < STAGNATION_SESSIONS) return false
  const volumes = recent.slice(0, STAGNATION_SESSIONS).map((s) => s.weight * s.reps)
  for (let i = 0; i < volumes.length - 1; i++) {
    if (volumes[i] > volumes[i + 1]) return false // někde došlo ke zlepšení
  }
  return true
}

/**
 * Jádro F6: co navrhnout pro příští working sérii.
 *
 * @param last     minulá working série téhož slotu
 * @param previous starší série téhož slotu od nejnovější (bez `last`) — jen pro stagnaci
 */
export function nextWorkingTarget(
  last: PerformedSet,
  exercise: Exercise,
  settings: Settings,
  previous: PerformedSet[] = [],
): WorkingTarget {
  const increment = weightIncrementForRange(exercise)
  const [repMin, repMax] = exercise.defaultRepRange
  const rir = rirFromRpe(last.rpe)

  // 1. Stagnace přebíjí všechno ostatní — z díry se nevyhrabeš přidáváním.
  if (isStagnating([last, ...previous])) {
    return {
      weight: floorToIncrement(last.weight * DELOAD_FACTOR, settings.smallestPlateKg),
      reps: repMin,
      action: 'deload',
    }
  }

  // 2. Pod rozsahem opakování → váhu nechat být, nejdřív se vrátit do rozsahu.
  if (last.reps < repMin) {
    return { weight: last.weight, reps: repMin, action: 'buildReps' }
  }

  // 3. Selhání → zopakovat totéž.
  if (rir === 0) {
    return { weight: last.weight, reps: Math.min(last.reps, repMax), action: 'hold' }
  }

  // 4. Těžké (RIR 1) → přidat opakování, dokud je kam. Na stropu rozsahu
  //    se místo toho přidá váha a spadne se na dolní mez.
  if (rir === 1 && last.reps < repMax) {
    return { weight: last.weight, reps: last.reps + 1, action: 'addRep' }
  }

  // 5. Zbytek je krok váhy. RIR ≥ 3 = lehké → dvojitý krok.
  const easy = rir != null && rir >= 3
  const desired = last.weight + (easy ? 2 : 1) * increment
  const weight = cappedWeight(last.weight, desired, increment, settings)

  // Strop mohl krok celý sežrat (lehké činky, kde 10 % < jeden kotouč).
  // Pak nemá smysl navrhovat totéž — posuneme se aspoň o opakování.
  if (weight === last.weight) {
    return last.reps < repMax
      ? { weight, reps: last.reps + 1, action: 'addRep' }
      : { weight, reps: repMax, action: 'hold' }
  }

  return { weight, reps: repMin, action: easy ? 'jump' : 'step' }
}

/**
 * Krok váhy pro cvik. Pravidlo o velkých partiích je v `muscles.ts`, aby ho
 * nemusely mít opsané rir.ts i progression.ts (ty na sebe nesmí importovat).
 */
function weightIncrementForRange(exercise: Exercise): number {
  const isBig = exercise.category === 'Legs' || isLargeMuscleGroup(exercise.muscleGroup)
  return isBig ? 5 : 2.5
}
