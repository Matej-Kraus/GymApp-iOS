import type { WorkoutSession } from '@/core'
import { createId } from '@/core'
import type { HealthWorkout } from './health'

/**
 * Politika importu tréninků z Apple Watch do appky.
 * Importujeme jen SILOVÉ typy — appka je jednoúčelový posilovací deník,
 * import běhu/kola by zanesl streak/PR přehledy zápisy bez PR hodnoty.
 * Hodnoty = HKWorkoutActivityType (functionalStrengthTraining=20,
 * traditionalStrengthTraining=50, coreTraining=59).
 */
const STRENGTH_ACTIVITY_TYPES = new Set([20, 50, 59])

const ACTIVITY_LABELS: Record<number, string> = {
  20: 'Funkční silový trénink (Watch)',
  50: 'Silový trénink (Watch)',
  59: 'Core trénink (Watch)',
}

/** Převede HealthKit tréninky na WorkoutSession — jen silové typy, bez detailu cviků/sérií. */
export function toImportableSessions(workouts: HealthWorkout[]): WorkoutSession[] {
  return workouts
    .filter((w) => STRENGTH_ACTIVITY_TYPES.has(w.activityType))
    .map((w) => ({
      id: createId(),
      date: w.startDateISO,
      splitId: null,
      splitName: ACTIVITY_LABELS[w.activityType] ?? 'Trénink (Apple Watch)',
      entries: [],
      durationMinutes: w.durationMin,
      notes: w.energyKcal != null ? `${w.energyKcal} kcal (Apple Watch)` : '',
      source: 'healthkit' as const,
      externalId: w.uuid,
    }))
}

/** Vyřadí tréninky, které už mezi existujícími sessions jsou (podle externalId) — bezpečné opakované volání. */
export function dedupeAgainstExisting(imported: WorkoutSession[], existing: WorkoutSession[]): WorkoutSession[] {
  const known = new Set(existing.filter((s) => s.externalId).map((s) => s.externalId))
  return imported.filter((s) => !known.has(s.externalId))
}
