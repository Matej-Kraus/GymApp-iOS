import type { Exercise, MesocycleConfig, MuscleGroup, WorkoutSession } from './types'
import { LANDMARKS } from './landmarks'
import { countsTowardProgress, weeklySetsByMuscle } from './stats'
import { recentWorkingSets } from './progression'
import { isStagnating, rirFromRpe } from './rir'

/**
 * Mezocyklus — týdny akumulace zakončené deloadem.
 *
 * Objem nemůže růst donekonečna; po několika týdnech se únava nasčítá rychleji,
 * než se stíhá regenerovat. Deload je plánovaný ústup, ne selhání.
 *
 * Záměrně ŽÁDNÁ nová entita — jen volitelné pole v `Settings`, takže data
 * nepotřebují migraci ani se nemění tvar exportu.
 */

/** 4 týdny akumulace + 1 deload. */
export function defaultMesocycle(startDate: string): MesocycleConfig {
  return { startDate, lengthWeeks: 5, deloadWeek: true }
}

const DAY_MS = 86_400_000

/** Kolikátý týden cyklu právě běží (1…lengthWeeks). Cyklus se opakuje. */
export function currentWeek(meso: MesocycleConfig, today: string = new Date().toISOString()): number {
  const start = Date.parse(meso.startDate)
  const now = Date.parse(today)
  if (!Number.isFinite(start) || !Number.isFinite(now)) return 1
  const days = Math.floor((now - start) / DAY_MS)
  if (days < 0) return 1
  const length = Math.max(1, meso.lengthWeeks)
  return (Math.floor(days / 7) % length) + 1
}

/** Je tenhle týden ten deloadový? */
export function isDeloadWeek(meso: MesocycleConfig, today?: string): boolean {
  if (!meso.deloadWeek) return false
  return currentWeek(meso, today) === Math.max(1, meso.lengthWeeks)
}

/** Násobek deloadového objemu oproti plnému. */
const DELOAD_MULTIPLIER = 0.5
/** Kde začíná první týden akumulace (podíl plného objemu). */
const RAMP_START = 0.7

/**
 * Kolik objemu tenhle týden. Akumulace lineárně roste z `RAMP_START` na 1,
 * deload spadne na půlku.
 *
 * Prvním týdnem se nezačíná naplno schválně — po deloadu je potřeba se
 * rozjet, ne hned trefit strop.
 */
export function volumeTargetMultiplier(meso: MesocycleConfig, today?: string): number {
  if (isDeloadWeek(meso, today)) return DELOAD_MULTIPLIER
  const week = currentWeek(meso, today)
  const accumulationWeeks = Math.max(1, meso.lengthWeeks - (meso.deloadWeek ? 1 : 0))
  if (accumulationWeeks === 1) return 1
  const progress = Math.min(1, (week - 1) / (accumulationWeeks - 1))
  return RAMP_START + (1 - RAMP_START) * progress
}

/** Průměrné RIR pod touhle hranicí = jedeš na doraz. */
const EXHAUSTED_RIR = 0.5
/** Kolik partií musí být nad MRV, aby to byl signál. */
const OVERREACHED_MUSCLES = 2
/** Kolik cviků ve stagnaci, aby to byl signál. */
const STAGNATING_EXERCISES = 2
/** Kolik signálů musí platit současně (z těch tří). */
const SIGNALS_NEEDED = 2

export interface DeloadSignals {
  /** Deload podle plánu mezocyklu. */
  scheduled: boolean
  /** ≥2 partie nad MRV. */
  overreached: boolean
  /** Průměrné RIR za týden ≤ 0,5. */
  exhausted: boolean
  /** ≥2 cviky bez zlepšení. */
  stagnating: boolean
  /** Co uživateli ukázat. */
  reasons: string[]
  shouldDeload: boolean
}

/**
 * Má se navrhnout deload?
 *
 * Buď je naplánovaný, nebo platí 2 ze 3 signálů. Jeden signál schválně
 * nestačí — jeden těžký týden není důvod couvat.
 */
export function deloadSignals(
  sessions: WorkoutSession[],
  customExercises: Exercise[],
  meso: MesocycleConfig | null | undefined,
  today?: string,
): DeloadSignals {
  const scheduled = meso ? isDeloadWeek(meso, today) : false

  // 1. Objem nad MRV.
  const overMrv = weeklySetsByMuscle(sessions, customExercises).filter(
    (row) => row.sets > (LANDMARKS[row.muscle as MuscleGroup]?.mrv ?? Infinity),
  )
  const overreached = overMrv.length >= OVERREACHED_MUSCLES

  // 2. Vyčerpání — průměrné RIR za poslední týden. Nezadané RPE se
  //    nepočítá, jinak by mlčení vypadalo jako selhání.
  const weekAgo = new Date(Date.parse(today ?? new Date().toISOString()) - 7 * DAY_MS).toISOString()
  const rirs: number[] = []
  for (const session of sessions) {
    if (session.date < weekAgo) continue
    for (const entry of session.entries) {
      for (const set of entry.sets) {
        if (!countsTowardProgress(set)) continue
        const rir = rirFromRpe(set.rpe)
        if (rir !== null) rirs.push(rir)
      }
    }
  }
  const exhausted = rirs.length > 0 && rirs.reduce((a, b) => a + b, 0) / rirs.length <= EXHAUSTED_RIR

  // 3. Stagnace napříč cviky.
  const exerciseIds = new Set<string>()
  for (const session of sessions) for (const e of session.entries) exerciseIds.add(e.exerciseId)
  const stalled = [...exerciseIds].filter((id) => isStagnating(recentWorkingSets(sessions, id)))
  const stagnating = stalled.length >= STAGNATING_EXERCISES

  const reasons: string[] = []
  if (scheduled) reasons.push('Deload week is scheduled in your mesocycle.')
  if (overreached) {
    reasons.push(
      `${overMrv.length} muscle groups are over MRV this week — more than you can recover from.`,
    )
  }
  if (exhausted) reasons.push('Almost every set went to failure this week. Nothing left in reserve.')
  if (stagnating) reasons.push(`${stalled.length} exercises have stopped moving for three sessions.`)

  const signals = [overreached, exhausted, stagnating].filter(Boolean).length
  return {
    scheduled,
    overreached,
    exhausted,
    stagnating,
    reasons,
    shouldDeload: scheduled || signals >= SIGNALS_NEEDED,
  }
}
