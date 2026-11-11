import Constants from 'expo-constants'
import { Platform } from 'react-native'
import type { ObjectTypeIdentifier, SampleTypeIdentifierWriteable } from '@kingstinct/react-native-healthkit'
import { localDateISO } from './format'

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
] satisfies readonly ObjectTypeIdentifier[]

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit')

async function getHealthKit(): Promise<HealthKitModule | null> {
  if (Platform.OS !== 'ios' || Constants.expoGoConfig != null) return null
  try {
    return await import('@kingstinct/react-native-healthkit')
  } catch {
    return null
  }
}

export async function isHealthAvailable(): Promise<boolean> {
  try {
    const healthkit = await getHealthKit()
    return healthkit ? await healthkit.isHealthDataAvailableAsync() : false
  } catch {
    return false
  }
}

/** Co appka smí do Health zapisovat — jen hotové tréninky. */
const SHARE_TYPES = ['HKWorkoutTypeIdentifier'] satisfies readonly SampleTypeIdentifierWriteable[]

/** Požádá o přístup ke zdravotním datům (čtení + zápis tréninků). Vrací true při úspěchu. */
export async function requestHealthAccess(): Promise<boolean> {
  try {
    const healthkit = await getHealthKit()
    return healthkit
      ? await healthkit.requestAuthorization({ toRead: READ_TYPES, toShare: SHARE_TYPES })
      : false
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
    const healthkit = await getHealthKit()
    if (!healthkit) return { weightKg: null, bodyFatPct: null, leanMassKg: null }
    const [w, f, l] = await Promise.all([
      healthkit.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg'),
      healthkit.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', '%'),
      healthkit.getMostRecentQuantitySample('HKQuantityTypeIdentifierLeanBodyMass', 'kg'),
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
    const healthkit = await getHealthKit()
    if (!healthkit) return []
    const samples = await healthkit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
      unit: 'kg',
      limit: 365,
      ascending: true,
    })
    return samples
      .map((s) => ({ date: localDateISO(s.startDate), kg: Math.round(s.quantity * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

export interface HealthWorkout {
  date: string
  /** HKWorkoutActivityType — název podle něj skládá UI (`tr().health.activity`). */
  activityType: number
  durationMin: number
  energyKcal: number | null
}

/** Posledních N tréninků z Apple Watch (počítáno z časů → jednotkově robustní). */
export async function readRecentWorkouts(limit = 20): Promise<HealthWorkout[]> {
  try {
    const healthkit = await getHealthKit()
    if (!healthkit) return []
    const samples = await healthkit.queryWorkoutSamples({ limit, ascending: false })
    return samples.map((w) => {
      const start = new Date(w.startDate).getTime()
      const end = new Date(w.endDate).getTime()
      const durationMin = Math.max(0, Math.round((end - start) / 60000))
      const energy = w.totalEnergyBurned?.quantity
      return {
        date: localDateISO(w.startDate),
        activityType: w.workoutActivityType,
        durationMin,
        energyKcal: typeof energy === 'number' ? Math.round(energy) : null,
      }
    })
  } catch {
    return []
  }
}

/**
 * Zapíše dokončený trénink do Apple Health jako silový trénink. Nikdy
 * nevyhazuje — vrací true jen když se zápis povedl (na webu / v Expo Go false).
 */
export async function saveWorkout(window: { start: Date; end: Date }): Promise<boolean> {
  try {
    const healthkit = await getHealthKit()
    if (!healthkit) return false
    await healthkit.saveWorkoutSample(
      healthkit.WorkoutActivityType.traditionalStrengthTraining,
      [],
      window.start,
      window.end,
    )
    return true
  } catch {
    return false
  }
}
