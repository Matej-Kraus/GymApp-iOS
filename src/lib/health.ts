import Constants from 'expo-constants'
import { Platform } from 'react-native'
import type { ObjectTypeIdentifier } from '@kingstinct/react-native-healthkit'
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

const WORKOUT_LABELS: Record<number, string> = {
  50: 'Strength training',
  20: 'Functional strength',
  63: 'HIIT',
  11: 'Cross training',
  59: 'Core',
  37: 'Running',
  52: 'Walking',
  13: 'Cycling',
  46: 'Swimming',
  35: 'Rowing',
  57: 'Yoga',
}

function workoutLabel(type: number): string {
  return WORKOUT_LABELS[type] ?? 'Workout'
}

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

/** Požádá o přístup ke zdravotním datům (čtení). Vrací true při úspěchu. */
export async function requestHealthAccess(): Promise<boolean> {
  try {
    const healthkit = await getHealthKit()
    return healthkit ? await healthkit.requestAuthorization({ toRead: READ_TYPES }) : false
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
  activity: string
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
        activity: workoutLabel(w.workoutActivityType),
        durationMin,
        energyKcal: typeof energy === 'number' ? Math.round(energy) : null,
      }
    })
  } catch {
    return []
  }
}
