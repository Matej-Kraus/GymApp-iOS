import { DATA_VERSION, deserialize } from './storage'
import { weeklySetsByMuscle } from './stats'
import { MUSCLE_GROUPS } from './muscles'
import type { Exercise, MuscleGroup, SetLog, WorkoutSession } from './types'

/** Uložená data ve starém formátu (verze 1, šest svalových skupin). */
function v1(customExercises: unknown[]): string {
  return JSON.stringify({
    version: 1,
    customExercises,
    splits: [{ id: 's1', name: 'Push', exerciseIds: ['my-curl'] }],
    sessions: [
      {
        id: 'w1',
        date: '2026-05-01T10:00:00.000Z',
        splitId: 's1',
        splitName: 'Push',
        entries: [{ exerciseId: 'my-curl', exerciseName: 'My Curl', sets: [] }],
        durationMinutes: 60,
        notes: '',
      },
    ],
    settings: { unit: 'kg', smallestPlateKg: 2.5 },
    bodyWeightLog: [],
    goals: [],
    measurements: [],
  })
}

function legacyExercise(id: string, name: string, muscleGroup: string) {
  return {
    id,
    name,
    muscleGroup,
    category: 'Pull',
    equipment: 'Dumbbell',
    isBodyweight: false,
    imageUrl: null,
    isCustom: true,
    defaultRepRange: [8, 12],
    defaultSets: 3,
  }
}

describe('migrace na DATA_VERSION 2', () => {
  it('povýší verzi', () => {
    const data = deserialize(v1([]))
    expect(data.version).toBe(DATA_VERSION)
    expect(DATA_VERSION).toBe(2)
  })

  it('přeřadí vlastní cviky ze starých šesti skupin na nové', () => {
    const data = deserialize(
      v1([
        legacyExercise('my-curl', 'My Bicep Curl', 'Arms'),
        legacyExercise('my-pushdown', 'Rope Tricep Pushdown', 'Arms'),
        legacyExercise('my-calf', 'Seated Calf Raise', 'Legs'),
        legacyExercise('my-plank', 'Side Plank', 'Core'),
      ]),
    )
    const byId = new Map(data.customExercises.map((e) => [e.id, e]))
    expect(byId.get('my-curl')?.muscleGroup).toBe('Biceps')
    expect(byId.get('my-pushdown')?.muscleGroup).toBe('Triceps')
    expect(byId.get('my-calf')?.muscleGroup).toBe('Calves')
    expect(byId.get('my-plank')?.muscleGroup).toBe('Abs')
  })

  it('uložené tréninky ani splity migraci nepotřebují — drží jen ID', () => {
    const data = deserialize(v1([legacyExercise('my-curl', 'My Curl', 'Arms')]))
    expect(data.sessions[0].entries[0].exerciseId).toBe('my-curl')
    expect(data.splits[0].exerciseIds).toEqual(['my-curl'])
  })

  it('nesmyslná skupina v datech nesmí shodit načtení', () => {
    const data = deserialize(v1([legacyExercise('x', 'Whatever', 'Kravina')]))
    expect(MUSCLE_GROUPS).toContain(data.customExercises[0].muscleGroup)
  })

  it('data už ve verzi 2 se nemigrují znovu', () => {
    const already = JSON.stringify({
      ...JSON.parse(v1([legacyExercise('my-curl', 'My Curl', 'Biceps')])),
      version: 2,
    })
    expect(deserialize(already).customExercises[0].muscleGroup).toBe('Biceps')
  })

  it('rozbitý JSON vrátí prázdná data místo pádu', () => {
    expect(deserialize('{tohle není json').sessions).toEqual([])
    expect(deserialize(null).version).toBe(DATA_VERSION)
  })
})

describe('weeklySetsByMuscle se sekundárními svaly', () => {
  const bench: Exercise = {
    id: 'bench',
    name: 'Bench Press',
    muscleGroup: 'Chest',
    secondaryMuscles: ['Triceps', 'ShouldersFront'],
    category: 'Push',
    equipment: 'Barbell',
    isBodyweight: false,
    imageUrl: null,
    isCustom: true,
    defaultRepRange: [5, 9],
    defaultSets: 3,
  }
  const set: SetLog = { weight: 60, reps: 8, rpe: 8, completed: true, role: 'working', isPR: false }
  const session: WorkoutSession = {
    id: 's',
    date: new Date().toISOString(),
    splitId: null,
    splitName: 'Push',
    entries: [{ exerciseId: 'bench', exerciseName: 'Bench Press', sets: [set, set, set, set] }],
    durationMinutes: 45,
    notes: '',
  }

  function setsFor(rows: { muscle: string; sets: number }[], m: MuscleGroup) {
    return rows.find((r) => r.muscle === m)?.sets ?? 0
  }

  it('primární sval dostane celou sérii', () => {
    expect(setsFor(weeklySetsByMuscle([session], [bench]), 'Chest')).toBe(4)
  })

  it('sekundární sval dostane půl série', () => {
    const rows = weeklySetsByMuscle([session], [bench])
    expect(setsFor(rows, 'Triceps')).toBe(2)
    expect(setsFor(rows, 'ShouldersFront')).toBe(2)
  })

  it('cvik bez sekundárních svalů přidá jen primárnímu', () => {
    const rows = weeklySetsByMuscle([session], [{ ...bench, secondaryMuscles: undefined }])
    expect(setsFor(rows, 'Chest')).toBe(4)
    expect(setsFor(rows, 'Triceps')).toBe(0)
  })
})
