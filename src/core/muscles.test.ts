import {
  MUSCLE_GROUPS,
  MUSCLE_LABEL,
  MUSCLE_REGION,
  migrateLegacyMuscle,
  type LegacyMuscleGroup,
} from './muscles'
import { BUILTIN_EXERCISES } from './exerciseDb'
import type { MuscleGroup } from './types'

describe('seznam skupin', () => {
  it('má 13 skupin a každá má popisek i oblast', () => {
    expect(MUSCLE_GROUPS).toHaveLength(13)
    for (const m of MUSCLE_GROUPS) {
      expect(MUSCLE_LABEL[m]).toBeTruthy()
      expect(MUSCLE_REGION[m]).toBeTruthy()
    }
  })

  it('popisky jsou čitelné, ne jen názvy z kódu', () => {
    expect(MUSCLE_LABEL.ShouldersSide).toBe('Side delts')
    expect(MUSCLE_LABEL.Hamstrings).toBe('Hamstrings')
  })
})

describe('migrateLegacyMuscle — staré skupiny na nové', () => {
  it('skupiny, které se nedělí, zůstávají', () => {
    expect(migrateLegacyMuscle('Chest', 'Bench Press')).toBe('Chest')
    expect(migrateLegacyMuscle('Back', 'Barbell Row')).toBe('Back')
  })

  it('Core → Abs', () => {
    expect(migrateLegacyMuscle('Core', 'Plank')).toBe('Abs')
  })

  it('Arms se dělí podle názvu cviku', () => {
    expect(migrateLegacyMuscle('Arms', 'Dumbbell Bicep Curl')).toBe('Biceps')
    expect(migrateLegacyMuscle('Arms', 'Hammer Curl')).toBe('Biceps')
    expect(migrateLegacyMuscle('Arms', 'Tricep Pushdown')).toBe('Triceps')
    expect(migrateLegacyMuscle('Arms', 'Skull Crusher')).toBe('Triceps')
  })

  it('Legs se dělí podle názvu cviku', () => {
    expect(migrateLegacyMuscle('Legs', 'Leg Curl')).toBe('Hamstrings')
    expect(migrateLegacyMuscle('Legs', 'Romanian Deadlift')).toBe('Hamstrings')
    expect(migrateLegacyMuscle('Legs', 'Calf Raise')).toBe('Calves')
    expect(migrateLegacyMuscle('Legs', 'Hip Thrust')).toBe('Glutes')
    expect(migrateLegacyMuscle('Legs', 'Back Squat')).toBe('Quads')
  })

  it('Shoulders se dělí podle názvu cviku', () => {
    expect(migrateLegacyMuscle('Shoulders', 'Lateral Raise')).toBe('ShouldersSide')
    expect(migrateLegacyMuscle('Shoulders', 'Face Pull')).toBe('ShouldersRear')
    expect(migrateLegacyMuscle('Shoulders', 'Overhead Press')).toBe('ShouldersFront')
  })

  it('neznámý název spadne na rozumný výchozí, nikdy nespadne', () => {
    expect(migrateLegacyMuscle('Arms', 'Neco Divneho')).toBe('Biceps')
    expect(migrateLegacyMuscle('Legs', '')).toBe('Quads')
    // I úplný nesmysl v datech musí projít.
    expect(MUSCLE_GROUPS).toContain(
      migrateLegacyMuscle('Kravina' as LegacyMuscleGroup, 'x'),
    )
  })

  it('výsledek je vždy platná nová skupina', () => {
    const legacy: LegacyMuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
    for (const l of legacy) {
      for (const name of ['Curl', 'Press', 'Raise', 'Squat', '']) {
        expect(MUSCLE_GROUPS).toContain(migrateLegacyMuscle(l, name))
      }
    }
  })
})

describe('databáze cviků po přeřazení', () => {
  it('každý cvik má platnou primární skupinu', () => {
    for (const ex of BUILTIN_EXERCISES) {
      expect(MUSCLE_GROUPS).toContain(ex.muscleGroup)
    }
  })

  it('sekundární svaly jsou platné a neopakují primární', () => {
    for (const ex of BUILTIN_EXERCISES) {
      for (const m of ex.secondaryMuscles ?? []) {
        expect(MUSCLE_GROUPS).toContain(m)
        expect(m).not.toBe(ex.muscleGroup)
      }
    }
  })

  it('rozlišuje bicepsy a tricepsy — kvůli tomu se to celé dělalo', () => {
    const byId = new Map(BUILTIN_EXERCISES.map((e) => [e.id, e]))
    expect(byId.get('bicep-curl-db')?.muscleGroup).toBe('Biceps')
    expect(byId.get('tricep-pushdown')?.muscleGroup).toBe('Triceps')
  })

  it('velké tahy mají sekundární svaly, jinak by objem seděl jen na jedné partii', () => {
    const byId = new Map(BUILTIN_EXERCISES.map((e) => [e.id, e]))
    expect(byId.get('bench-barbell')?.secondaryMuscles).toContain('Triceps')
    expect(byId.get('pullup')?.secondaryMuscles).toContain('Biceps')
    expect(byId.get('squat')?.secondaryMuscles).toContain('Glutes')
  })

  it('pokrývá všech 13 skupin jako primární', () => {
    const covered = new Set<MuscleGroup>(BUILTIN_EXERCISES.map((e) => e.muscleGroup))
    for (const m of MUSCLE_GROUPS) {
      expect([...covered]).toContain(m)
    }
  })
})
