import type { Exercise, MuscleGroup, WorkoutSession } from './types'
import { MUSCLE_GROUPS } from './muscles'
import { weeklySetsByMuscle } from './stats'

/**
 * Objemové landmarky — kolik sérií týdně na partii dává smysl.
 *
 *   MEV  (minimum effective volume)   pod tím se nic nestane
 *   MAV  (maximum adaptive volume)    pásmo, kde se nejlíp roste
 *   MRV  (maximum recoverable volume) nad tím se to nestihne zregenerovat
 *
 * Hodnoty jsou výchozí orientační čísla, ne zákon — každý je jinde a
 * postupem času se posouvají. Slouží k tomu, aby appka uměla říct
 * „na tohle děláš málo" místo jednolitě zelených pruhů.
 *
 * Skupiny s MEV 0 (přední delty, hýždě) si svoje vezmou z tlaků a dřepů —
 * cílená práce navíc je volitelná, ne povinná.
 */

export interface Landmark {
  mev: number
  mavLow: number
  mavHigh: number
  mrv: number
}

export const LANDMARKS: Record<MuscleGroup, Landmark> = {
  Chest: { mev: 8, mavLow: 12, mavHigh: 20, mrv: 22 },
  Back: { mev: 10, mavLow: 14, mavHigh: 22, mrv: 25 },
  Traps: { mev: 4, mavLow: 12, mavHigh: 20, mrv: 26 },
  ShouldersFront: { mev: 0, mavLow: 6, mavHigh: 12, mrv: 16 },
  ShouldersSide: { mev: 8, mavLow: 16, mavHigh: 22, mrv: 26 },
  ShouldersRear: { mev: 6, mavLow: 12, mavHigh: 20, mrv: 26 },
  Biceps: { mev: 8, mavLow: 14, mavHigh: 20, mrv: 26 },
  Triceps: { mev: 6, mavLow: 10, mavHigh: 14, mrv: 18 },
  Quads: { mev: 8, mavLow: 12, mavHigh: 18, mrv: 20 },
  Hamstrings: { mev: 6, mavLow: 10, mavHigh: 16, mrv: 20 },
  Glutes: { mev: 0, mavLow: 4, mavHigh: 12, mrv: 16 },
  Calves: { mev: 8, mavLow: 12, mavHigh: 16, mrv: 20 },
  Abs: { mev: 0, mavLow: 16, mavHigh: 20, mrv: 25 },
}

/**
 * Kde se týdenní objem nachází.
 *  under   = pod MEV, tohle nikam nevede
 *  optimal = MEV až horní hranice MAV
 *  warn    = nad MAV, ale ještě v MRV — udržitelné jen chvíli
 *  over    = nad MRV, tohle už nezregeneruješ
 */
export type VolumeStatus = 'under' | 'optimal' | 'warn' | 'over'

export function volumeStatus(muscle: MuscleGroup, sets: number): VolumeStatus {
  const l = LANDMARKS[muscle]
  if (sets < l.mev) return 'under'
  if (sets <= l.mavHigh) return 'optimal'
  if (sets <= l.mrv) return 'warn'
  return 'over'
}

export interface VolumeRow {
  muscle: MuscleGroup
  sets: number
  status: VolumeStatus
  landmark: Landmark
}

/**
 * Týdenní objem pro KAŽDOU skupinu, v pořadí podle těla.
 *
 * Schválně i skupiny s nulou — právě ty, na které se zapomíná, jsou ta
 * informace, kvůli které to celé je. `weeklySetsByMuscle` vrací jen to,
 * co se odtrénovalo, a seřazené podle počtu.
 */
export function weeklyVolumeReport(
  sessions: WorkoutSession[],
  customExercises: Exercise[],
  days = 7,
): VolumeRow[] {
  const counted = new Map(
    weeklySetsByMuscle(sessions, customExercises, days).map((r) => [r.muscle, r.sets]),
  )
  return MUSCLE_GROUPS.map((muscle) => {
    const sets = counted.get(muscle) ?? 0
    return { muscle, sets, status: volumeStatus(muscle, sets), landmark: LANDMARKS[muscle] }
  })
}
