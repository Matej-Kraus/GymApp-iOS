import {
  isHealthDataAvailableAsync,
  requestAuthorization,
  getMostRecentQuantitySample,
  queryQuantitySamples,
  queryWorkoutSamples,
} from '@kingstinct/react-native-healthkit'
import type { ObjectTypeIdentifier } from '@kingstinct/react-native-healthkit'

/**
 * Apple Health (HealthKit) — čtení váhy, tělesného složení a tréninků z Apple Watch.
 * POZOR: funguje JEN v nativním buildu (ne v Expo Go). Vše je v try/catch, takže
 * v Expo Go appka nespadne — funkce jen vrátí prázdné hodnoty / false.
 */

const READ_TYPES = [
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierLeanBodyMass',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierHeartRate',
  'HKWorkoutTypeIdentifier',
] as const satisfies readonly ObjectTypeIdentifier[]

export async function isHealthAvailable(): Promise<boolean> {
  try {
    return await isHealthDataAvailableAsync()
  } catch {
    return false
  }
}

/** Požádá o přístup ke zdravotním datům (čtení). Vrací true při úspěchu. */
export async function requestHealthAccess(): Promise<boolean> {
  try {
    return await requestAuthorization({ toRead: READ_TYPES })
  } catch {
    return false
  }
}

export interface BodyMetrics {
  weightKg: number | null
  bodyFatPct: number | null
  leanMassKg: number | null
}

/** Nejnovější váha + tělesné složení z Health (sem píše FeelFit váha). */
export async function readBodyMetrics(): Promise<BodyMetrics> {
  try {
    const [w, f, l] = await Promise.all([
      getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg'),
      getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', '%'),
      getMostRecentQuantitySample('HKQuantityTypeIdentifierLeanBodyMass', 'kg'),
    ])
    const fat = f ? (f.quantity <= 1 ? f.quantity * 100 : f.quantity) : null
    return {
      weightKg: w ? Math.round(w.quantity * 10) / 10 : null,
      bodyFatPct: fat != null ? Math.round(fat * 10) / 10 : null,
      leanMassKg: l ? Math.round(l.quantity * 10) / 10 : null,
    }
  } catch {
    return { weightKg: null, bodyFatPct: null, leanMassKg: null }
  }
}

/** Historie váhy z Health (datum YYYY-MM-DD → kg). */
export async function readWeightHistory(): Promise<{ date: string; kg: number }[]> {
  try {
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
      unit: 'kg',
      limit: 365,
    })
    return samples
      .map((s) => ({ date: s.startDate.toISOString().slice(0, 10), kg: Math.round(s.quantity * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

/** Historie % tělesného tuku z Health (datum YYYY-MM-DD → %). */
export async function readBodyFatHistory(): Promise<{ date: string; pct: number }[]> {
  try {
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierBodyFatPercentage', {
      unit: '%',
      limit: 365,
    })
    return samples
      .map((s) => {
        const raw = s.quantity
        const pct = raw <= 1 ? Math.round(raw * 1000) / 10 : Math.round(raw * 10) / 10
        return { date: s.startDate.toISOString().slice(0, 10), pct }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

export interface HealthWorkout {
  /** HealthKit UUID tréninku — stabilní dedup klíč. */
  uuid: string
  /** Numerická hodnota HKWorkoutActivityType (např. 50 = traditionalStrengthTraining). */
  activityType: number
  date: string
  /** Celý ISO timestamp začátku (na rozdíl od `date`, které je jen YYYY-MM-DD). */
  startDateISO: string
  durationMin: number
  energyKcal: number | null
}

/** Posledních N tréninků z Apple Watch. */
export async function readRecentWorkouts(limit = 20): Promise<HealthWorkout[]> {
  try {
    const samples = await queryWorkoutSamples({ limit })
    return samples.map((w) => {
      const durationMin = Math.max(0, Math.round((w.endDate.getTime() - w.startDate.getTime()) / 60000))
      const energy = w.totalEnergyBurned?.quantity
      return {
        uuid: w.uuid,
        activityType: w.workoutActivityType,
        date: w.startDate.toISOString().slice(0, 10),
        startDateISO: w.startDate.toISOString(),
        durationMin,
        energyKcal: typeof energy === 'number' ? Math.round(energy) : null,
      }
    })
  } catch {
    return []
  }
}
