import { LANDMARKS, volumeStatus, weeklyVolumeReport, type VolumeStatus } from './landmarks'
import { MUSCLE_GROUPS } from './muscles'
import type { Exercise, SetLog, WorkoutSession } from './types'

describe('LANDMARKS', () => {
  it('má hodnoty pro všech 13 skupin', () => {
    for (const m of MUSCLE_GROUPS) {
      expect(LANDMARKS[m]).toBeDefined()
    }
  })

  it('hodnoty jdou vzestupně: MEV ≤ MAV low ≤ MAV high ≤ MRV', () => {
    for (const m of MUSCLE_GROUPS) {
      const l = LANDMARKS[m]
      expect(l.mev).toBeLessThanOrEqual(l.mavLow)
      expect(l.mavLow).toBeLessThanOrEqual(l.mavHigh)
      expect(l.mavHigh).toBeLessThanOrEqual(l.mrv)
    }
  })

  it('sedí na zadané hodnoty (Chest 8/12–20/22)', () => {
    expect(LANDMARKS.Chest).toEqual({ mev: 8, mavLow: 12, mavHigh: 20, mrv: 22 })
  })

  it('skupiny, které se zvedají i vedlejšně, mají MEV 0', () => {
    // Přední delty a hýždě dostanou svoje z tlaků a dřepů.
    expect(LANDMARKS.ShouldersFront.mev).toBe(0)
    expect(LANDMARKS.Glutes.mev).toBe(0)
  })
})

describe('volumeStatus', () => {
  it('pod MEV → under', () => {
    expect(volumeStatus('Chest', 4)).toBe('under')
    expect(volumeStatus('Chest', 7.5)).toBe('under')
  })

  it('od MEV po horní MAV → optimal', () => {
    expect(volumeStatus('Chest', 8)).toBe('optimal')
    expect(volumeStatus('Chest', 16)).toBe('optimal')
    expect(volumeStatus('Chest', 20)).toBe('optimal')
  })

  it('nad MAV, ale do MRV → warn', () => {
    expect(volumeStatus('Chest', 21)).toBe('warn')
    expect(volumeStatus('Chest', 22)).toBe('warn')
  })

  it('nad MRV → over', () => {
    expect(volumeStatus('Chest', 23)).toBe('over')
  })

  it('nula je under všude, kde je MEV > 0', () => {
    for (const m of MUSCLE_GROUPS) {
      const expected: VolumeStatus = LANDMARKS[m].mev > 0 ? 'under' : 'optimal'
      expect(volumeStatus(m, 0)).toBe(expected)
    }
  })
})

describe('weeklyVolumeReport', () => {
  const press: Exercise = {
    id: 'press',
    name: 'Bench Press',
    muscleGroup: 'Chest',
    secondaryMuscles: ['Triceps'],
    category: 'Push',
    equipment: 'Barbell',
    isBodyweight: false,
    imageUrl: null,
    isCustom: true,
    defaultRepRange: [5, 9],
    defaultSets: 3,
  }
  const set: SetLog = { weight: 60, reps: 8, rpe: 8, completed: true, role: 'working', isPR: false }

  function sessionWith(sets: number): WorkoutSession {
    return {
      id: 's',
      date: new Date().toISOString(),
      splitId: null,
      splitName: 'Push',
      entries: [
        { exerciseId: 'press', exerciseName: 'Bench Press', sets: Array(sets).fill(set) },
      ],
      durationMinutes: 45,
      notes: '',
    }
  }

  it('vrátí řádek pro každou skupinu, i tu neodtrénovanou', () => {
    const rows = weeklyVolumeReport([], [])
    expect(rows).toHaveLength(MUSCLE_GROUPS.length)
    expect(rows.every((r) => r.sets === 0)).toBe(true)
  })

  it('spojí série se statusem a landmarkem', () => {
    const chest = weeklyVolumeReport([sessionWith(10)], [press]).find((r) => r.muscle === 'Chest')!
    expect(chest.sets).toBe(10)
    expect(chest.status).toBe('optimal')
    expect(chest.landmark.mrv).toBe(22)
  })

  it('sekundární svaly se do reportu propíšou jako půlky', () => {
    const tri = weeklyVolumeReport([sessionWith(10)], [press]).find((r) => r.muscle === 'Triceps')!
    expect(tri.sets).toBe(5)
  })

  it('řadí podle pořadí těla, ne podle počtu sérií', () => {
    const rows = weeklyVolumeReport([sessionWith(30)], [press])
    expect(rows.map((r) => r.muscle)).toEqual(MUSCLE_GROUPS)
  })

  it('přetrénovaná partie dostane over', () => {
    const chest = weeklyVolumeReport([sessionWith(30)], [press]).find((r) => r.muscle === 'Chest')!
    expect(chest.status).toBe('over')
  })
})
