import {
  isHealthDataAvailableAsync,
  requestAuthorization,
  getMostRecentQuantitySample,
  queryQuantitySamples,
  queryWorkoutSamples,
} from '@kingstinct/react-native-healthkit'

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
] as const

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
    return await requestAuthorization({ toRead: READ_TYPES as unknown as never })
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
    // body fat % bývá v HealthKitu zlomek (0–1) → převedeme na procenta.
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

/** Historie váhy z Health jako body grafu (datum YYYY-MM-DD → kg). */
export async function readWeightHistory(): Promise<{ date: string; kg: number }[]> {
  try {
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
      unit: 'kg',
      limit: 365,
    } as never)
    return samples
      .map((s) => ({ date: new Date(s.startDate).toISOString().slice(0, 10), kg: Math.round(s.quantity * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

export interface HealthWorkout {
  date: string
  durationMin: number
  energyKcal: number | null
}

/** Posledních N tréninků z Apple Watch (počítáno z časů → jednotkově robustní). */
export async function readRecentWorkouts(limit = 20): Promise<HealthWorkout[]> {
  try {
    const samples = await queryWorkoutSamples({ limit } as never)
    return samples.map((w) => {
      const start = new Date(w.startDate).getTime()
      const end = new Date(w.endDate).getTime()
      const durationMin = Math.max(0, Math.round((end - start) / 60000))
      const energy = w.totalEnergyBurned?.quantity
      return {
        date: new Date(w.startDate).toISOString().slice(0, 10),
        durationMin,
        energyKcal: typeof energy === 'number' ? Math.round(energy) : null,
      }
    })
  } catch {
    return []
  }
}
